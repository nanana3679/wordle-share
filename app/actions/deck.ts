"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { safeAction } from "@/lib/safe-action";
import { ActionResponse } from "@/types/action";
import {
  hashPassword,
  verifyPassword,
  validateNick,
  validatePasswordLength,
  isBotNick,
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
  "id, name, script, creator_id, creator_nick, image_url, like_count, hidden, report_count, created_at, updated_at";

const DECK_IMAGE_BUCKET = "deck-images";
const MAX_DECK_IMAGE_BYTES = 2 * 1024 * 1024;
const DECK_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export type PublicDeck = Omit<Tables<"decks">, "creator_pw_hash">;
export type DeckWord = Tables<"words">;

export interface DeckWithWords {
  deck: PublicDeck;
  words: DeckWord[];
}

type CredentialCheck =
  | { ok: true }
  | { ok: false; message: string };

type DeckImageUpload =
  | { ok: true; imageUrl: string }
  | { ok: false; message: string };

// verifyCredentials는 request context 밖에서 호출될 수도 있어
// 번역된 메시지를 호출자로부터 주입받는다.
async function verifyCredentials(
  deckId: string,
  nick: string,
  password: string,
  messages: { deckNotFound: string; invalidCredentials: string },
): Promise<CredentialCheck> {
  const admin = createAdminClient();
  const { data: deck, error } = await admin
    .from("decks")
    .select("creator_nick, creator_pw_hash")
    .eq("id", deckId)
    .single();

  if (error || !deck) {
    return { ok: false, message: messages.deckNotFound };
  }

  // enumeration 방어: 닉/비밀번호 중 무엇이 틀렸는지 구분해 알려주지 않는다 (ADR 0001)
  const nickMatches = deck.creator_nick === nick;
  const pwMatches = await verifyPassword(password, deck.creator_pw_hash);
  if (!nickMatches || !pwMatches) {
    return { ok: false, message: messages.invalidCredentials };
  }
  return { ok: true };
}

function readOptionalImage(formData: FormData): File | null {
  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) return null;
  return file;
}

async function uploadDeckImage(deckId: string, file: File): Promise<DeckImageUpload> {
  if (file.size > MAX_DECK_IMAGE_BYTES) {
    return { ok: false, message: "이미지는 2MB 이하만 업로드할 수 있습니다." };
  }

  const ext = DECK_IMAGE_TYPES[file.type];
  if (!ext) {
    return { ok: false, message: "이미지는 JPG, PNG, WebP 형식만 업로드할 수 있습니다." };
  }

  const admin = createAdminClient();
  const objectPrefix = `${deckId}/`;
  const objectPath = `${objectPrefix}cover-${Date.now()}.${ext}`;

  const { data: existing } = await admin.storage
    .from(DECK_IMAGE_BUCKET)
    .list(deckId, { limit: 20 });
  const oldPaths = (existing ?? []).map((object) => `${objectPrefix}${object.name}`);
  if (oldPaths.length > 0) {
    await admin.storage.from(DECK_IMAGE_BUCKET).remove(oldPaths);
  }

  const { error } = await admin.storage
    .from(DECK_IMAGE_BUCKET)
    .upload(objectPath, file, {
      contentType: file.type,
      cacheControl: "31536000",
      upsert: true,
    });

  if (error) {
    return { ok: false, message: `이미지 업로드에 실패했습니다: ${error.message}` };
  }

  const { data } = admin.storage.from(DECK_IMAGE_BUCKET).getPublicUrl(objectPath);
  return { ok: true, imageUrl: data.publicUrl };
}

