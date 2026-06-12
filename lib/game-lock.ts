// 낙관적 락 헬퍼 (ADR 0009)
// 상태성 레코드(DailyRound 등)는 version을 보유하고, 모든 액션 요청에
// 클라이언트가 expected_version을 동봉한다. 검증 순서: status → version.

export interface LockableRecord {
  status: string;
  version: number;
}

export type LockCheck =
  | { ok: true }
  | { ok: false; reason: "finished" | "version_conflict"; message: string };

export function checkRoundAction(
  record: LockableRecord,
  expectedVersion: number,
): LockCheck {
  if (record.status !== "in_progress") {
    return { ok: false, reason: "finished", message: "이미 끝난 라운드입니다." };
  }
  if (record.version !== expectedVersion) {
    return {
      ok: false,
      reason: "version_conflict",
      message: "다른 탭에서 진행됐습니다. 최신 상태로 갱신합니다.",
    };
  }
  return { ok: true };
}
