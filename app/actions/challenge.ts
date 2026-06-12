"use server";

import { createAdminClient } from "@/lib/supabase-admin";
import { safeAction } from "@/lib/safe-action";
import { ActionResponse } from "@/types/action";
import { getOrCreateAnonUserId } from "@/lib/anon-session";
import { challengeSeed, deterministicShuffle, isChallengeUnlocked } from "@/lib/challenge";
import { maxAttemptsForLength } from "@/lib/game-seed";
import { checkRoundAction } from "@/lib/game-lock";
import { deriveSpecialChars } from "@/lib/game-keyboard";
import { normalizeWord } from "@/lib/word-validation";
import { evaluateGuess, type LetterState } from "@/lib/wordleGame";
import { getScriptAdapter, isSupportedScript } from "@/lib/scripts";
import type { ScriptAdapter } from "@/lib/scripts/types";
import type { Json, Tables } from "@/types/database";
import type { DailyAttemptView } from "@/app/actions/daily";

// 클라이언트로 내려가는 런 뷰 — 단어 텍스트는 미노출 (ADR 0008).
// answer는 런이 failed로 끝났을 때 마지막 라운드 단어만 공개.
export interface ChallengeRunView {
  date: string;
  currentRound: number;
  totalRounds: number;
  score: number;
  endedReason: "completed" | "failed" | null;
  attempts: DailyAttemptView[];
  maxAttempts: number;
  targetLength: number;
  specialChars: string[];
  version: number;
  answer?: string;
}

/** gateLocked: 데일리 미완료로 잠김 (ADR 0006). conflict: 낙관적 락 충돌 (ADR 0009) */
export type ChallengeActionResponse = ActionResponse<ChallengeRunView> & {
  conflict?: boolean;
  gateLocked?: boolean;
};

type ChallengeRunRow = Tables<"challenge_runs">;

