"use server";

import { createClient } from "@/lib/supabase-server";
import { ActionResponse } from "@/types/action";
import { safeAction } from "@/lib/safe-action";
import { toggleLike as _toggleLike } from "@/lib/likeManager";

export async function toggleLike(
  deckId: string
): Promise<ActionResponse<{ isLiked: boolean }>> {
  return safeAction(async () => {
    const supabase = await createClient();
    const { isLiked, error } = await _toggleLike(deckId, supabase);

    if (error) {
      return { success: false, message: error };
    }

    return {
      success: true,
      message: isLiked ? "좋아요를 추가했습니다." : "좋아요를 취소했습니다.",
      data: { isLiked },
    };
  });
}

/** @deprecated toggleLike 사용 권장 */
export async function createLike(deckId: string): Promise<ActionResponse> {
  return safeAction(async () => {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, message: "로그인이 필요합니다." };
    }

    // toggleLike 경유 X — 직접 upsert (좋아요 추가 전용)
    const { error } = await supabase
      .from("likes")
      .upsert({ deck_id: deckId, user_id: user.id }, { onConflict: "deck_id,user_id" });

    if (error) {
      return { success: false, message: `좋아요 추가에 실패했습니다: ${error.message}` };
    }

    return { success: true, message: "좋아요를 추가했습니다." };
  });
}

/** @deprecated toggleLike 사용 권장 */
export async function deleteLike(deckId: string): Promise<ActionResponse> {
  return safeAction(async () => {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, message: "로그인이 필요합니다." };
    }

    // user_id 필터를 반드시 적용해 소유권 보장
    const { error } = await supabase
      .from("likes")
      .delete()
      .eq("deck_id", deckId)
      .eq("user_id", user.id);

    if (error) {
      return { success: false, message: `좋아요 삭제에 실패했습니다: ${error.message}` };
    }

    return { success: true, message: "좋아요를 취소했습니다." };
  });
}
