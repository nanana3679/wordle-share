"use server";

import { createAdminClient } from "@/lib/supabase-admin";
import { safeAction } from "@/lib/safe-action";
import { ActionResponse } from "@/types/action";
import { getOrCreateAnonUserId } from "@/lib/anon-session";
import { dailySeed, pickDailyWordId, maxAttemptsForLength } from "@/lib/game-seed";
import { checkRoundAction } from "@/lib/game-lock";
import { deriveSpecialChars } from "@/lib/game-keyboard";
import { normalizeWord } from "@/lib/word-validation";
import { evaluateGuess, type LetterState } from "@/lib/wordleGame";
import { getScriptAdapter, isSupportedScript } from "@/lib/scripts";
import type { ScriptAdapter } from "@/lib/scripts/types";
import type { Json, Tables } from "@/types/database";

// 클라이언트로 내려가는 라운드 뷰. 단어 텍스트(스냅샷/정답)는
// 라운드가 끝나기 전까지 절대 포함하지 않는다 (ADR 0008).
export interface DailyAttemptView {
  units: string[];
  states: LetterState[];
}

export interface DailyRoundView {
  date: string;
  status: "in_progress" | "completed" | "failed";
  attempts: DailyAttemptView[];
  maxAttempts: number;
  targetLength: number;
  specialChars: string[];
  version: number;
  /** 라운드 종료 후에만 공개되는 정답 */
  answer?: string;
}

/** version 불일치/종료 라운드 액션 시 conflict: true + 최신 뷰를 담아 반환한다 (ADR 0009의 409 대응) */
export type DailyActionResponse = ActionResponse<DailyRoundView> & { conflict?: boolean };

type DailyWordRow = Tables<"daily_words">;
type DailyRoundRow = Tables<"daily_rounds">;

