import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase-server";
import { getSiteUrl } from "@/lib/site";

// hidden = false 덱만 포함 (ADR 0012/0013) — 가림 해제 시 다음 갱신 cycle에 자동 복귀
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const supabase = await createClient();

  const { data: decks } = await supabase
    .from("decks")
    .select("id, updated_at")
    .eq("hidden", false)
    .order("created_at", { ascending: false })
    .limit(5000);

  return [
    {
      url: siteUrl,
      changeFrequency: "daily",
      priority: 1,
    },
    ...(decks ?? []).map((deck) => ({
      url: `${siteUrl}/d/${deck.id}`,
      lastModified: new Date(deck.updated_at),
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
  ];
}
