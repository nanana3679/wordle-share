'use client';

import { FallbackProps } from 'react-error-boundary';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useTranslations } from 'next-intl';

export function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  const t = useTranslations('Common.error');
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
          <CardTitle className="text-2xl">{t('title')}</CardTitle>
          <CardDescription>
            {t('description')}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertTitle>{t('details')}</AlertTitle>
            <AlertDescription>
              <details className="mt-2">
                <summary className="cursor-pointer font-medium">{t('showDetails')}</summary>
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
            {t('retry')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
