"use server";

import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase-admin";
import { safeAction } from "@/lib/safe-action";
import { ActionResponse } from "@/types/action";
import { getAnonUserId, getOrCreateAnonUserId } from "@/lib/anon-session";
import { hashIp, requestIpFromHeaders } from "@/lib/ip";

// 익명 세션 기준 좋아요 (#161). ip_hash는 abuse/rate-limit 보조 신호로만 저장한다.
// likes 테이블은 RLS 정책이 없어
// client direct 접근이 차단된다 — 모든 read/write는 본 server action만.

export interface LikeStatus {
  liked: boolean;
  likeCount: number;
}

/** 409(이미 추천) 대응 — conflict: true면 클라이언트는 낙관적 변경을 롤백한다 */
export type LikeActionResponse = ActionResponse<LikeStatus> & { conflict?: boolean };

const PG_UNIQUE_VIOLATION = "23505";

async function requestIpHash(): Promise<string | null> {
  const salt = process.env.IP_HASH_SALT;
  if (!salt) {
    console.warn("[like] IP_HASH_SALT 환경변수가 설정되지 않았습니다.");
    return null;
  }
  const headerStore = await headers();
  const ip = requestIpFromHeaders(headerStore);
  if (!ip) return null;
  return hashIp(ip, salt);
}

async function currentStatus(deckId: string, anonId: string | null, ipHash?: string | null): Promise<LikeStatus | null> {
  const admin = createAdminClient();
  const { data: deck } = await admin.from("decks").select("like_count").eq("id", deckId).single();
  if (!deck) return null;

  if (!anonId) return { liked: false, likeCount: deck.like_count };

  const { data: like } = await admin
    .from("likes")
    .select("deck_id")
    .eq("deck_id", deckId)
    .eq("anon_id", anonId)
    .maybeSingle();
  if (like) return { liked: true, likeCount: deck.like_count };

  // Legacy compatibility: pre-#161 likes only had ip_hash. Treat a matching legacy row
  // as liked for this request, but new writes will bind likes to anon_id.
  if (ipHash) {
    const { data: legacyLike } = await admin
      .from("likes")
      .select("deck_id")
      .eq("deck_id", deckId)
      .eq("ip_hash", ipHash)
      .is("anon_id", null)
      .maybeSingle();
    if (legacyLike) return { liked: true, likeCount: deck.like_count };
  }

  return { liked: like !== null, likeCount: deck.like_count };
}

export async function getLikeStatus(deckId: string): Promise<LikeActionResponse> {
  return safeAction(async () => {
    const anonId = await getAnonUserId();
    const ipHash = await requestIpHash();

    const status = await currentStatus(deckId, anonId, ipHash);
    if (!status) return { success: false, message: "덱을 찾을 수 없습니다." };
    return { success: true, data: status, message: "좋아요 상태를 가져왔습니다." };
  });
}

// desired 상태로 수렴시킨다 — debounce 후 마지막 상태만 전송하는 클라이언트와 짝 (#48)
export async function toggleLike(
  deckId: string,
  like: boolean,
): Promise<LikeActionResponse> {
  return safeAction(async () => {
    const anonId = await getOrCreateAnonUserId();
    if (!anonId) return { success: false, message: "세션 발급에 실패했습니다." };
    const ipHash = await requestIpHash();

    const admin = createAdminClient();

    // 신고로 가려진 덱은 좋아요 토글 차단 — 기존 좋아요 카운트는 유지 (#55)
    const { data: deck } = await admin
      .from("decks")
      .select("hidden")
      .eq("id", deckId)
      .single();
    if (!deck) return { success: false, message: "덱을 찾을 수 없습니다." };
    if (deck.hidden) {
      const status = await currentStatus(deckId, anonId, ipHash);
      return {
        success: false,
        conflict: true,
        message: "비공개 덱에는 좋아요를 누를 수 없습니다.",
        ...(status ? { data: status } : {}),
      };
    }

    if (like) {
      if (ipHash) {
        const { data: claimed, error: claimError } = await admin
          .from("likes")
          .update({ anon_id: anonId })
          .eq("deck_id", deckId)
          .eq("ip_hash", ipHash)
          .is("anon_id", null)
          .select("deck_id");
        if (claimError?.code === PG_UNIQUE_VIOLATION) {
          const status = await currentStatus(deckId, anonId, ipHash);
          return {
            success: false,
            conflict: true,
            message: "이미 추천했습니다.",
            ...(status ? { data: status } : {}),
          };
        }
        if (claimError) {
          return { success: false, message: `좋아요에 실패했습니다: ${claimError.message}` };
        }
        if (claimed && claimed.length > 0) {
          const status = await currentStatus(deckId, anonId, ipHash);
          if (!status) return { success: false, message: "덱을 찾을 수 없습니다." };
          return { success: true, data: status, message: "좋아요!" };
        }
      }

      const { error } = await admin
        .from("likes")
        .insert({ deck_id: deckId, anon_id: anonId, ip_hash: ipHash });
      if (error?.code === PG_UNIQUE_VIOLATION) {
        const status = await currentStatus(deckId, anonId, ipHash);
        return {
          success: false,
          conflict: true,
          message: "이미 추천했습니다.",
          ...(status ? { data: status } : {}),
        };
      }
      if (error) {
        return { success: false, message: `좋아요에 실패했습니다: ${error.message}` };
      }
    } else {
      const { error } = await admin
        .from("likes")
        .delete()
        .eq("deck_id", deckId)
        .eq("anon_id", anonId);
      if (error) {
        return { success: false, message: `좋아요 취소에 실패했습니다: ${error.message}` };
      }
      if (ipHash) {
        const { error: legacyError } = await admin
          .from("likes")
          .delete()
          .eq("deck_id", deckId)
          .eq("ip_hash", ipHash)
          .is("anon_id", null);
        if (legacyError) {
          return { success: false, message: `좋아요 취소에 실패했습니다: ${legacyError.message}` };
        }
      }
    }

    // 트리거 반영 후 서버 진실을 반환 — 클라이언트가 이 값으로 동기화한다
    const status = await currentStatus(deckId, anonId, ipHash);
    if (!status) return { success: false, message: "덱을 찾을 수 없습니다." };
    return {
      success: true,
      data: status,
      message: like ? "좋아요!" : "좋아요를 취소했습니다.",
    };
  });
}
