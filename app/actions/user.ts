"use server";

import { createClient } from "@/lib/supabase-server";

export async function getUserInfo(userId: string): Promise<{
  id: string;
  email: string | null;
  name: string;
  avatar_url: string | null;
}> {
  const supabase = await createClient();
  
  try {
    // 현재 사용자 정보를 가져와서 요청한 사용자와 비교
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user && user.id === userId) {
      return {
        id: user.id,
        email: user.email || null,
        name: user.user_metadata?.full_name || user.user_metadata?.name || 'Unknown',
        avatar_url: user.user_metadata?.avatar_url || null,
      };
    }
    
    // 다른 사용자의 경우 기본 정보만 반환
    return {
      id: userId,
      email: null,
      name: 'Unknown User',
      avatar_url: null,
    };
  } catch (error) {
    console.warn('사용자 정보를 가져오는데 실패했습니다:', error);
    return {
      id: userId,
      email: null,
      name: 'Unknown User',
      avatar_url: null,
    };
  }
}
