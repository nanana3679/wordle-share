import { dailySeed } from "./game-seed";

// 챌린지 모드 순수 로직 (ADR 0005, 0006, 0015)
// - 셔플은 결정적: 같은 (deck, date)면 모든 사용자가 같은 시퀀스
// - 시드는 데일리와 별개 salt ("endurance")
// - 게이트: 그날 데일리 라운드 완료(솔브 OR 시도 소진) 후 잠금 해제

export const CHALLENGE_SALT = "endurance";

export function challengeSeed(deckId: string, date: string): number {
  return dailySeed(deckId, date, CHALLENGE_SALT);
}

// mulberry32 — 시드 기반 결정적 PRNG (crypto 불필요)
function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 시드 기반 Fisher-Yates. 입력을 변경하지 않고 새 배열을 반환한다.
export function deterministicShuffle<T>(items: readonly T[], seed: number): T[] {
  const arr = [...items];
  const rand = mulberry32(seed);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ADR 0006: 데일리 "완료"는 솔브(completed)뿐 아니라 시도 소진/포기(failed)도 인정
export function isChallengeUnlocked(dailyRoundStatus: string | null): boolean {
  return dailyRoundStatus === "completed" || dailyRoundStatus === "failed";
}
