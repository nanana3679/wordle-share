import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/database";

/**
 * 좋아요 토글: 이미 좋아요한 경우 삭제, 아니면 upsert.
 * 소유권 필터(user_id)를 항상 적용하므로 타인의 좋아요를 건드리지 않습니다.
 */
export async function toggleLike(
  deckId: string,
  supabase: SupabaseClient<Database>
): Promise<{ isLiked: boolean; error?: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { isLiked: false, error: "로그인이 필요합니다." };
  }

  // 현재 좋아요 여부 확인
  const { data: existing, error: selectError } = await supabase
    .from("likes")
    .select("deck_id")
    .eq("deck_id", deckId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (selectError) {
    return { isLiked: false, error: selectError.message };
  }

  if (existing) {
    // 이미 좋아요 → 삭제 (user_id 필터 명시)
    const { error: deleteError } = await supabase
      .from("likes")
      .delete()
      .eq("deck_id", deckId)
      .eq("user_id", user.id);

    if (deleteError) {
      return { isLiked: true, error: deleteError.message };
    }
    return { isLiked: false };
  } else {
    // 좋아요 없음 → upsert (중복 방지)
    const { error: upsertError } = await supabase
      .from("likes")
      .upsert({ deck_id: deckId, user_id: user.id }, { onConflict: "deck_id,user_id" });

    if (upsertError) {
      return { isLiked: false, error: upsertError.message };
    }
    return { isLiked: true };
  }
}
