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
  title: "wordledecks",
  description: "Wordle deck sharing platform",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
