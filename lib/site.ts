// 절대 URL이 필요한 곳(OG, sitemap, robots)의 단일 origin 소스.
// NEXT_PUBLIC_SITE_URL 우선, Vercel 환경이면 VERCEL_URL fallback.
export function getSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}
