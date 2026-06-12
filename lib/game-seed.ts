// 데일리/챌린지 결정적 시드 (ADR 0005, 0015)
// 같은 (deck, date) 입력이면 어느 서버 인스턴스에서 계산해도 같은 결과여야 한다.
// crypto 불필요 — 분포 균일성과 결정성만 요구된다.

// FNV-1a 32-bit
export function hashSeed(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0; // unsigned 32-bit
}

export function dailySeed(deckId: string, date: string, salt = ""): number {
  return hashSeed(`${deckId}:${date}${salt ? `:${salt}` : ""}`);
}

// active_word_ids(Word.id ASC 정렬)에서 오늘의 단어를 고른다 (ADR 0015)
export function pickDailyWordId(sortedWordIds: readonly string[], seed: number): string {
  if (sortedWordIds.length === 0) {
    throw new Error("active_word_ids가 비어있습니다. (min-1-active invariant 위반)");
  }
  return sortedWordIds[seed % sortedWordIds.length];
}

// 시도 횟수 = 글자수 + 1, 5~8 클램프 (#72 AC)
export const MIN_ATTEMPTS = 5;
export const MAX_ATTEMPTS = 8;

export function maxAttemptsForLength(targetUnitLength: number): number {
  return Math.min(MAX_ATTEMPTS, Math.max(MIN_ATTEMPTS, targetUnitLength + 1));
}
