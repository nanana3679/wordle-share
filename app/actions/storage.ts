"use server";

import { createClient } from "@/lib/supabase-server";
import { ActionResponse } from "@/types/action";
import { safeAction } from "@/lib/safe-action";

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
