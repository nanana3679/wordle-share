"use server";

import { createAdminClient } from "@/lib/supabase-admin";
import { User } from "@supabase/supabase-js";
import { ActionResponse } from "@/types/action";
import { safeAction } from "@/lib/safe-action";

export async function getUserInfo(userId: string): Promise<ActionResponse<User>> {
  return safeAction(async () => {
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
  });
}
