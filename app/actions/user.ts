"use server";

import { createAdminClient } from "@/lib/supabase-admin";
import { AuthError, User } from "@supabase/supabase-js";

type ActionResponse<T> = {
  data: T | null;
  error: AuthError | null;
  message: string | null;
};

export async function getUserInfo(userId: string) {
  const supabase = createAdminClient();
  
  const { data, error } = await supabase.auth.admin.getUserById(userId);
    
  if (error) {
    return {
      data: null,
      error,
      message: `사용자 정보를 가져오는데 실패했습니다: ${error.message}`
    } as ActionResponse<User>;
  }
    
  return {
    data: data.user as User,
    error: null,
    message: null
  } as ActionResponse<User>;
}
