import { permanentRedirect } from "next/navigation";

interface SlugPageProps {
  params: Promise<{ id: string; slug: string }>;
}

// /d/{id}/{slug} → canonical /d/{id} 영구 리다이렉트 (ADR 0012 — duplicate content 방지)
// slug 값과 무관하게 항상 canonical로 보낸다. /play, /edit는 정적 세그먼트가 우선 매칭.
export default async function DeckSlugPage({ params }: SlugPageProps) {
  const { id } = await params;
  permanentRedirect(`/d/${id}`);
}
