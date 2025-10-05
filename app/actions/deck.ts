"use server";

import { createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Tables, TablesInsert, TablesUpdate } from "@/types/database";
import { parseWordsString } from "@/lib/wordConstraints";

export type Deck = Tables<"decks"> & {
  likes?: Array<{
    deck_id: string;
    user_id: string;
    created_at: string;
  }>;
};
export type DeckInsert = TablesInsert<"decks">;
export type DeckUpdate = TablesUpdate<"decks">;

export async function getDecks() {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("decks")
    .select(`
      *,
      likes (
        deck_id,
        user_id,
        created_at
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`덱 목록을 가져오는데 실패했습니다: ${error.message}`);
  }

  return data as Deck[];
}

export async function getDeck(id: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("decks")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    throw new Error(`덱을 가져오는데 실패했습니다: ${error.message}`);
  }

  return data;
}


export async function createDeck(formData: FormData) {
  const supabase = await createClient();
  
  // 현재 사용자 정보 가져오기
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    throw new Error("로그인이 필요합니다.");
  }

  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const wordsString = formData.get("words") as string;
  const isPublic = formData.get("is_public") === "on";
  const thumbnailUrl = formData.get("thumbnail_url") as string;

  if (!name || !wordsString) {
    throw new Error("이름과 단어는 필수입니다.");
  }

  // 단어 문자열 파싱 및 유효성 검사
  const { normalizedWords: words, validation } = parseWordsString(wordsString);

  if (!validation.isValid) {
    throw new Error(`단어 검증 실패: ${validation.errors.join(', ')}`);
  }

  const { data, error } = await supabase
    .from("decks")
    .insert({
      name,
      description: description || null,
      words,
      is_public: isPublic,
      creator_id: user.id,
      thumbnail_url: thumbnailUrl || null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`덱 생성에 실패했습니다: ${error.message}`);
  }

  revalidatePath("/demo/decks");
  return data;
}

export async function updateDeck(id: string, formData: FormData) {
  const supabase = await createClient();
  
  // 현재 사용자 정보 가져오기
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    throw new Error("로그인이 필요합니다.");
  }

  if (!id || typeof id !== 'string') {
    throw new Error("유효하지 않은 덱 ID입니다.");
  }

  console.log("덱 ID 검증:", { id, idType: typeof id, idLength: id.length });

  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const wordsString = formData.get("words") as string;
  const isPublic = formData.get("is_public") === "on";
  const thumbnailUrl = formData.get("thumbnail_url") as string;

  if (!name || !wordsString) {
    throw new Error("이름과 단어는 필수입니다.");
  }

  // 단어 문자열 파싱 및 유효성 검사
  const { normalizedWords: words, validation } = parseWordsString(wordsString);

  if (!validation.isValid) {
    throw new Error(`단어 검증 실패: ${validation.errors.join(', ')}`);
  }

  // 먼저 덱이 존재하는지 확인
  const { data: existingDeck, error: checkError } = await supabase
    .from("decks")
    .select("id, creator_id, name, updated_at")
    .eq("id", id)
    .single();

  console.log("기존 덱 정보:", { existingDeck, checkError });

  if (checkError) {
    console.error("덱 조회 에러:", checkError);
    throw new Error(`덱을 찾을 수 없습니다: ${checkError.message}`);
  }

  // 권한 확인
  console.log("권한 확인:", { 
    deck_creator_id: existingDeck.creator_id, 
    current_user_id: user.id,
    is_authorized: existingDeck.creator_id === user.id 
  });

  if (existingDeck.creator_id !== user.id) {
    throw new Error("이 덱을 수정할 권한이 없습니다.");
  }

  // 덱 업데이트
  console.log("덱 업데이트 시작:", { 
    id, 
    name, 
    user_id: user.id,
    words: words.slice(0, 3), // 처음 3개 단어만 로그
    is_public: isPublic,
    thumbnail_url: thumbnailUrl
  });
  
  // 업데이트할 데이터 준비
  const updateData = {
    name,
    description: description || null,
    words,
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
    throw new Error(`덱 수정에 실패했습니다: ${updateError.message}`);
  }

  if (count === 0) {
    console.error("업데이트된 행이 없음:", { 
      id, 
      user_id: user.id,
      updateData,
      existingDeck 
    });
    throw new Error("업데이트할 덱을 찾을 수 없습니다. 덱 ID를 확인해주세요.");
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
    throw new Error(`덱 수정 후 데이터를 가져오는데 실패했습니다: ${fetchError.message}`);
  }

  if (!data) {
    console.error("업데이트 후 데이터 없음:", { id, user_id: user.id });
    throw new Error("덱 수정 후 데이터를 가져올 수 없습니다.");
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
  
  return data;
}

export async function deleteDeck(id: string) {
  const supabase = await createClient();
  
  // 현재 사용자 정보 가져오기
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    throw new Error("로그인이 필요합니다.");
  }

  const { error } = await supabase
    .from("decks")
    .delete()
    .eq("id", id)
    .eq("creator_id", user.id); // 본인이 만든 덱만 삭제 가능

  if (error) {
    throw new Error(`덱 삭제에 실패했습니다: ${error.message}`);
  }

  revalidatePath("/demo/decks");
  redirect("/demo/decks");
}
