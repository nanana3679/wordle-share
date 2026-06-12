"use server";

import { createAdminClient } from "@/lib/supabase-admin";
import { safeAction } from "@/lib/safe-action";
import { ActionResponse } from "@/types/action";
import { getOrCreateAnonUserId } from "@/lib/anon-session";
import { applyReport, reportThreshold, type ReportTargetType } from "@/lib/moderation";

// 신고 + 자동 가림 (#50, ADR 0013)
// reports.target_id가 polymorphic이라 report_count/hidden 갱신을
// DB 트리거 대신 여기서 명시적으로 수행한다.

const PG_UNIQUE_VIOLATION = "23505";
const TARGET_TABLE: Record<ReportTargetType, "decks" | "comments"> = {
  deck: "decks",
  comment: "comments",
};

// 자동 가림 시 운영자 알림 — MVP는 환경변수 가드 stub (V2에서 정식 webhook)
async function notifyModeration(targetType: ReportTargetType, targetId: string): Promise<void> {
  const url = process.env.MODERATION_WEBHOOK_URL;
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: `[wordledecks] ${targetType} ${targetId} 자동 가림 (신고 임계 도달)`,
      }),
    });
  } catch (error) {
    console.error("[moderation] webhook 알림 실패:", error);
  }
}

export async function reportTarget(input: {
  targetType: ReportTargetType;
  targetId: string;
  reason?: string;
}): Promise<ActionResponse> {
  return safeAction(async () => {
    const { targetType, targetId } = input;
    const reason = input.reason?.trim().slice(0, 200) || null;

    if (targetType !== "deck" && targetType !== "comment") {
      return { success: false, message: "지원하지 않는 신고 대상입니다." };
    }

    const anonId = await getOrCreateAnonUserId();
    if (!anonId) return { success: false, message: "세션 발급에 실패했습니다." };

    const admin = createAdminClient();
    const table = TARGET_TABLE[targetType];

    const { data: target } = await admin
      .from(table)
      .select("id, report_count, hidden")
      .eq("id", targetId)
      .single();
    if (!target) return { success: false, message: "신고 대상을 찾을 수 없습니다." };

    // 같은 사용자의 같은 대상 재신고는 유니크 제약이 차단 — 멱등 no-op (AC)
    const { error: insertError } = await admin.from("reports").insert({
      target_type: targetType,
      target_id: targetId,
      reporter_anon_id: anonId,
      reason,
    });
    if (insertError?.code === PG_UNIQUE_VIOLATION) {
      return { success: true, message: "이미 신고가 접수되어 있습니다." };
    }
    if (insertError) {
      return { success: false, message: `신고에 실패했습니다: ${insertError.message}` };
    }

    const { newCount, hide } = applyReport(target.report_count, reportThreshold(targetType));
    const { error: updateError } = await admin
      .from(table)
      .update({ report_count: newCount, ...(hide ? { hidden: true } : {}) })
      .eq("id", targetId);
    if (updateError) {
      return { success: false, message: `신고 반영에 실패했습니다: ${updateError.message}` };
    }

    if (hide && !target.hidden) {
      await notifyModeration(targetType, targetId);
    }

    return { success: true, message: "신고가 접수되었습니다." };
  });
}
