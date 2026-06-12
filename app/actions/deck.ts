"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { safeAction } from "@/lib/safe-action";
import { ActionResponse } from "@/types/action";
import {
  hashPassword,
  verifyPassword,
  validateNick,
  validatePasswordLength,
  PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
  NICK_MAX_LENGTH,
} from "@/lib/identity";
import { parseWordLines, planWordUpdate, type DeckWordRow } from "@/lib/deckWords";
import { isSupportedScript } from "@/lib/scripts";
import { getOrCreateAnonUserId } from "@/lib/anon-session";
import type { Tables } from "@/types/database";

// creator_pw_hash 노출 방지용 화이트리스트
const DECK_PUBLIC_COLUMNS =
  "id, name, script, creator_id, creator_nick, like_count, hidden, report_count, created_at, updated_at";

export type PublicDeck = Omit<Tables<"decks">, "creator_pw_hash">;
export type DeckWord = Tables<"words">;

export interface DeckWithWords {
  deck: PublicDeck;
  words: DeckWord[];
}

type CredentialCheck =
  | { ok: true }
  | { ok: false; message: string };

async function verifyCredentials(
  deckId: string,
  nick: string,
  password: string,
): Promise<CredentialCheck> {
  const admin = createAdminClient();
  const { data: deck, error } = await admin
    .from("decks")
    .select("creator_nick, creator_pw_hash")
    .eq("id", deckId)
    .single();

  if (error || !deck) {
    return { ok: false, message: "덱을 찾을 수 없습니다." };
  }

  // enumeration 방어: 닉/비밀번호 중 무엇이 틀렸는지 구분해 알려주지 않는다 (ADR 0001)
  const nickMatches = deck.creator_nick === nick;
  const pwMatches = await verifyPassword(password, deck.creator_pw_hash);
  if (!nickMatches || !pwMatches) {
    return { ok: false, message: "닉네임 또는 비밀번호가 올바르지 않습니다." };
  }
  return { ok: true };
}

