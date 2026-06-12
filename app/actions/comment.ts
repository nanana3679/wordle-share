"use server";

import { createAdminClient } from "@/lib/supabase-admin";
import { safeAction } from "@/lib/safe-action";
import { ActionResponse } from "@/types/action";
import { getOrCreateAnonUserId } from "@/lib/anon-session";
import { checkThreadVisibility } from "@/lib/comment-gate";
import {
  hashPassword,
  verifyPassword,
  validateNick,
  validatePasswordLength,
  formatDisplayNick,
} from "@/lib/identity";

// 댓글의 모든 read/write/delete/report는 server action only (ADR 0007, #47).
// comments 테이블은 RLS 정책이 없어 client direct 접근이 전면 차단된다.

export interface CommentView {
  id: string;
  threadDate: string;
  displayNick: string;
  text: string;
  createdAt: string;
  isMine: boolean;
}

export interface CommentThreadsView {
  /** threadDate DESC 정렬, 각 thread 내부는 최신순 */
  threads: { date: string; comments: CommentView[] }[];
  /** 오늘 thread 잠금 여부 — 데일리 미완료 (ADR 0007 룰 2) */
  todayLocked: boolean;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const COMMENT_MAX_LENGTH = 500;

async function dailyStatusFor(
  deckId: string,
  date: string,
  anonId: string,
): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("daily_rounds")
    .select("status")
    .eq("anon_id", anonId)
    .eq("deck_id", deckId)
    .eq("date", date)
    .maybeSingle();
  return data?.status ?? null;
}