export async function createDeck(formData: FormData): Promise<ActionResponse<{ id: string }>> {
  return safeAction(async () => {
    const tAuth = await getTranslations("auth");
    const tDeckForm = await getTranslations("deck.form");
    const tDeckAction = await getTranslations("deck.action");

    const name = String(formData.get("name") ?? "").trim();
    const script = String(formData.get("script") ?? "latin");
    const nick = String(formData.get("nick") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const wordsText = String(formData.get("words_text") ?? "");
    const image = readOptionalImage(formData);

    const fieldErrors: { [key: string]: string[] } = {};
    if (!name || name.length > 100) fieldErrors.name = [tDeckForm("error.nameLength")];
    if (!isSupportedScript(script)) fieldErrors.script = [tDeckForm("error.unsupportedScript")];
    if (!validateNick(nick)) {
      fieldErrors.nick = [tAuth("validation.nickFormat", { max: NICK_MAX_LENGTH })];
    } else if (isBotNick(nick)) {
      // bot_ prefix는 운영자 시드 전용 — 일반 경로 차단 (#77, API는 토큰으로 허용)
      fieldErrors.nick = [tAuth("validation.botNickForbidden")];
    }
    if (!validatePasswordLength(password)) {
      fieldErrors.password = [tAuth("validation.passwordLength", { min: PASSWORD_MIN_LENGTH, max: PASSWORD_MAX_LENGTH })];
    }

    const wordsValidation = isSupportedScript(script)
      ? parseWordLines(wordsText, script)
      : null;
    if (wordsValidation && !wordsValidation.ok) {
      fieldErrors.words = [wordsValidation.message];
    }

    if (Object.keys(fieldErrors).length > 0) {
      return { success: false, message: tAuth("error.invalidInput"), fieldErrors };
    }

    const creatorId = await getOrCreateAnonUserId();
    if (!creatorId) {
      return { success: false, message: tAuth("error.sessionFailed") };
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

    if (image) {
      const upload = await uploadDeckImage(deck.id, image);
      if (!upload.ok) {
        await admin.from("decks").delete().eq("id", deck.id);
        return { success: false, message: upload.message };
      }
      const { error: imageError } = await admin
        .from("decks")
        .update({ image_url: upload.imageUrl })
        .eq("id", deck.id);
      if (imageError) {
        await admin.from("decks").delete().eq("id", deck.id);
        return { success: false, message: `이미지 저장에 실패했습니다: ${imageError.message}` };
      }
    }

    revalidatePath(`/d/${deck.id}`);
    return { success: true, data: { id: deck.id }, message: tDeckAction("created") };
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
    const tAuth = await getTranslations("auth");
    const check = await verifyCredentials(deckId, nick, password, {
      deckNotFound: "덱을 찾을 수 없습니다.",
      invalidCredentials: tAuth("error.invalidCredentials"),
    });
    if (!check.ok) return { success: false, message: check.message };
    return { success: true, message: tAuth("success.verified") };
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
    const tAuth = await getTranslations("auth");
    const tDeckAction = await getTranslations("deck.action");
    const { deckId, nick, password, addWordsText, deactivateIds } = input;

    const check = await verifyCredentials(deckId, nick, password, {
      deckNotFound: "덱을 찾을 수 없습니다.",
      invalidCredentials: tAuth("error.invalidCredentials"),
    });
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
    return { success: true, message: tDeckAction("updated") };
  });
}

export async function updateDeckImage(formData: FormData): Promise<ActionResponse<{ imageUrl: string }>> {
  return safeAction(async () => {
    const tAuth = await getTranslations("auth");
    const deckId = String(formData.get("deckId") ?? "");
    const nick = String(formData.get("nick") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const image = readOptionalImage(formData);

    if (!deckId || !image) {
      return { success: false, message: "업로드할 이미지를 선택해주세요." };
    }

    const check = await verifyCredentials(deckId, nick, password, {
      deckNotFound: "덱을 찾을 수 없습니다.",
      invalidCredentials: tAuth("error.invalidCredentials"),
    });
    if (!check.ok) return { success: false, message: check.message };

    const upload = await uploadDeckImage(deckId, image);
    if (!upload.ok) return { success: false, message: upload.message };

    const admin = createAdminClient();
    const { error } = await admin
      .from("decks")
      .update({ image_url: upload.imageUrl, updated_at: new Date().toISOString() })
      .eq("id", deckId);
    if (error) {
      return { success: false, message: `이미지 저장에 실패했습니다: ${error.message}` };
    }

    revalidatePath(`/d/${deckId}`);
    revalidatePath(`/d/${deckId}/edit`);
    return { success: true, data: { imageUrl: upload.imageUrl }, message: "이미지를 저장했습니다." };
  });
}
