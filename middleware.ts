import { createClient } from '@/lib/supabase-middleware';
import { NextRequest } from 'next/server';
import { defaultLocale, isLocale } from '@/i18n/config';
import {
  buildContentSecurityPolicy,
  STATIC_SECURITY_HEADERS,
  supabaseConnectSrc,
} from '@/lib/security-headers';

export async function middleware(request: NextRequest) {
  // 요청별 nonce. Next.js는 CSP 헤더의 nonce를 읽어 자체 스크립트에 자동 주입한다.
  const nonce = btoa(crypto.randomUUID());
  const isDev = process.env.NODE_ENV !== 'production';
  const csp = buildContentSecurityPolicy({
    nonce,
    isDev,
    connectSrc: supabaseConnectSrc(process.env.NEXT_PUBLIC_SUPABASE_URL),
  });

  // Server Component가 headers()로 nonce를 읽고, Next.js가 CSP nonce를 인식하도록
  // 요청 헤더에 주입한 뒤 그대로 다운스트림으로 흘려보낸다.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('content-security-policy', csp);

  const { supabase, response } = createClient(request, requestHeaders);

  // 세션 새로고침
  await supabase.auth.getUser();

  response.headers.set('content-security-policy', csp);
  for (const [key, value] of Object.entries(STATIC_SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }

  if (!request.cookies.get('NEXT_LOCALE')) {
    const acceptLang = request.headers.get('accept-language') ?? '';
    const locale =
      acceptLang
        .split(',')
        .map((part) => part.trim().split(';')[0]?.split('-')[0])
        .find((lang): lang is string => Boolean(lang && isLocale(lang))) ??
      defaultLocale;
    response.cookies.set('NEXT_LOCALE', locale, {
      maxAge: 60 * 60 * 24 * 365,
      path: '/',
    });
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
