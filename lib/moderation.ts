// 신고 누적 자동 가림 규칙 (ADR 0013)
// 임계치는 환경변수로 분리 — 코드 변경 없이 운영 중 조정 가능.

export type ReportTargetType = "deck" | "comment";

export const DEFAULT_REPORT_THRESHOLDS: Record<ReportTargetType, number> = {
  deck: 5, // 피드/검색 제외, 직접 링크는 유지 (consumer UX는 #55)
  comment: 3, // 즉시 숨김
};

export function reportThreshold(
  targetType: ReportTargetType,
  env: Record<string, string | undefined> = process.env,
): number {
  const raw =
    targetType === "deck" ? env.REPORT_THRESHOLD_DECK : env.REPORT_THRESHOLD_COMMENT;
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isInteger(parsed) && parsed > 0
    ? parsed
    : DEFAULT_REPORT_THRESHOLDS[targetType];
}

export interface ReportApplication {
  newCount: number;
  hide: boolean;
}

// 신고 1건 반영 결과 — 임계 도달 시 hide. 이미 임계 초과 상태도 hide 유지.
export function applyReport(currentCount: number, threshold: number): ReportApplication {
  const newCount = currentCount + 1;
  return { newCount, hide: newCount >= threshold };
}
