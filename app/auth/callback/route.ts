import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  console.log('Callback received:', { code: code ? 'present' : 'missing', origin })


  if (code) {
    const supabase = await createClient();
     const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        console.error('Session exchange error:', error)
        return NextResponse.redirect(`${origin}/auth/error?message=${error.message}`)
      }

      console.log('Session created successfully:', { 
        userId: data.user?.id,
        email: data.user?.email 
      })
  }

  return NextResponse.redirect(new URL('/demo/decks', requestUrl.origin));
}