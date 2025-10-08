"use server";

import { createClient } from "@/lib/supabase-server";
import { Tables, TablesInsert, TablesUpdate } from "@/types/database";
import { AuthError, PostgrestError } from "@supabase/supabase-js";

export type Like = Tables<"likes">;
export type LikeInsert = TablesInsert<"likes">;
export type LikeUpdate = TablesUpdate<"likes">;

type ActionResponse<T> = {
  data: T | null;
  error: PostgrestError | AuthError | null;
  message: string | null;
};

export async function createLike(deckId: string, userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("likes").insert({ deck_id: deckId, user_id: userId });
  return { data, error } as ActionResponse<void>;
}

export async function deleteLike(deckId: string, userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("likes").delete().eq("deck_id", deckId).eq("user_id", userId);
  return { data, error } as ActionResponse<void>;
}