export async function getComments(
  deckId: string,
  readerToday: string,
): Promise<ActionResponse<CommentThreadsView>> {
  return safeAction(async () => {
    if (!DATE_PATTERN.test(readerToday)) {
      return { success: false, message: "날짜 형식이 올바르지 않습니다." };
    }
    const anonId = await getOrCreateAnonUserId();
    if (!anonId) return { success: false, message: "세션 발급에 실패했습니다." };

    const todayStatus = await dailyStatusFor(deckId, readerToday, anonId);
    const todayGate = checkThreadVisibility(readerToday, readerToday, todayStatus);

    const admin = createAdminClient();
    // 게이트 룰: 과거 thread 전체 + (게이트 통과 시) 오늘 thread.
    // 미래 thread(T > readerToday)는 쿼리에서부터 제외 — 무조건 차단 (룰 3)
    const maxDate = todayGate.visible ? readerToday : readerToday; // lte 기준
    let query = admin
      .from("comments")
      .select("id, thread_date, anon_id, nick, text, created_at")
      .eq("deck_id", deckId)
      .eq("deleted", false)
      .eq("hidden", false)
      .order("thread_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(200);
    query = todayGate.visible ? query.lte("thread_date", maxDate) : query.lt("thread_date", maxDate);

    const { data: rows, error } = await query;
    if (error) {
      return { success: false, message: `댓글을 가져오는데 실패했습니다: ${error.message}` };
    }

    const threads: CommentThreadsView["threads"] = [];
    for (const row of rows ?? []) {
      const view: CommentView = {
        id: row.id,
        threadDate: row.thread_date,
        displayNick: formatDisplayNick(row.nick, row.anon_id),
        text: row.text,
        createdAt: row.created_at,
        isMine: row.anon_id === anonId,
      };
      const last = threads[threads.length - 1];
      if (last && last.date === row.thread_date) last.comments.push(view);
      else threads.push({ date: row.thread_date, comments: [view] });
    }

    return {
      success: true,
      data: { threads, todayLocked: !todayGate.visible },
      message: "댓글을 가져왔습니다.",
    };
  });
}

export async function createComment(input: {
  deckId: string;
  text: string;
  nick: string;
  password: string;
  /** 작성자 client local date — thread_date로 캡처 (ADR 0007) */
  writerToday: string;
}): Promise<ActionResponse> {
  return safeAction(async () => {
    const { deckId, text, nick, password, writerToday } = input;

    if (!DATE_PATTERN.test(writerToday)) {
      return { success: false, message: "날짜 형식이 올바르지 않습니다." };
    }
    const trimmed = text.trim();
    const fieldErrors: { [key: string]: string[] } = {};
    if (!trimmed || trimmed.length > COMMENT_MAX_LENGTH) {
      fieldErrors.text = [`댓글은 1~${COMMENT_MAX_LENGTH}자여야 합니다.`];
    }
    if (!validateNick(nick.trim())) fieldErrors.nick = ["닉네임은 1~20자, '#' 없이 입력해야 합니다."];
    if (!validatePasswordLength(password)) fieldErrors.password = ["비밀번호는 4~64자여야 합니다."];
    if (Object.keys(fieldErrors).length > 0) {
      return { success: false, message: "입력값을 확인해주세요.", fieldErrors };
    }

    const anonId = await getOrCreateAnonUserId();
    if (!anonId) return { success: false, message: "세션 발급에 실패했습니다." };

    // 작성도 가시성 게이트를 통과해야 한다 (잠긴 thread에 작성 불가)
    const todayStatus = await dailyStatusFor(deckId, writerToday, anonId);
    const gate = checkThreadVisibility(writerToday, writerToday, todayStatus);
    if (!gate.visible) {
      return { success: false, message: "오늘의 데일리를 완료하면 댓글을 쓸 수 있습니다." };
    }

    const admin = createAdminClient();
    const { data: deck } = await admin.from("decks").select("id").eq("id", deckId).single();
    if (!deck) return { success: false, message: "덱을 찾을 수 없습니다." };

    const pwHash = await hashPassword(password);
    const { error } = await admin.from("comments").insert({
      deck_id: deckId,
      thread_date: writerToday,
      anon_id: anonId,
      nick: nick.trim(),
      pw_hash: pwHash,
      text: trimmed,
    });
    if (error) {
      return { success: false, message: `댓글 작성에 실패했습니다: ${error.message}` };
    }

    return { success: true, message: "댓글을 남겼습니다." };
  });
}

// nick+pw 일치 시 삭제 — 디바이스 무관 (ADR 0007). soft delete.
export async function deleteComment(input: {
  commentId: string;
  nick: string;
  password: string;
}): Promise<ActionResponse> {
  return safeAction(async () => {
    const { commentId, nick, password } = input;
    const admin = createAdminClient();

    const { data: comment } = await admin
      .from("comments")
      .select("id, nick, pw_hash, deleted")
      .eq("id", commentId)
      .single();
    if (!comment || comment.deleted) {
      return { success: false, message: "댓글을 찾을 수 없습니다." };
    }

    // enumeration 방어: 무엇이 틀렸는지 구분하지 않는다 (ADR 0001)
    const nickMatches = comment.nick === nick.trim();
    const pwMatches = await verifyPassword(password, comment.pw_hash);
    if (!nickMatches || !pwMatches) {
      return { success: false, message: "닉네임 또는 비밀번호가 올바르지 않습니다." };
    }

    const { error } = await admin
      .from("comments")
      .update({ deleted: true })
      .eq("id", commentId);
    if (error) {
      return { success: false, message: `댓글 삭제에 실패했습니다: ${error.message}` };
    }
    return { success: true, message: "댓글을 삭제했습니다." };
  });
}

// 신고 — report_count 증가만 수행. 자동 가림 임계치 처리는 T7(#50) 모더레이션 트랙.
export async function reportComment(commentId: string): Promise<ActionResponse> {
  return safeAction(async () => {
    const anonId = await getOrCreateAnonUserId();
    if (!anonId) return { success: false, message: "세션 발급에 실패했습니다." };

    const admin = createAdminClient();
    const { data: comment } = await admin
      .from("comments")
      .select("id, report_count, deleted")
      .eq("id", commentId)
      .single();
    if (!comment || comment.deleted) {
      return { success: false, message: "댓글을 찾을 수 없습니다." };
    }

    const { error } = await admin
      .from("comments")
      .update({ report_count: comment.report_count + 1 })
      .eq("id", commentId);
    if (error) {
      return { success: false, message: `신고에 실패했습니다: ${error.message}` };
    }
    return { success: true, message: "신고가 접수되었습니다." };
  });
}
