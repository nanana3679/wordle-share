'use client';

import { FallbackProps } from 'react-error-boundary';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-destructive/10">
            <svg
              className="h-6 w-6 text-destructive"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
          </div>
          <CardTitle className="text-2xl">오류가 발생했습니다</CardTitle>
          <CardDescription>
            페이지를 불러오는 중 문제가 발생했습니다.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertTitle>오류 상세 정보</AlertTitle>
            <AlertDescription>
              <details className="mt-2">
                <summary className="cursor-pointer font-medium">오류 메시지 보기</summary>
                <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto whitespace-pre-wrap">
                  {error.message}
                </pre>
              </details>
            </AlertDescription>
          </Alert>

          <Button
            onClick={resetErrorBoundary}
            className="w-full"
          >
            다시 시도
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
