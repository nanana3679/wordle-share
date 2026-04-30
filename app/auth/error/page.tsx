'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const t = useTranslations('Auth.errorPage');
  const message = searchParams.get('message') || t('default');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            {t('title')}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {message}
          </p>
          <div className="mt-8">
            <Link
              href="/"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              {t('backHome')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function AuthErrorFallback() {
  const t = useTranslations('Common.loading');
  return <div>{t('title')}</div>;
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={<AuthErrorFallback />}>
      <AuthErrorContent />
    </Suspense>
  );
}
