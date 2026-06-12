import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import Loading from "@/components/common/Loading";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { Suspense } from "react";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { getSiteUrl } from "@/lib/site";

const pretendard = localFont({
  src: [
    {
      path: "../public/fonts/Pretendard-Thin.woff2",
      weight: "100",
      style: "normal",
    },
    {
      path: "../public/fonts/Pretendard-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/Pretendard-Bold.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  display: "swap",
  variable: "--font-pretendard",
});

export const metadata: Metadata = {
  // OG 이미지 등 상대 URL을 절대 URL로 변환하는 기준 (ADR 0012)
  metadataBase: new URL(getSiteUrl()),
  title: "wordledecks",
  description: "관심사 기반 단어 덱으로 즐기는 데일리 워들 — 만들고, 공유하고, 도전하세요.",
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default async function RootLayout({
  children,
}: Readonly<RootLayoutProps>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body
        className={`${pretendard.variable} antialiased`}
        style={{ fontFamily: "var(--font-pretendard)" }}
      >
        <NextIntlClientProvider locale={locale} messages={messages}>
          <QueryProvider>
            <ErrorBoundary>
              <Suspense fallback={<Loading />}>
                {children}
              </Suspense>
            </ErrorBoundary>
            <Toaster />
          </QueryProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