interface StoredAttempt {
  units: string[];
  states: LetterState[];
  at: string;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

interface RoundContext {
  adapter: ScriptAdapter;
  lock: DailyWordRow;
  round: DailyRoundRow;
  targetText: string;
  snapshotTexts: string[];
}

function parseAttempts(raw: unknown): StoredAttempt[] {
  return Array.isArray(raw) ? (raw as StoredAttempt[]) : [];
}

function buildView(ctx: RoundContext): DailyRoundView {
  const { adapter, round, targetText, snapshotTexts } = ctx;
  const attempts = parseAttempts(round.attempts);
  const targetUnits = adapter.splitUnits(targetText);
  const status = round.status as DailyRoundView["status"];

  return {
    date: round.date,
    status,
    attempts: attempts.map(({ units, states }) => ({ units, states })),
    maxAttempts: maxAttemptsForLength(targetUnits.length),
    targetLength: targetUnits.length,
    specialChars: deriveSpecialChars(snapshotTexts),
    version: round.version,
    ...(status !== "in_progress" ? { answer: targetText } : {}),
  };
}

// (deck, date)의 lock과 본인 라운드를 로드하거나 생성한다.
async function loadRoundContext(
  deckId: string,
  date: string,
  anonId: string,
  { createIfMissing }: { createIfMissing: boolean },
): Promise<{ ok: true; ctx: RoundContext } | { ok: false; message: string }> {
  const admin = createAdminClient();

  const { data: deck } = await admin
    .from("decks")
    .select("id, script, hidden")
    .eq("id", deckId)
    .single();
  if (!deck || !isSupportedScript(deck.script)) {
    return { ok: false, message: "덱을 찾을 수 없습니다." };
  }
  // 신고로 가려진 덱은 플레이 차단 — 작성자 예외 없음 (#55 기본값)
  if (deck.hidden) {
    return { ok: false, message: "비공개 덱은 플레이할 수 없습니다." };
  }
  const adapter = getScriptAdapter(deck.script);

  // 1. lock 확보 — 첫 풀이자가 생성, race는 ON CONFLICT DO NOTHING (ADR 0015)
  let { data: lock } = await admin
    .from("daily_words")
    .select("*")
    .eq("deck_id", deckId)
    .eq("date", date)
    .maybeSingle();

  if (!lock) {
    if (!createIfMissing) return { ok: false, message: "라운드를 먼저 시작해주세요." };

    const { data: activeWords, error: wordsError } = await admin
      .from("words")
      .select("id")
      .eq("deck_id", deckId)
      .eq("active", true)
      .order("id", { ascending: true }); // 결정적 정렬 필수 (ADR 0015)
    if (wordsError || !activeWords || activeWords.length === 0) {
      return { ok: false, message: "덱에 활성 단어가 없습니다." };
    }

    const sortedIds = activeWords.map((w) => w.id);
    const wordId = pickDailyWordId(sortedIds, dailySeed(deckId, date));

    await admin
      .from("daily_words")
      .upsert(
        { deck_id: deckId, date, word_id: wordId, active_word_ids: sortedIds },
        { onConflict: "deck_id,date", ignoreDuplicates: true },
      );

    const { data: relocked } = await admin
      .from("daily_words")
      .select("*")
      .eq("deck_id", deckId)
      .eq("date", date)
      .single();
    if (!relocked) return { ok: false, message: "데일리 단어 잠금에 실패했습니다." };
    lock = relocked;
  }

  // 2. 본인 라운드 확보
  let { data: round } = await admin
    .from("daily_rounds")
    .select("*")
    .eq("anon_id", anonId)
    .eq("deck_id", deckId)
    .eq("date", date)
    .maybeSingle();

  if (!round) {
    if (!createIfMissing) return { ok: false, message: "라운드를 먼저 시작해주세요." };
    await admin
      .from("daily_rounds")
      .upsert(
        { anon_id: anonId, deck_id: deckId, date },
        { onConflict: "anon_id,deck_id,date", ignoreDuplicates: true },
      );
    const { data: recreated } = await admin
      .from("daily_rounds")
      .select("*")
      .eq("anon_id", anonId)
      .eq("deck_id", deckId)
      .eq("date", date)
      .single();
    if (!recreated) return { ok: false, message: "라운드 생성에 실패했습니다." };
    round = recreated;
  }

  // 3. 스냅샷 단어 텍스트 (서버 전용 — 클라이언트로 내려가지 않는다)
  const { data: snapshotWords, error: snapshotError } = await admin
    .from("words")
    .select("id, text")
    .in("id", lock.active_word_ids);
  if (snapshotError || !snapshotWords) {
    return { ok: false, message: "단어 스냅샷을 가져오는데 실패했습니다." };
  }

  const targetText = snapshotWords.find((w) => w.id === lock.word_id)?.text;
  if (!targetText) return { ok: false, message: "데일리 단어를 찾을 수 없습니다." };

  return {
    ok: true,
    ctx: {
      adapter,
      lock,
      round,
      targetText,
      snapshotTexts: snapshotWords.map((w) => w.text),
    },
  };
}

export async function startDailyRound(
  deckId: string,
  clientDate: string,
): Promise<DailyActionResponse> {
  return safeAction(async () => {
    if (!DATE_PATTERN.test(clientDate)) {
      return { success: false, message: "날짜 형식이 올바르지 않습니다." };
    }
    const anonId = await getOrCreateAnonUserId();
    if (!anonId) {
      return { success: false, message: "세션 발급에 실패했습니다. 잠시 후 다시 시도해주세요." };
    }

    const loaded = await loadRoundContext(deckId, clientDate, anonId, { createIfMissing: true });
    if (!loaded.ok) return { success: false, message: loaded.message };

    return { success: true, data: buildView(loaded.ctx), message: "라운드를 시작했습니다." };
  });
}

export async function submitDailyGuess(input: {
  deckId: string;
  date: string;
  guess: string;
  expectedVersion: number;
}): Promise<DailyActionResponse> {
  return safeAction(async () => {
    const { deckId, date, guess, expectedVersion } = input;
    const anonId = await getOrCreateAnonUserId();
    if (!anonId) return { success: false, message: "세션이 없습니다." };

    const loaded = await loadRoundContext(deckId, date, anonId, { createIfMissing: false });
    if (!loaded.ok) return { success: false, message: loaded.message };
    const ctx = loaded.ctx;
    const { adapter, round, targetText, snapshotTexts } = ctx;

    const lockCheck = checkRoundAction(round, expectedVersion);
    if (!lockCheck.ok) {
      return {
        success: false,
        conflict: true,
        message: lockCheck.message,
        data: buildView(ctx),
      };
    }

    const targetUnits = adapter.splitUnits(targetText);
    const guessUnits = adapter.splitUnits(normalizeWord(guess.trim()));

    if (guessUnits.length !== targetUnits.length) {
      return {
        success: false,
        message: `글자 수가 맞지 않습니다 (${guessUnits.length}/${targetUnits.length}).`,
      };
    }

    // 스냅샷 활성 단어 집합에 있어야 추측으로 인정 (ADR 0008 — 자동완성/리스트 노출 없음)
    const guessJoined = guessUnits.join(" ");
    const inSnapshot = snapshotTexts.some(
      (text) => adapter.splitUnits(text).join(" ") === guessJoined,
    );
    if (!inSnapshot) {
      return { success: false, message: "이 덱에 없는 단어입니다." };
    }

    const evaluated = evaluateGuess(guessUnits, targetUnits);
    const states = evaluated.letters.map((l) => l.state);
    const attempts = parseAttempts(round.attempts);
    const newAttempts: StoredAttempt[] = [
      ...attempts,
      { units: guessUnits, states, at: new Date().toISOString() },
    ];

    const won = states.every((s) => s === "correct");
    const maxAttempts = maxAttemptsForLength(targetUnits.length);
    const newStatus = won
      ? "completed"
      : newAttempts.length >= maxAttempts
        ? "failed"
        : "in_progress";

    // DB 레벨 이중 가드: version 조건이 빗나가면(직전 검증 후 race) 갱신 0건
    const admin = createAdminClient();
    const { data: updated } = await admin
      .from("daily_rounds")
      .update({
        // StoredAttempt는 인덱스 시그니처가 없어 Json에 직접 대입 불가 — 구조는 Json 호환
        attempts: newAttempts as unknown as Json,
        status: newStatus,
        version: round.version + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("anon_id", anonId)
      .eq("deck_id", deckId)
      .eq("date", date)
      .eq("version", round.version)
      .select("*");

    if (!updated || updated.length === 0) {
      const fresh = await loadRoundContext(deckId, date, anonId, { createIfMissing: false });
      return {
        success: false,
        conflict: true,
        message: "다른 탭에서 진행됐습니다. 최신 상태로 갱신합니다.",
        ...(fresh.ok ? { data: buildView(fresh.ctx) } : {}),
      };
    }

    return {
      success: true,
      data: buildView({ ...ctx, round: updated[0] }),
      message: won ? "정답입니다!" : "추측을 제출했습니다.",
    };
  });
}

// 포기 — 라운드를 failed로 종료한다
export async function endDailyRound(input: {
  deckId: string;
  date: string;
  expectedVersion: number;
}): Promise<DailyActionResponse> {
  return safeAction(async () => {
    const { deckId, date, expectedVersion } = input;
    const anonId = await getOrCreateAnonUserId();
    if (!anonId) return { success: false, message: "세션이 없습니다." };

    const loaded = await loadRoundContext(deckId, date, anonId, { createIfMissing: false });
    if (!loaded.ok) return { success: false, message: loaded.message };
    const ctx = loaded.ctx;

    const lockCheck = checkRoundAction(ctx.round, expectedVersion);
    if (!lockCheck.ok) {
      return { success: false, conflict: true, message: lockCheck.message, data: buildView(ctx) };
    }

    const admin = createAdminClient();
    const { data: updated } = await admin
      .from("daily_rounds")
      .update({
        status: "failed",
        version: ctx.round.version + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("anon_id", anonId)
      .eq("deck_id", deckId)
      .eq("date", date)
      .eq("version", ctx.round.version)
      .select("*");

    if (!updated || updated.length === 0) {
      const fresh = await loadRoundContext(deckId, date, anonId, { createIfMissing: false });
      return {
        success: false,
        conflict: true,
        message: "다른 탭에서 진행됐습니다. 최신 상태로 갱신합니다.",
        ...(fresh.ok ? { data: buildView(fresh.ctx) } : {}),
      };
    }

    return {
      success: true,
      data: buildView({ ...ctx, round: updated[0] }),
      message: "라운드를 포기했습니다.",
    };
  });
}
