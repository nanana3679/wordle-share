"use server";

import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

export async function signInWithGoogle() {
  const supabase = await createClient();
  
  // 환경변수가 없을 때 기본값 설정
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL 
  || process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}` 
    : 'http://localhost:3000';
    
    console.log('Environment check:', {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      siteUrl: process.env.NEXT_PUBLIC_SITE_UR,
      vercelUrl: process.env.VERCEL_URL
    });

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${siteUrl}/auth/callback`,
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
    // 환경변수 디버그 로깅
    console.log('Environment check:', {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'NOT SET',
      supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'NOT SET',
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'NOT SET'
    });
    
    const supabase = await createClient();
    
    const {
      data: { user },
      error
    } = await supabase.auth.getUser();
    
    if (error) {
      console.error('Supabase auth error:', error);
      throw new Error(`인증 오류: ${error.message}`);
    }
    
    return user;
  } catch (error) {
    console.error('getUser error:', error);
    // 네트워크 오류나 기타 오류를 명시적으로 던져서 ErrorBoundary가 잡을 수 있도록 함
    throw new Error(`사용자 정보를 가져오는 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
  }
}

