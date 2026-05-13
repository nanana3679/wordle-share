"use server";

import { createAdminClient } from "@/lib/supabase-admin";
import { User } from "@supabase/supabase-js";
import { ActionResponse } from "@/types/action";

export async function getUserInfo(userId: string): Promise<ActionResponse<User>> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase.auth.admin.getUserById(userId);

    if (error) {
      return {
        success: false,
        message: `사용자 정보를 가져오는데 실패했습니다: ${error.message}`,
      };
    }

    return {
      success: true,
      data: data.user as User,
      message: "사용자 정보를 가져왔습니다.",
    };
  } catch (error) {
    console.error("[Server Action Error]", error);
    if (error instanceof Error) return { success: false, message: error.message };
    return { success: false, message: "알 수 없는 서버 오류가 발생했습니다." };
  }
}
