import { ImageResponse } from "next/og";
import { createClient } from "@/lib/supabase-server";

// /og/{deck_id}.png — 동적 OG 이미지 (ADR 0012)
// 덱 이름 + 단어 수 + 좋아요 수만 렌더. 단어 내용은 절대 포함하지 않는다 (ADR 0008).

export const runtime = "edge";

const SCRIPT_LABELS: Record<string, string> = {
  latin: "로마자",
  hangul: "한글",
  kana: "가나",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ file: string }> },
) {
  const { file } = await params;
  const deckId = file.replace(/\.png$/, "");

  const supabase = await createClient();
  const [{ data: deck }, { count: wordCount }] = await Promise.all([
    supabase
      .from("decks")
      .select("name, script, like_count, hidden")
      .eq("id", deckId)
      .single(),
    supabase
      .from("words")
      .select("id", { count: "exact", head: true })
      .eq("deck_id", deckId)
      .eq("active", true),
  ]);

  // hidden 덱 정보는 외부 미리보기로 노출하지 않는다 (#55)
  if (!deck || deck.hidden) {
    return new Response("Not Found", { status: 404 });
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 24,
          backgroundColor: "#0f172a",
          color: "#f8fafc",
          fontSize: 36,
        }}
      >
        <div style={{ display: "flex", gap: 12, fontSize: 28, color: "#94a3b8" }}>
          wordledecks · {SCRIPT_LABELS[deck.script] ?? deck.script}
        </div>
        <div style={{ display: "flex", fontSize: 72, fontWeight: 700, padding: "0 60px" }}>
          {deck.name}
        </div>
        <div style={{ display: "flex", gap: 40, fontSize: 32, color: "#cbd5e1" }}>
          <span>단어 {wordCount ?? 0}개</span>
          <span>❤️ {deck.like_count}</span>
        </div>
        <div style={{ display: "flex", fontSize: 24, color: "#64748b" }}>
          오늘의 단어에 도전해보세요
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        // 좋아요 수 변동 반영 주기 — 1h TTL (이슈 명세)
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    },
  );
}
