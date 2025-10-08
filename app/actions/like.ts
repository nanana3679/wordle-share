"use server";

import { createClient } from "@/lib/supabase-server";
import { ActionResponse } from "@/types/action";
import { safeAction } from "@/lib/safe-action";

export async function createLike(deckId: string): Promise<ActionResponse> {
  return safeAction(async () => {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return {
        success: false,
        message: "로그인이 필요합니다.",
      };
    }

    const { data, error } = await supabase.from("likes").insert({ deck_id: deckId, user_id: user.id });
    console.log("createLike", data, error);
    
    if (error) {
      return {
        success: false,
        message: `좋아요 추가에 실패했습니다: ${error.message}`,
      };
    }
    
    return {
      success: true,
      message: "좋아요를 추가했습니다.",
    };
  });
}

export async function deleteLike(deckId: string): Promise<ActionResponse> {
  return safeAction(async () => {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return {
        success: false,
        message: "로그인이 필요합니다.",
      };
    }
    const { data, error } = await supabase.from("likes").delete().eq("deck_id", deckId);
    console.log("deleteLike", data, error);
    
    if (error) {
      return {
        success: false,
        message: `좋아요 삭제에 실패했습니다: ${error.message}`,
      };
    }
    
    return {
      success: true,
      message: "좋아요를 취소했습니다.",
    };
  });
}