interface StoredAttempt {
  units: string[];
  states: LetterState[];
  at: string;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

interface RunContext {
  adapter: ScriptAdapter;
  run: ChallengeRunRow;
  /** word_id → canonical text (스냅샷 전체, 서버 전용) */
  textById: Map<string, string>;
}

function parseAttempts(raw: unknown): StoredAttempt[] {
  return Array.isArray(raw) ? (raw as StoredAttempt[]) : [];
}

function currentTarget(ctx: RunContext): string {
  const { run, textById } = ctx;
  // 종료된 런은 마지막으로 플레이하던 라운드를 가리킨다
  const roundIndex = Math.min(run.current_round, run.shuffle_order.length - 1);
  return textById.get(run.shuffle_order[roundIndex]) ?? "";
}

function buildView(ctx: RunContext): ChallengeRunView {
  const { adapter, run, textById } = ctx;
  const target = currentTarget(ctx);
  const targetUnits = adapter.splitUnits(target);
  const endedReason = (run.ended_reason ?? null) as ChallengeRunView["endedReason"];
  const attempts = parseAttempts(run.attempts);

  return {
    date: run.date,
    currentRound: run.current_round,
    totalRounds: run.shuffle_order.length,
    score: run.score,
    endedReason,
    attempts: attempts.map(({ units, states }) => ({ units, states })),
    maxAttempts: maxAttemptsForLength(targetUnits.length),
    targetLength: targetUnits.length,
    specialChars: deriveSpecialChars([...textById.values()]),
    version: run.version,
    ...(endedReason === "failed" ? { answer: target } : {}),
  };
}

// 게이트(ADR 0006) 통과 여부 확인 후 본인 런을 로드/생성한다.
async function loadRunContext(
  deckId: string,
  date: string,
  anonId: string,
  { createIfMissing }: { createIfMissing: boolean },
): Promise<
  | { ok: true; ctx: RunContext }
  | { ok: false; message: string; gateLocked?: boolean }
> {
  const admin = createAdminClient();

  const { data: deck } = await admin
    .from("decks")
    .select("id, script")
    .eq("id", deckId)
    .single();
  if (!deck || !isSupportedScript(deck.script)) {
    return { ok: false, message: "덱을 찾을 수 없습니다." };
  }
  const adapter = getScriptAdapter(deck.script);

  // 1. 데일리 완료 게이트 (솔브 OR 시도 소진 — ADR 0006)
  const { data: dailyRound } = await admin
    .from("daily_rounds")
    .select("status")
    .eq("anon_id", anonId)
    .eq("deck_id", deckId)
    .eq("date", date)
    .maybeSingle();
  if (!isChallengeUnlocked(dailyRound?.status ?? null)) {
    return {
      ok: false,
      gateLocked: true,
      message: "오늘의 데일리를 먼저 완료하면 챌린지가 열립니다.",
    };
  }

  // 2. 런 확보 — shuffle_order는 시작 시 1회 계산해 영구 저장 (ADR 0015)
  let { data: run } = await admin
    .from("challenge_runs")
    .select("*")
    .eq("anon_id", anonId)
    .eq("deck_id", deckId)
    .eq("date", date)
    .maybeSingle();

  if (!run) {
    if (!createIfMissing) return { ok: false, message: "챌린지를 먼저 시작해주세요." };

    // 게이트 통과 = 데일리 라운드 존재 = lock 존재
    const { data: lock } = await admin
      .from("daily_words")
      .select("active_word_ids")
      .eq("deck_id", deckId)
      .eq("date", date)
      .single();
    if (!lock) return { ok: false, message: "데일리 단어 잠금을 찾을 수 없습니다." };

    const shuffle = deterministicShuffle(lock.active_word_ids, challengeSeed(deckId, date));

    // PK 충돌(같은 날 재시작)은 무시하고 기존 런을 재읽기 — 암시적 이어하기 (ADR 0006)
    await admin
      .from("challenge_runs")
      .upsert(
        { anon_id: anonId, deck_id: deckId, date, shuffle_order: shuffle },
        { onConflict: "anon_id,deck_id,date", ignoreDuplicates: true },
      );

    const { data: recreated } = await admin
      .from("challenge_runs")
      .select("*")
      .eq("anon_id", anonId)
      .eq("deck_id", deckId)
      .eq("date", date)
      .single();
    if (!recreated) return { ok: false, message: "챌린지 시작에 실패했습니다." };
    run = recreated;
  }

  // 3. 스냅샷 단어 텍스트 (서버 전용)
  const { data: words } = await admin
    .from("words")
    .select("id, text")
    .in("id", run.shuffle_order);
  if (!words || words.length === 0) {
    return { ok: false, message: "단어 스냅샷을 가져오는데 실패했습니다." };
  }

  return {
    ok: true,
    ctx: { adapter, run, textById: new Map(words.map((w) => [w.id, w.text])) },
  };
}

function runStatus(run: ChallengeRunRow): { status: string; version: number } {
  return { status: run.ended_reason ? run.ended_reason : "in_progress", version: run.version };
}

async function updateRunGuarded(
  ctx: RunContext,
  anonId: string,
  deckId: string,
  patch: Partial<Tables<"challenge_runs">>,
): Promise<ChallengeRunRow | null> {
  const admin = createAdminClient();
  const { data: updated } = await admin
    .from("challenge_runs")
    .update({ ...patch, version: ctx.run.version + 1, updated_at: new Date().toISOString() })
    .eq("anon_id", anonId)
    .eq("deck_id", deckId)
    .eq("date", ctx.run.date)
    .eq("version", ctx.run.version) // DB 레벨 이중 가드 (ADR 0009)
    .select("*");
  return updated && updated.length > 0 ? updated[0] : null;
}

export async function startChallengeRun(
  deckId: string,
  clientDate: string,
): Promise<ChallengeActionResponse> {
  return safeAction(async () => {
    if (!DATE_PATTERN.test(clientDate)) {
      return { success: false, message: "날짜 형식이 올바르지 않습니다." };
    }
    const anonId = await getOrCreateAnonUserId();
    if (!anonId) return { success: false, message: "세션 발급에 실패했습니다." };

    const loaded = await loadRunContext(deckId, clientDate, anonId, { createIfMissing: true });
    if (!loaded.ok) {
      return { success: false, message: loaded.message, gateLocked: loaded.gateLocked };
    }
    return { success: true, data: buildView(loaded.ctx), message: "챌린지를 시작했습니다." };
  });
}

export async function submitChallengeGuess(input: {
  deckId: string;
  date: string;
  guess: string;
  expectedVersion: number;
}): Promise<ChallengeActionResponse> {
  return safeAction(async () => {
    const { deckId, date, guess, expectedVersion } = input;
    const anonId = await getOrCreateAnonUserId();
    if (!anonId) return { success: false, message: "세션이 없습니다." };

    const loaded = await loadRunContext(deckId, date, anonId, { createIfMissing: false });
    if (!loaded.ok) {
      return { success: false, message: loaded.message, gateLocked: loaded.gateLocked };
    }
    const ctx = loaded.ctx;
    const { adapter, run, textById } = ctx;

    const lockCheck = checkRoundAction(runStatus(run), expectedVersion);
    if (!lockCheck.ok) {
      return { success: false, conflict: true, message: lockCheck.message, data: buildView(ctx) };
    }

    const target = currentTarget(ctx);
    const targetUnits = adapter.splitUnits(target);
    const guessUnits = adapter.splitUnits(normalizeWord(guess.trim()));

    if (guessUnits.length !== targetUnits.length) {
      return {
        success: false,
        message: `글자 수가 맞지 않습니다 (${guessUnits.length}/${targetUnits.length}).`,
      };
    }

    const guessJoined = guessUnits.join(" ");
    const inSnapshot = [...textById.values()].some(
      (text) => adapter.splitUnits(text).join(" ") === guessJoined,
    );
    if (!inSnapshot) {
      return { success: false, message: "이 덱에 없는 단어입니다." };
    }

    const evaluated = evaluateGuess(guessUnits, targetUnits);
    const states = evaluated.letters.map((l) => l.state);
    const won = states.every((s) => s === "correct");
    const attempts = parseAttempts(run.attempts);
    const maxAttempts = maxAttemptsForLength(targetUnits.length);
    const totalRounds = run.shuffle_order.length;

    let patch: Partial<Tables<"challenge_runs">>;
    let message: string;
    if (won) {
      const nextRound = run.current_round + 1;
      const perfectClear = nextRound >= totalRounds;
      patch = {
        score: run.score + 1,
        current_round: nextRound,
        attempts: [] as unknown as Json, // 다음 라운드는 빈 기록으로 시작
        ...(perfectClear ? { ended_reason: "completed" } : {}),
      };
      message = perfectClear ? "PERFECT CLEAR!" : `라운드 클리어! (${nextRound}/${totalRounds})`;
    } else {
      const newAttempts = [
        ...attempts,
        { units: guessUnits, states, at: new Date().toISOString() },
      ];
      const exhausted = newAttempts.length >= maxAttempts;
      patch = {
        attempts: newAttempts as unknown as Json,
        // 한 라운드 소진 → 런 종료, score = 풀어낸 라운드 수 (ADR 0006)
        ...(exhausted ? { ended_reason: "failed" } : {}),
      };
      message = exhausted ? "시도를 모두 소진했습니다." : "추측을 제출했습니다.";
    }

    const updated = await updateRunGuarded(ctx, anonId, deckId, patch);
    if (!updated) {
      const fresh = await loadRunContext(deckId, date, anonId, { createIfMissing: false });
      return {
        success: false,
        conflict: true,
        message: "다른 탭에서 진행됐습니다. 최신 상태로 갱신합니다.",
        ...(fresh.ok ? { data: buildView(fresh.ctx) } : {}),
      };
    }

    return { success: true, data: buildView({ ...ctx, run: updated }), message };
  });
}

// 포기 — 런을 failed로 종료한다 (score는 현재까지 풀어낸 라운드 수 유지)
export async function failChallengeRun(input: {
  deckId: string;
  date: string;
  expectedVersion: number;
}): Promise<ChallengeActionResponse> {
  return safeAction(async () => {
    const { deckId, date, expectedVersion } = input;
    const anonId = await getOrCreateAnonUserId();
    if (!anonId) return { success: false, message: "세션이 없습니다." };

    const loaded = await loadRunContext(deckId, date, anonId, { createIfMissing: false });
    if (!loaded.ok) {
      return { success: false, message: loaded.message, gateLocked: loaded.gateLocked };
    }
    const ctx = loaded.ctx;

    const lockCheck = checkRoundAction(runStatus(ctx.run), expectedVersion);
    if (!lockCheck.ok) {
      return { success: false, conflict: true, message: lockCheck.message, data: buildView(ctx) };
    }

    const updated = await updateRunGuarded(ctx, anonId, deckId, { ended_reason: "failed" });
    if (!updated) {
      return { success: false, conflict: true, message: "다른 탭에서 진행됐습니다." };
    }
    return { success: true, data: buildView({ ...ctx, run: updated }), message: "챌린지를 포기했습니다." };
  });
}

// 명시적 완료 처리 — 모든 라운드를 클리어했는데 종료 마킹이 누락된 경우의 멱등 마무리.
// (정상 경로에서는 submitChallengeGuess가 마지막 라운드에서 자동으로 completed 처리한다)
export async function completeChallengeRun(input: {
  deckId: string;
  date: string;
  expectedVersion: number;
}): Promise<ChallengeActionResponse> {
  return safeAction(async () => {
    const { deckId, date, expectedVersion } = input;
    const anonId = await getOrCreateAnonUserId();
    if (!anonId) return { success: false, message: "세션이 없습니다." };

    const loaded = await loadRunContext(deckId, date, anonId, { createIfMissing: false });
    if (!loaded.ok) {
      return { success: false, message: loaded.message, gateLocked: loaded.gateLocked };
    }
    const ctx = loaded.ctx;

    if (ctx.run.ended_reason === "completed") {
      return { success: true, data: buildView(ctx), message: "이미 완료된 챌린지입니다." };
    }
    const lockCheck = checkRoundAction(runStatus(ctx.run), expectedVersion);
    if (!lockCheck.ok) {
      return { success: false, conflict: true, message: lockCheck.message, data: buildView(ctx) };
    }
    if (ctx.run.current_round < ctx.run.shuffle_order.length) {
      return { success: false, message: "아직 남은 라운드가 있습니다." };
    }

    const updated = await updateRunGuarded(ctx, anonId, deckId, { ended_reason: "completed" });
    if (!updated) {
      return { success: false, conflict: true, message: "다른 탭에서 진행됐습니다." };
    }
    return { success: true, data: buildView({ ...ctx, run: updated }), message: "PERFECT CLEAR!" };
  });
}
