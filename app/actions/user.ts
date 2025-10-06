"use server";

import { createAdminClient } from "@/lib/supabase-admin";
import { User } from "@supabase/supabase-js";

export async function getUserInfo(userId: string): Promise<User | undefined> {
  const supabase = createAdminClient();
  
  try {
    // Supabase Admin API를 사용하여 특정 사용자 정보 가져오기
    const { data, error } = await supabase.auth.admin.getUserById(userId);
    
    if (error) {
      console.warn('사용자 정보를 가져오는데 실패했습니다:', error);
      return undefined;
    }
    
    return data.user;
  } catch (error) {
    console.warn('사용자 정보를 가져오는데 실패했습니다:', error);
    return undefined;
  }
}
