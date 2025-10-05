"use server";

import { createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { Tables, TablesInsert, TablesUpdate } from "@/types/database";

export type Like = Tables<"likes">;
export type LikeInsert = TablesInsert<"likes">;
export type LikeUpdate = TablesUpdate<"likes">;

export type LikeWithDeck = Like & {
  decks: {
    id: string;
    name: string | null;
    description: string | null;
    is_public: boolean | null;
  } | null;
};

export async function getLikes() {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("likes")
    .select(`
      *,
      decks (
        id,
        name,
        description,
        is_public
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`좋아요 목록을 가져오는데 실패했습니다: ${error.message}`);
  }

  return data;
}

export async function getLikesByDeck(deckId: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("likes")
    .select(`
      *,
      decks (
        id,
        name,
        description,
        is_public
      )
    `)
    .eq("deck_id", deckId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`덱의 좋아요 목록을 가져오는데 실패했습니다: ${error.message}`);
  }

  return data;
}

export async function getLikesByUser(userId: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("likes")
    .select(`
      *,
      decks (
        id,
        name,
        description,
        is_public
      )
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`사용자의 좋아요 목록을 가져오는데 실패했습니다: ${error.message}`);
  }

  return data;
}

export async function createLike(deckId: string) {
  const supabase = await createClient();
  
  // 현재 사용자 정보 가져오기
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    throw new Error("로그인이 필요합니다.");
  }

  // 이미 좋아요를 눌렀는지 확인
  const { data: existingLike, error: checkError } = await supabase
    .from("likes")
    .select("*")
    .eq("deck_id", deckId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (checkError) {
    throw new Error(`좋아요 확인에 실패했습니다: ${checkError.message}`);
  }

  if (existingLike) {
    throw new Error("이미 좋아요를 누른 덱입니다.");
  }

  const { data, error } = await supabase
    .from("likes")
    .insert({
      deck_id: deckId,
      user_id: user.id,
    })
    .select(`
      *,
      decks (
        id,
        name,
        description,
        is_public
      )
    `)
    .single();

  if (error) {
    throw new Error(`좋아요 생성에 실패했습니다: ${error.message}`);
  }

  revalidatePath("/demo/likes");
  revalidatePath("/demo/decks");
  return data;
}

export async function deleteLike(deckId: string) {
  const supabase = await createClient();
  
  // 현재 사용자 정보 가져오기
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    throw new Error("로그인이 필요합니다.");
  }

  const { error } = await supabase
    .from("likes")
    .delete()
    .eq("deck_id", deckId)
    .eq("user_id", user.id);

  if (error) {
    throw new Error(`좋아요 삭제에 실패했습니다: ${error.message}`);
  }

  revalidatePath("/demo/likes");
  revalidatePath("/demo/decks");
}

export async function toggleLike(deckId: string) {
  const supabase = await createClient();
  
  // 현재 사용자 정보 가져오기
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    throw new Error("로그인이 필요합니다.");
  }

  // 이미 좋아요를 눌렀는지 확인
  const { data: existingLike, error: checkError } = await supabase
    .from("likes")
    .select("*")
    .eq("deck_id", deckId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (checkError) {
    throw new Error(`좋아요 확인에 실패했습니다: ${checkError.message}`);
  }

  if (existingLike) {
    // 좋아요가 있으면 삭제
    await deleteLike(deckId);
    return { action: "removed" };
  } else {
    // 좋아요가 없으면 생성
    await createLike(deckId);
    return { action: "added" };
  }
}

export async function getLikeCount(deckId: string) {
  const supabase = await createClient();
  
  const { count, error } = await supabase
    .from("likes")
    .select("*", { count: "exact", head: true })
    .eq("deck_id", deckId);

  if (error) {
    throw new Error(`좋아요 수를 가져오는데 실패했습니다: ${error.message}`);
  }

  return count || 0;
}

export async function isLikedByUser(deckId: string, userId?: string) {
  if (!userId) return false;
  
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("likes")
    .select("*")
    .eq("deck_id", deckId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`좋아요 확인에 실패했습니다: ${error.message}`);
  }

  return !!data;
}
