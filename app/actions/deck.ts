"use server";

import { createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { validateDeckWords } from "@/lib/wordConstraints";
import { MAX_TAGS_PER_WORD, normalizeCategories } from "@/lib/deckCategories";
import { getScriptAdapter, SUPPORTED_SCRIPTS } from "@/lib/scripts";
import type { DeckWord } from "@/types/decks";
import { getUserInfo } from "@/app/actions/user";
import { User } from "@supabase/supabase-js";
import { PostgrestSingleResponse } from "@supabase/supabase-js";
import { ActionResponse } from "@/types/action";
import { Deck } from "@/types/decks";
import { safeAction } from "@/lib/safe-action";

const ANON_HANDLE_MIN = 2;
const ANON_HANDLE_MAX = 20;
const ANON_PASSWORD_MIN = 4;
const ANON_PASSWORD_MAX = 64;
const BCRYPT_ROUNDS = 10;

// author_password_hash 노출 방지용 화이트리스트
const DECK_PUBLIC_COLUMNS =
  "id, name, description, words, categories, script, thumbnail_url, is_public, created_at, updated_at, creator_id, author_handle";

type DeckPayloadResult =
  | { ok: true; words: DeckWord[]; categories: string[] }
  | { ok: false; message: string; fieldErrors?: { [key: string]: string[] } };

type ScriptResolution =
  | { ok: true; script: string }
  | { ok: false; message: string; fieldErrors?: { [key: string]: string[] } };

// formData의 script를 화이트리스트 검증. 누락 시 'latin' 기본값.
function resolveScript(formData: FormData): ScriptResolution {
  const raw = formData.get("script");
  const script = typeof raw === "string" && raw.trim() ? raw.trim() : "latin";
  if (!(SUPPORTED_SCRIPTS as readonly string[]).includes(script)) {
    return {
      ok: false,
      message: `지원하지 않는 쓰기체계입니다: ${script}`,
      fieldErrors: { script: [`지원하지 않는 쓰기체계입니다: ${script}`] },
    };
  }
  return { ok: true, script };
}

function parseDeckPayload(formData: FormData, script: string = "latin"): DeckPayloadResult {
  const adapter = getScriptAdapter(script);

  const wordsJson = formData.get("words_json");
  if (typeof wordsJson !== "string" || !wordsJson.trim()) {
    return {
      ok: false,
      message: "단어 목록이 비어있습니다.",
      fieldErrors: { words: ["단어는 필수입니다."] },
    };
  }

  let rawWords: unknown;
  try {
    rawWords = JSON.parse(wordsJson);
  } catch {
    return {
      ok: false,
      message: "단어 목록 형식이 올바르지 않습니다.",
      fieldErrors: { words: ["단어 목록 JSON 파싱에 실패했습니다."] },
    };
  }

  if (!Array.isArray(rawWords)) {
    return {
      ok: false,
      message: "단어 목록은 배열이어야 합니다.",
      fieldErrors: { words: ["단어 목록은 배열이어야 합니다."] },
    };
  }

  const wordsValidation = validateDeckWords(rawWords as DeckWord[], adapter);
  if (wordsValidation.errors.length > 0) {
    return {
      ok: false,
      message: `단어 검증 실패: ${wordsValidation.errors.join(", ")}`,
      fieldErrors: { words: wordsValidation.errors },
    };
  }

  const categoriesJson = formData.get("categories_json");
  let rawCategories: unknown = [];
  if (typeof categoriesJson === "string" && categoriesJson.trim()) {
    try {
      rawCategories = JSON.parse(categoriesJson);
    } catch {
      return {
        ok: false,
        message: "카테고리 목록 형식이 올바르지 않습니다.",
        fieldErrors: { categories: ["카테고리 목록 JSON 파싱에 실패했습니다."] },
      };
    }
  }

  const categoriesValidation = normalizeCategories(rawCategories);
  if (categoriesValidation.errors.length > 0) {
    return {
      ok: false,
      message: `카테고리 검증 실패: ${categoriesValidation.errors.join(", ")}`,
      fieldErrors: { categories: categoriesValidation.errors },
    };
  }

  // 카테고리 팔레트에 없는 태그는 잘라내고, 중복 제거 후 단어당 상한을 적용한다
  // (UI에서 이미 막지만 서버에서도 보강)
  const allowed = new Set(categoriesValidation.ok);
  const filteredWords = wordsValidation.ok.map((w) => {
    const tags =
      categoriesValidation.ok.length === 0
        ? []
        : Array.from(new Set(w.tags.filter((tag) => allowed.has(tag)))).slice(
            0,
            MAX_TAGS_PER_WORD,
          );
    return { word: w.word, tags };
  });

  return {
    ok: true,
    words: filteredWords,
    categories: categoriesValidation.ok,
  };
}

export async function getDecks(page: number = 1, pageSize: number = 24): Promise<ActionResponse<Deck[]> & { total?: number; page?: number; pageSize?: number; totalPages?: number }> {
  return safeAction(async () => {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    
    // 전체 개수 가져오기
    const { count, error: countError } = await supabase
      .from("decks")
      .select("*", { count: "exact", head: true });

    if (countError) {
      return {
        success: false,
        message: `덱 개수를 가져오는데 실패했습니다: ${countError.message}`,
      };
    }

    const total = count || 0;
    const totalPages = Math.ceil(total / pageSize);
    const offset = (page - 1) * pageSize;
    
    const { data: decks, error }: PostgrestSingleResponse<Deck[]> = await supabase
      .from("decks")
      .select(`
        ${DECK_PUBLIC_COLUMNS},
        likes (
          deck_id,
          user_id,
          created_at
        )
      `)
      .order("created_at", { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (error) {
      return {
        success: false,
        message: `덱 목록을 가져오는데 실패했습니다: ${error.message}`,
      };
    }

    let newDecks = decks;

    // userId가 제공된 경우 isLiked 정보 추가
    if (user && decks) {
      newDecks = decks.map(deck => ({
        ...deck,
        isLiked: deck.likes?.some(like => like.user_id === user.id) || false
      }));
    }

    return {
      success: true,
      data: newDecks as Deck[],
      message: "덱 목록을 가져왔습니다.",
      total,
      page,
      pageSize,
      totalPages,
    };
  });
}

export async function getDeck(deckId: string): Promise<ActionResponse<Deck>> {
  return safeAction(async () => {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data: deckData, error: deckError } = await supabase
      .from("decks")
      .select(`
        ${DECK_PUBLIC_COLUMNS},
        likes (
          deck_id,
          user_id,
          created_at
        )
      `)
      .eq("id", deckId)
      .single();

    if (deckError) {
      return {
        success: false,
        message: `덱을 가져오는데 실패했습니다: ${deckError.message}`,
      };
    }

    // 작성자 정보 가져오기 (모든 사용자에게 표시)
    let creator: User | null = null;
    if (deckData?.creator_id) {
      const userInfoResponse = await getUserInfo(deckData.creator_id);
      if (userInfoResponse.success && userInfoResponse.data) {
        creator = userInfoResponse.data;
      } else {
        return {
          success: false,
          message: userInfoResponse.message,
        };
      }
    }

    // 인증되지 않은 사용자의 경우
    if (!user) {
      return {
        success: true,
        data: {
          ...deckData,
          creator,
          isLiked: false,
          isCreator: false,
        } as Deck,
        message: "덱을 가져왔습니다.",
      };
    }
    
    // 인증된 사용자의 경우 - isLiked와 isCreator 정보 추가
    const isLiked = deckData?.likes?.some(like => like.user_id === user.id);

    const newDeck = {
      ...deckData,
      creator,
      isLiked,
      isCreator: deckData?.creator_id === user.id,
    } as Deck;

    return {
      success: true,
      data: newDeck,
      message: "덱을 가져왔습니다.",
    };
  });
}


export async function createDeck(formData: FormData): Promise<ActionResponse<Deck>> {
  return safeAction(async () => {
    const supabase = await createClient();
    
    // 현재 사용자 정보 가져오기
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return {
        success: false,
        message: "로그인이 필요합니다.",
      };
    }

    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const isPublic = formData.get("is_public") === "on";
    const thumbnailUrl = formData.get("thumbnail_url") as string;

    if (!name) {
      return {
        success: false,
        message: "이름은 필수입니다.",
        fieldErrors: { name: ["이름은 필수입니다."] },
      };
    }

    const scriptResolution = resolveScript(formData);
    if (!scriptResolution.ok) {
      return {
        success: false,
        message: scriptResolution.message,
        fieldErrors: scriptResolution.fieldErrors,
      };
    }

    const parsed = parseDeckPayload(formData, scriptResolution.script);
    if (!parsed.ok) {
      return {
        success: false,
        message: parsed.message,
        fieldErrors: parsed.fieldErrors,
      };
    }

    const { data, error } = await supabase
      .from("decks")
      .insert({
        name,
        description: description || null,
        words: parsed.words,
        categories: parsed.categories,
        script: scriptResolution.script,
        is_public: isPublic,
        creator_id: user.id,
        thumbnail_url: thumbnailUrl || null,
      })
      .select()
      .single();

    if (error) {
      return {
        success: false,
        message: `덱 생성에 실패했습니다: ${error.message}`,
      };
    }

    revalidatePath("/demo/decks");
    return {
      success: true,
      data: data as Deck,
      message: "덱을 생성했습니다.",
    };
  });
}

export async function createAnonymousDeck(formData: FormData): Promise<ActionResponse<Deck>> {
  return safeAction(async () => {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      return {
        success: false,
        message: "로그인 상태에서는 익명 덱을 만들 수 없습니다.",
      };
    }

    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const authorHandle = (formData.get("author_handle") as string)?.trim();
    const password = formData.get("password") as string;

    const fieldErrors: { [key: string]: string[] } = {};
    if (!name) fieldErrors.name = ["이름은 필수입니다."];
    if (!authorHandle) {
      fieldErrors.author_handle = ["표시 이름은 필수입니다."];
    } else if (authorHandle.length < ANON_HANDLE_MIN || authorHandle.length > ANON_HANDLE_MAX) {
      fieldErrors.author_handle = [`표시 이름은 ${ANON_HANDLE_MIN}~${ANON_HANDLE_MAX}자여야 합니다.`];
    }
    if (!password) {
      fieldErrors.password = ["비밀번호는 필수입니다."];
    } else if (password.length < ANON_PASSWORD_MIN || password.length > ANON_PASSWORD_MAX) {
      fieldErrors.password = [`비밀번호는 ${ANON_PASSWORD_MIN}~${ANON_PASSWORD_MAX}자여야 합니다.`];
    }

    if (Object.keys(fieldErrors).length > 0) {
      return {
        success: false,
        message: "입력값을 확인해주세요.",
        fieldErrors,
      };
    }

    const scriptResolution = resolveScript(formData);
    if (!scriptResolution.ok) {
      return {
        success: false,
        message: scriptResolution.message,
        fieldErrors: scriptResolution.fieldErrors,
      };
    }

    const parsed = parseDeckPayload(formData, scriptResolution.script);
    if (!parsed.ok) {
      return {
        success: false,
        message: parsed.message,
        fieldErrors: parsed.fieldErrors,
      };
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const { data, error } = await supabase
      .from("decks")
      .insert({
        name,
        description: description || null,
        words: parsed.words,
        categories: parsed.categories,
        script: scriptResolution.script,
        is_public: true,
        creator_id: null,
        author_handle: authorHandle,
        author_password_hash: passwordHash,
        thumbnail_url: null,
      })
      .select()
      .single();

    if (error) {
      return {
        success: false,
        message: `덱 생성에 실패했습니다: ${error.message}`,
      };
    }

    revalidatePath("/demo/decks");
    return {
      success: true,
      data: data as Deck,
      message: "익명 덱을 생성했습니다.",
    };
  });
}

export async function updateDeck(id: string, formData: FormData): Promise<ActionResponse<Deck>> {
  return safeAction(async () => {
    const supabase = await createClient();
    
    // 현재 사용자 정보 가져오기
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return {
        success: false,
        message: "로그인이 필요합니다.",
      };
    }

    if (!id || typeof id !== 'string') {
      return {
        success: false,
        message: "유효하지 않은 덱 ID입니다.",
      };
    }

    console.log("덱 ID 검증:", { id, idType: typeof id, idLength: id.length });

    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const isPublic = formData.get("is_public") === "on";
    const thumbnailUrl = formData.get("thumbnail_url") as string;

    if (!name) {
      return {
        success: false,
        message: "이름은 필수입니다.",
        fieldErrors: { name: ["이름은 필수입니다."] },
      };
    }

    // 먼저 덱이 존재하는지 확인 (수정 시 script는 기존 값으로 잠금)
    const { data: existingDeck, error: checkError } = await supabase
      .from("decks")
      .select("id, creator_id, name, updated_at, script")
      .eq("id", id)
      .single();

    if (checkError) {
      console.error("덱 조회 에러:", checkError);
      return {
        success: false,
        message: `덱을 찾을 수 없습니다: ${checkError.message}`,
      };
    }

    const lockedScript = (existingDeck.script as string | null) ?? "latin";
    if (!(SUPPORTED_SCRIPTS as readonly string[]).includes(lockedScript)) {
      return {
        success: false,
        message: `덱의 쓰기체계가 지원되지 않습니다: ${lockedScript}`,
      };
    }

    const parsed = parseDeckPayload(formData, lockedScript);
    if (!parsed.ok) {
      return {
        success: false,
        message: parsed.message,
        fieldErrors: parsed.fieldErrors,
      };
    }

    console.log("기존 덱 조회 성공:", { id: existingDeck.id });

    // 권한 확인
    console.log("권한 확인:", { 
      deck_creator_id: existingDeck.creator_id, 
      current_user_id: user.id,
      is_authorized: existingDeck.creator_id === user.id 
    });

    if (existingDeck.creator_id !== user.id) {
      return {
        success: false,
        message: "이 덱을 수정할 권한이 없습니다.",
      };
    }

    // 덱 업데이트
    console.log("덱 업데이트 시작:", {
      id,
      name,
      user_id: user.id,
      words: parsed.words.slice(0, 3).map((w) => w.word), // 처음 3개 단어만 로그
      categories: parsed.categories,
      is_public: isPublic,
      thumbnail_url: thumbnailUrl,
    });

    // 업데이트할 데이터 준비
    const updateData = {
      name,
      description: description || null,
      words: parsed.words,
      categories: parsed.categories,
      is_public: isPublic,
      thumbnail_url: thumbnailUrl || null,
      updated_at: new Date().toISOString(),
    };
    
    console.log("업데이트할 데이터:", updateData);
    
    // 먼저 업데이트 실행 (select 없이)
    const { error: updateError, count } = await supabase
      .from("decks")
      .update(updateData)
      .eq("id", id);

    console.log("업데이트 결과:", { 
      updateError, 
      count,
      affectedRows: count 
    });

    if (updateError) {
      console.error("업데이트 에러:", updateError);
      return {
        success: false,
        message: `덱 수정에 실패했습니다: ${updateError.message}`,
      };
    }

    if (count === 0) {
      console.error("업데이트된 행이 없음:", { 
        id, 
        user_id: user.id,
        updateData,
        existingDeck 
      });
      return {
        success: false,
        message: "업데이트할 덱을 찾을 수 없습니다. 덱 ID를 확인해주세요.",
      };
    }

    console.log("업데이트 성공:", { affectedRows: count });

    // 업데이트 후 데이터 다시 가져오기
    const { data, error: fetchError } = await supabase
      .from("decks")
      .select("*")
      .eq("id", id)
      .single();

    console.log("업데이트 후 데이터 조회 결과:", { 
      data: data ? { 
        id: data.id, 
        name: data.name, 
        updated_at: data.updated_at,
        words_count: data.words?.length 
      } : null, 
      error: fetchError 
    });

    if (fetchError) {
      console.error("데이터 조회 에러:", fetchError);
      return {
        success: false,
        message: `덱 수정 후 데이터를 가져오는데 실패했습니다: ${fetchError.message}`,
      };
    }

    if (!data) {
      console.error("업데이트 후 데이터 없음:", { id, user_id: user.id });
      return {
        success: false,
        message: "덱 수정 후 데이터를 가져올 수 없습니다.",
      };
    }

    console.log("최종 업데이트된 덱:", {
      id: data.id,
      name: data.name,
      updated_at: data.updated_at,
      words_count: data.words?.length
    });

    // 캐시 무효화 - 더 포괄적으로
    revalidatePath("/demo/decks");
    revalidatePath(`/demo/decks/${id}`);
    revalidatePath("/demo/decks", "page");
    
    return {
      success: true,
      data: data as Deck,
      message: "덱을 수정했습니다.",
    };
  });
}

export async function deleteDeck(id: string): Promise<ActionResponse> {
  return safeAction(async () => {
    const supabase = await createClient();
    
    // 현재 사용자 정보 가져오기
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return {
        success: false,
        message: "로그인이 필요합니다.",
      };
    }

    const { error } = await supabase
      .from("decks")
      .delete()
      .eq("id", id)
      .eq("creator_id", user.id); // 본인이 만든 덱만 삭제 가능

    if (error) {
      return {
        success: false,
        message: `덱 삭제에 실패했습니다: ${error.message}`,
      };
    }

    revalidatePath("/demo/decks");
    redirect("/demo/decks");
  });
}
