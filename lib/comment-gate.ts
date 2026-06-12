// 댓글 가시성 게이트 — 스포일러 방지 단일 룰 (ADR 0007)
//
// thread (deck, T)가 reader R에게 보이는 조건:
//   1. T <  R.local_today                          → 과거 thread, 항상 공개
//   2. T == R.local_today AND 그날 데일리 라운드 종료 → 공개
//   3. T >  R.local_today                          → 미래 thread, 무조건 차단
//      (시차로 먼저 작성된 댓글이라도 reader가 그 날짜에 도달 전엔 비공개.
//       클라이언트 date 조작으로 미래 라운드를 위조해도 룰 3이 우선)
//
// "데일리 종료" 해석: ADR 0007의 'completed'는 ADR 0006("솔브 OR 시도 소진 =
// 완료")과 동일 기준을 가리킨다. 현행 status 모델은 그 '완료'를
// completed(솔브)/failed(소진·포기)로 분리했으므로 둘 다 게이트를 통과시킨다 —
// failed reader는 더 이상 플레이할 수 없어 스포일러 위협이 없고,
// 챌린지 게이트(lib/challenge.ts)와 기준이 일치한다.

import { isChallengeUnlocked } from "./challenge";

export type ThreadVisibility =
  | { visible: true }
  | { visible: false; reason: "today_locked" | "future" };

export function checkThreadVisibility(
  threadDate: string,
  readerToday: string,
  dailyRoundStatus: string | null,
): ThreadVisibility {
  if (threadDate < readerToday) return { visible: true };
  if (threadDate > readerToday) return { visible: false, reason: "future" };
  // T == today
  if (isChallengeUnlocked(dailyRoundStatus)) return { visible: true };
  return { visible: false, reason: "today_locked" };
}
