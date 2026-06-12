import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site";

// 게임 페이지는 인덱싱 차단 (ADR 0012 — 정답 누설 방지와 별개로 SPA라 SEO 가치 없음)
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: "/d/*/play",
    },
    sitemap: `${getSiteUrl()}/sitemap.xml`,
  };
}
