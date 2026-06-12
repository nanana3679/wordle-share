// Hot 점수 (#76): log10(max(likes, 1)) + (created_at - ref) / decay
// reddit 스타일 — 좋아요는 로그 스케일, 최신성은 선형 가산.
// ref와 decay는 고정 상수 — 같은 입력이면 항상 같은 점수 (결정성 AC).

export const HOT_REF_EPOCH_MS = Date.UTC(2026, 0, 1); // 2026-01-01T00:00:00Z
export const HOT_DECAY_SECONDS = 45000; // 12.5시간마다 +1점 (좋아요 10배와 등가)

export function hotScore(likeCount: number, createdAt: string | Date): number {
  const createdMs = new Date(createdAt).getTime();
  return (
    Math.log10(Math.max(likeCount, 1)) +
    (createdMs - HOT_REF_EPOCH_MS) / 1000 / HOT_DECAY_SECONDS
  );
}

export function sortByHotScore<T extends { like_count: number; created_at: string }>(
  decks: readonly T[],
): T[] {
  return [...decks].sort((a, b) => {
    const diff = hotScore(b.like_count, b.created_at) - hotScore(a.like_count, a.created_at);
    if (diff !== 0) return diff;
    return b.created_at.localeCompare(a.created_at); // 동점은 최신 우선 (결정적 tie-break)
  });
}
