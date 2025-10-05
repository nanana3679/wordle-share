"use server";

import { createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Tables, TablesInsert, TablesUpdate } from "@/types/database";

export type Deck = Tables<"decks">;
export type DeckInsert = TablesInsert<"decks">;
export type DeckUpdate = TablesUpdate<"decks">;

export async function getDecks() {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("decks")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`덱 목록을 가져오는데 실패했습니다: ${error.message}`);
  }

  return data;
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

  if (!name || !wordsString) {
    throw new Error("이름과 단어는 필수입니다.");
  }

  // 단어 배열로 변환 (쉼표로 구분)
  const words = wordsString
    .split(",")
    .map(word => word.trim())
    .filter(word => word.length > 0);

  if (words.length === 0) {
    throw new Error("최소 하나의 단어가 필요합니다.");
  }

  const { data, error } = await supabase
    .from("decks")
    .insert({
      name,
      description: description || null,
      words,
      is_public: isPublic,
      creator_id: user.id,
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

  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const wordsString = formData.get("words") as string;
  const isPublic = formData.get("is_public") === "on";

  if (!name || !wordsString) {
    throw new Error("이름과 단어는 필수입니다.");
  }

  // 단어 배열로 변환 (쉼표로 구분)
  const words = wordsString
    .split(",")
    .map(word => word.trim())
    .filter(word => word.length > 0);

  if (words.length === 0) {
    throw new Error("최소 하나의 단어가 필요합니다.");
  }

  const { data, error } = await supabase
    .from("decks")
    .update({
      name,
      description: description || null,
      words,
      is_public: isPublic,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("creator_id", user.id) // 본인이 만든 덱만 수정 가능
    .select()
    .single();

  if (error) {
    throw new Error(`덱 수정에 실패했습니다: ${error.message}`);
  }

  revalidatePath("/demo/decks");
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
}
