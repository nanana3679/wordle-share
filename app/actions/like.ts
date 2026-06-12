"use server";

import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase-admin";
import { safeAction } from "@/lib/safe-action";
import { ActionResponse } from "@/types/action";
import { hashIp, parseForwardedFor } from "@/lib/ip";

// IP 해시 단독 식별 좋아요 (ADR 0002). likes 테이블은 RLS 정책이 없어
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
    console.error("[like] IP_HASH_SALT 환경변수가 설정되지 않았습니다.");
    return null;
  }
  const headerStore = await headers();
  const ip =
    parseForwardedFor(headerStore.get("x-forwarded-for")) ??
    headerStore.get("x-real-ip");
  if (!ip) return null;
  return hashIp(ip, salt);
}

async function currentStatus(deckId: string, ipHash: string): Promise<LikeStatus | null> {
  const admin = createAdminClient();
  const [{ data: deck }, { data: like }] = await Promise.all([
    admin.from("decks").select("like_count").eq("id", deckId).single(),
    admin
      .from("likes")
      .select("deck_id")
      .eq("deck_id", deckId)
      .eq("ip_hash", ipHash)
      .maybeSingle(),
  ]);
  if (!deck) return null;
  return { liked: like !== null, likeCount: deck.like_count };
}

export async function getLikeStatus(deckId: string): Promise<LikeActionResponse> {
  return safeAction(async () => {
    const ipHash = await requestIpHash();
    if (!ipHash) return { success: false, message: "요청 IP를 확인할 수 없습니다." };

    const status = await currentStatus(deckId, ipHash);
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
    const ipHash = await requestIpHash();
    if (!ipHash) return { success: false, message: "요청 IP를 확인할 수 없습니다." };

    const admin = createAdminClient();

    // 신고로 가려진 덱은 좋아요 토글 차단 — 기존 좋아요 카운트는 유지 (#55)
    const { data: deck } = await admin
      .from("decks")
      .select("hidden")
      .eq("id", deckId)
      .single();
    if (!deck) return { success: false, message: "덱을 찾을 수 없습니다." };
    if (deck.hidden) {
      const status = await currentStatus(deckId, ipHash);
      return {
        success: false,
        conflict: true,
        message: "비공개 덱에는 좋아요를 누를 수 없습니다.",
        ...(status ? { data: status } : {}),
      };
    }

    if (like) {
      const { error } = await admin
        .from("likes")
        .insert({ deck_id: deckId, ip_hash: ipHash });
      if (error?.code === PG_UNIQUE_VIOLATION) {
        const status = await currentStatus(deckId, ipHash);
        return {
          success: false,
          conflict: true,
          message: "이미 추천한 IP입니다.",
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
        .eq("ip_hash", ipHash);
      if (error) {
        return { success: false, message: `좋아요 취소에 실패했습니다: ${error.message}` };
      }
    }

    // 트리거 반영 후 서버 진실을 반환 — 클라이언트가 이 값으로 동기화한다
    const status = await currentStatus(deckId, ipHash);
    if (!status) return { success: false, message: "덱을 찾을 수 없습니다." };
    return {
      success: true,
      data: status,
      message: like ? "좋아요!" : "좋아요를 취소했습니다.",
    };
  });
}
