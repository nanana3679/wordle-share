"use server";

import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { User } from "@/type/user";

export async function signInWithGoogle() {
  const supabase = await createClient();
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  });

  if (error) {
    throw error;
  }

  if (data.url) {
    redirect(data.url);
  }
}

export async function signOut() {
  const supabase = await createClient();
  
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }

  redirect("/");
}

export async function getUser() {
  try {
    const supabase = await createClient();
    
    const {
      data: { user },
    } = await supabase.auth.getUser();
    
    if (user) {
      return {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.full_name || user.user_metadata?.name || 'Unknown',
        avatar_url: user.user_metadata?.avatar_url || null,
        created_at: user.created_at,
      } as User;
    }
    
    return null;
  } catch (error) {
    console.error('getUser error:', error);
    // 네트워크 오류나 기타 오류를 명시적으로 던져서 ErrorBoundary가 잡을 수 있도록 함
    throw new Error(`사용자 정보를 가져오는 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
  }
}

