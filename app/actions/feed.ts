"use server";

import { createClient } from "@/lib/supabase-server";
import { safeAction } from "@/lib/safe-action";
import { ActionResponse } from "@/types/action";
import { sortByHotScore } from "@/lib/hot-score";
import { escapeLikePattern, normalizeSearchQuery } from "@/lib/search";

// 피드/검색 조회 (#76). decks SELECT는 공개 RLS라 anon 클라이언트로 충분 —
// creator_pw_hash는 화이트리스트로 제외한다.

const FEED_COLUMNS =
  "id, name, script, creator_id, creator_nick, image_url, like_count, created_at";
// Hot은 computed score라 DB 정렬 불가 — 최신 window를 가져와 서버(JS)에서 정렬한다.
// hot 점수는 recency 가중이라 오래된 덱은 어차피 하위권 → window 근사로 충분 (MVP)
const HOT_WINDOW = 200;
const DEFAULT_LIMIT = 24;

export type FeedSort = "hot" | "likes" | "new";

export interface FeedDeck {
  id: string;
  name: string;
  script: string;
  creator_id: string;
  creator_nick: string;
  image_url: string | null;
  like_count: number;
  created_at: string;
}

export interface FeedPage {
  decks: FeedDeck[];
  /** 다음 페이지 cursor — null이면 끝 */
  nextOffset: number | null;
}

export async function getFeed(input: {
  sort: FeedSort;
  offset?: number;
  limit?: number;
}): Promise<ActionResponse<FeedPage>> {
  return safeAction(async () => {
    const { sort } = input;
    const offset = Math.max(0, input.offset ?? 0);
    const limit = Math.min(48, Math.max(1, input.limit ?? DEFAULT_LIMIT));
    const supabase = await createClient();

    // hidden 덱은 모든 피드에서 제외 (AC)
    const base = supabase.from("decks").select(FEED_COLUMNS).eq("hidden", false);

    if (sort === "hot") {
      const { data, error } = await base
        .order("created_at", { ascending: false })
        .limit(HOT_WINDOW);
      if (error) return { success: false, message: `피드를 가져오는데 실패했습니다: ${error.message}` };

      const sorted = sortByHotScore(data ?? []);
      const page = sorted.slice(offset, offset + limit);
      const end = offset + page.length;
      return {
        success: true,
        data: { decks: page, nextOffset: end < sorted.length ? end : null },
        message: "피드를 가져왔습니다.",
      };
    }

    const query =
      sort === "likes"
        ? base.order("like_count", { ascending: false }).order("created_at", { ascending: false })
        : base.order("created_at", { ascending: false }).order("id", { ascending: false });

    const { data, error } = await query.range(offset, offset + limit - 1);
    if (error) return { success: false, message: `피드를 가져오는데 실패했습니다: ${error.message}` };

    const decks = data ?? [];
    return {
      success: true,
      data: {
        decks,
        nextOffset: decks.length === limit ? offset + decks.length : null,
      },
      message: "피드를 가져왔습니다.",
    };
  });
}

// 덱 이름 키워드 검색 — 단어 내용 매칭 없음 (ADR 0008)
export async function searchDecks(input: {
  q: string;
  offset?: number;
  limit?: number;
}): Promise<ActionResponse<FeedPage>> {
  return safeAction(async () => {
    const q = normalizeSearchQuery(input.q);
    if (!q) return { success: true, data: { decks: [], nextOffset: null }, message: "검색어가 비어있습니다." };

    const offset = Math.max(0, input.offset ?? 0);
    const limit = Math.min(48, Math.max(1, input.limit ?? DEFAULT_LIMIT));
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("decks")
      .select(FEED_COLUMNS)
      .eq("hidden", false)
      .ilike("name", `%${escapeLikePattern(q)}%`)
      .order("like_count", { ascending: false })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) return { success: false, message: `검색에 실패했습니다: ${error.message}` };

    const decks = data ?? [];
    return {
      success: true,
      data: {
        decks,
        nextOffset: decks.length === limit ? offset + decks.length : null,
      },
      message: "검색했습니다.",
    };
  });
}
