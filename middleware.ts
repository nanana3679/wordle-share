import { createClient } from '@/lib/supabase-middleware';
import { NextRequest } from 'next/server';
import { defaultLocale, isLocale } from '@/i18n/config';

export async function middleware(request: NextRequest) {
  const { supabase, response } = createClient(request);

  // 세션 새로고침
  await supabase.auth.getUser();

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
