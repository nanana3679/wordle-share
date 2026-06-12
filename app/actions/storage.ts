"use server";

import { createClient } from "@/lib/supabase-server";
import { ActionResponse } from "@/types/action";
import { safeAction } from "@/lib/safe-action";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// 익명 세션도 authenticated로 취급되므로, 인증 여부만으로는 부족하고
// 해당 덱의 소유자인지 반드시 확인해야 한다.
async function verifyDeckOwnership(
  supabase: SupabaseClient<Database>,
  deckId: string,
  userId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { data: deck, error } = await supabase
    .from("decks")
    .select("creator_id")
    .eq("id", deckId)
    .single();

  if (error || !deck) {
    return { ok: false, message: "덱을 찾을 수 없습니다." };
  }

  // 익명 덱(creator_id가 null)은 소유자를 확인할 수 없으므로 거부 (updateDeck과 동일 정책)
  if (deck.creator_id !== userId) {
    return { ok: false, message: "이 덱의 썸네일을 변경할 권한이 없습니다." };
  }

  return { ok: true };
}

export async function uploadDeckThumbnail(file: File, deckId: string): Promise<ActionResponse<string>> {
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

    const ownership = await verifyDeckOwnership(supabase, deckId, user.id);
    if (!ownership.ok) {
      return {
        success: false,
        message: ownership.message,
      };
    }

    // 파일명 생성 (deckId.확장자)
    const fileExt = file.name.split('.').pop();
    const fileName = `${deckId}.${fileExt}`;
    const filePath = fileName;

    // 파일 업로드 (덱당 하나의 썸네일만 허용하므로 upsert: true)
    const { error } = await supabase.storage
      .from('deck-thumbnails')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (error) {
      return {
        success: false,
        message: `이미지 업로드에 실패했습니다: ${error.message}`,
      };
    }

    // 공개 URL 생성
    const { data: urlData } = supabase.storage
      .from('deck-thumbnails')
      .getPublicUrl(filePath);

    if (!urlData?.publicUrl) {
      return {
        success: false,
        message: "이미지 URL 생성에 실패했습니다.",
      };
    }

    return {
      success: true,
      data: urlData.publicUrl,
      message: "이미지 업로드에 성공했습니다.",
    };
  });
}

export async function deleteDeckThumbnail(deckId: string): Promise<ActionResponse> {
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

    const ownership = await verifyDeckOwnership(supabase, deckId, user.id);
    if (!ownership.ok) {
      return {
        success: false,
        message: ownership.message,
      };
    }

    // 파일 삭제 (확장자가 다를 수 있으므로 패턴 매칭으로 삭제)
    const { data: files, error: listError } = await supabase.storage
      .from('deck-thumbnails')
      .list('', {
        search: deckId
      });

    if (listError) {
      return {
        success: false,
        message: `이미지 목록 조회에 실패했습니다: ${listError.message}`,
      };
    }

    if (files && files.length > 0) {
      const fileNames = files.map(file => file.name);
      const { error } = await supabase.storage
        .from('deck-thumbnails')
        .remove(fileNames);

      if (error) {
        return {
          success: false,
          message: `이미지 삭제에 실패했습니다: ${error.message}`,
        };
      }
    }

    return {
      success: true,
      message: "이미지를 삭제했습니다.",
    };
  });
}
