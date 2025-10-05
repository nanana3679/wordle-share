'use client';

import { signInWithGoogle, signOut } from '@/app/actions/auth';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useUser } from '@/hook/useUser';
import Loading from '@/components/Loading';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

function TestLoginContent() {
  const { user, loading, refetch } = useUser();

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Google 로그인 테스트</CardTitle>
          <CardDescription>
            Supabase + Google OAuth 연동 확인
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {user ? (
            <div className="space-y-4">
              <Card className="border-green-200 bg-green-50">
                <CardHeader>
                  <CardTitle className="text-green-800 text-lg">로그인 성공!</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={user.user_metadata.avatar_url || undefined} alt="Profile" />
                      <AvatarFallback>{user.user_metadata.name?.charAt(0) || 'U'}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                        <p className="font-medium">{user.user_metadata.name}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="font-medium">사용자 ID:</span>
                      <Badge variant="outline" className="text-xs">
                        {user.id}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">가입일:</span>
                      <span className="text-muted-foreground">
                        {new Date(user.created_at).toLocaleDateString('ko-KR')}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <form action={signOut}>
                <Button 
                  type="submit" 
                  variant="destructive" 
                  className="w-full"
                >
                  로그아웃
                </Button>
              </form>
            </div>
          ) : (
            <form action={signInWithGoogle}>
              <Button 
                type="submit" 
                variant="outline" 
                className="w-full"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Google로 로그인
              </Button>
            </form>
          )}

          <div className="text-xs text-muted-foreground text-center space-y-1 pt-4 border-t">
            <p>환경: <Badge variant="secondary" className="ml-1">{process.env.NODE_ENV}</Badge></p>
            <p>Redirect URL: {process.env.NEXT_PUBLIC_SITE_URL}/auth/callback</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function TestLoginPage() {
  return (
    <ErrorBoundary>
      <TestLoginContent />
    </ErrorBoundary>
  );
}