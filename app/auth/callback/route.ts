import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
      
    // 성공적으로 로그인한 후 원래 가려던 페이지로 리디렉션
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/demo/decks`);
  }

  NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/auth/error?message=${encodeURIComponent('인증 코드가 없습니다')}`);
}