export async function createDeck(formData: FormData): Promise<ActionResponse<{ id: string }>> {
  return safeAction(async () => {
    const name = String(formData.get("name") ?? "").trim();
    const script = String(formData.get("script") ?? "latin");
    const nick = String(formData.get("nick") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const wordsText = String(formData.get("words_text") ?? "");

    const fieldErrors: { [key: string]: string[] } = {};
    if (!name || name.length > 100) fieldErrors.name = ["덱 이름은 1~100자여야 합니다."];
    if (!isSupportedScript(script)) fieldErrors.script = ["지원하지 않는 쓰기체계입니다."];
    if (!validateNick(nick)) {
      fieldErrors.nick = [`닉네임은 1~${NICK_MAX_LENGTH}자, '#' 없이 입력해야 합니다.`];
    }
    if (!validatePasswordLength(password)) {
      fieldErrors.password = [`비밀번호는 ${PASSWORD_MIN_LENGTH}~${PASSWORD_MAX_LENGTH}자여야 합니다.`];
    }

    const wordsValidation = isSupportedScript(script)
      ? parseWordLines(wordsText, script)
      : null;
    if (wordsValidation && !wordsValidation.ok) {
      fieldErrors.words = [wordsValidation.message];
    }

    if (Object.keys(fieldErrors).length > 0) {
      return { success: false, message: "입력값을 확인해주세요.", fieldErrors };
    }

    const creatorId = await getOrCreateAnonUserId();
    if (!creatorId) {
      return { success: false, message: "세션 발급에 실패했습니다. 잠시 후 다시 시도해주세요." };
    }

    const pwHash = await hashPassword(password);
    const admin = createAdminClient();

    const { data: deck, error: deckError } = await admin
      .from("decks")
      .insert({
        name,
        script,
        creator_id: creatorId,
        creator_nick: nick,
        creator_pw_hash: pwHash,
      })
      .select("id")
      .single();

    if (deckError || !deck) {
      return { success: false, message: `덱 생성에 실패했습니다: ${deckError?.message}` };
    }

    const words = (wordsValidation as { ok: true; words: string[] }).words;
    const { error: wordsError } = await admin
      .from("words")
      .insert(words.map((text) => ({ deck_id: deck.id, text })));

    if (wordsError) {
      // 단어 없는 덱은 invariant 위반 — 덱을 남기지 않는다
      await admin.from("decks").delete().eq("id", deck.id);
      return { success: false, message: `단어 저장에 실패했습니다: ${wordsError.message}` };
    }

    revalidatePath(`/d/${deck.id}`);
    return { success: true, data: { id: deck.id }, message: "덱을 만들었습니다." };
  });
}

export async function getDeckById(deckId: string): Promise<ActionResponse<DeckWithWords>> {
  return safeAction(async () => {
    const supabase = await createClient();

    const { data: deck, error: deckError } = await supabase
      .from("decks")
      .select(DECK_PUBLIC_COLUMNS)
      .eq("id", deckId)
      .single();

    if (deckError || !deck) {
      return { success: false, message: "덱을 찾을 수 없습니다." };
    }

    const { data: words, error: wordsError } = await supabase
      .from("words")
      .select("*")
      .eq("deck_id", deckId)
      .order("created_at", { ascending: true });

    if (wordsError) {
      return { success: false, message: `단어 목록을 가져오는데 실패했습니다: ${wordsError.message}` };
    }

    return {
      success: true,
      data: { deck, words: words ?? [] },
      message: "덱을 가져왔습니다.",
    };
  });
}

export async function verifyDeckCredentials(
  deckId: string,
  nick: string,
  password: string,
): Promise<ActionResponse> {
  return safeAction(async () => {
    const check = await verifyCredentials(deckId, nick, password);
    if (!check.ok) return { success: false, message: check.message };
    return { success: true, message: "확인되었습니다." };
  });
}

export async function updateDeckWords(input: {
  deckId: string;
  nick: string;
  password: string;
  addWordsText: string;
  deactivateIds: string[];
}): Promise<ActionResponse> {
  return safeAction(async () => {
    const { deckId, nick, password, addWordsText, deactivateIds } = input;

    const check = await verifyCredentials(deckId, nick, password);
    if (!check.ok) return { success: false, message: check.message };

    const admin = createAdminClient();
    const { data: deckRow, error: deckError } = await admin
      .from("decks")
      .select("script")
      .eq("id", deckId)
      .single();
    if (deckError || !deckRow || !isSupportedScript(deckRow.script)) {
      return { success: false, message: "덱을 찾을 수 없습니다." };
    }

    const parsed = parseWordLines(addWordsText, deckRow.script, { requireMin: false });
    if (!parsed.ok) {
      return { success: false, message: parsed.message, fieldErrors: { words: [parsed.message] } };
    }

    const { data: existing, error: wordsError } = await admin
      .from("words")
      .select("id, text, active")
      .eq("deck_id", deckId);
    if (wordsError || !existing) {
      return { success: false, message: "단어 목록을 가져오는데 실패했습니다." };
    }

    const planResult = planWordUpdate(existing as DeckWordRow[], parsed.words, deactivateIds);
    if (!planResult.ok) return { success: false, message: planResult.message };

    const { toInsert, toReactivateIds, toDeactivateIds } = planResult.plan;

    if (toInsert.length > 0) {
      const { error } = await admin
        .from("words")
        .insert(toInsert.map((text) => ({ deck_id: deckId, text })));
      if (error) return { success: false, message: `단어 추가에 실패했습니다: ${error.message}` };
    }
    if (toReactivateIds.length > 0) {
      const { error } = await admin
        .from("words")
        .update({ active: true })
        .in("id", toReactivateIds);
      if (error) return { success: false, message: `단어 재활성화에 실패했습니다: ${error.message}` };
    }
    if (toDeactivateIds.length > 0) {
      const { error } = await admin
        .from("words")
        .update({ active: false })
        .in("id", toDeactivateIds);
      if (error) return { success: false, message: `단어 비활성화에 실패했습니다: ${error.message}` };
    }

    await admin
      .from("decks")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", deckId);

    revalidatePath(`/d/${deckId}`);
    return { success: true, message: "덱을 수정했습니다." };
  });
}
