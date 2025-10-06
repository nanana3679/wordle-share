"use server";

import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export async function signInWithGoogle() {
  const supabase = await createClient();
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  });

  if (error) {
    console.error('OAuth sign in error:', error);
    throw error;
  }

  if (data.url) {
    console.log('Redirecting to:', data.url);
    redirect(data.url);
  } else {
    throw new Error('OAuth URL이 생성되지 않았습니다');
  }
}

export async function signOut() {
  const supabase = await createClient();
  
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }

  redirect("/demo/decks");
}

export async function getUser() {
  try {
    // Supabase auth 쿠키가 있는지 먼저 확인
    const cookieStore = await cookies();
    
    // Supabase 쿠키들을 찾기 (sb-로 시작하는 쿠키들)
    const allCookies = cookieStore.getAll();
    const supabaseAuthToken = allCookies.find(cookie => 
      cookie.name.startsWith('sb-') && cookie.name.includes('auth-token')
    );
    
    // auth 쿠키가 없으면 null 반환
    if (!supabaseAuthToken) {
      return null;
    }
    
    const supabase = await createClient();
    
    const {
      data: { user },
      error
    } = await supabase.auth.getUser();
    
    if (error) {
      console.error('Supabase auth error:', error);
      // 인증 오류 시 토큰 삭제
      await clearAuthTokens();
      throw new Error(`인증 오류: ${error.message}`);
    }
    
    return user;
  } catch (error) {
    console.error('getUser error:', error);
    // 오류 발생 시 토큰 삭제
    await clearAuthTokens();
    // 네트워크 오류나 기타 오류를 명시적으로 던져서 ErrorBoundary가 잡을 수 있도록 함
    throw new Error(`사용자 정보를 가져오는 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
  }
}

async function clearAuthTokens() {
  try {
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    
    // Supabase 관련 쿠키들 삭제
    const supabaseCookies = allCookies.filter(cookie => 
      cookie.name.startsWith('sb-')
    );
    
    for (const cookie of supabaseCookies) {
      cookieStore.delete({
        name: cookie.name,
        path: '/',
      });
    }
    
    console.log('Auth tokens cleared due to error');
  } catch (clearError) {
    console.error('Error clearing auth tokens:', clearError);
  }
}

