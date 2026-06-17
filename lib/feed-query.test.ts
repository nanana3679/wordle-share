import { describe, expect, it } from "vitest";
import { QueryClient, type InfiniteData } from "@tanstack/react-query";
import {
  applyOptimisticDeckLikeInFeedData,
  feedQueryKey,
  mergeFeedPages,
  restoreFeedQueries,
  snapshotFeedQueries,
  updateDeckLikeInFeedData,
} from "./feed-query";
import type { FeedPage } from "../app/actions/feed";

function deck(id: string, likeCount = 0) {
  return {
    id,
    name: `deck-${id}`,
    script: "latin",
    creator_id: "creator",
    creator_nick: "nick",
    image_url: null,
    like_count: likeCount,
    likedByMe: false,
    created_at: "2026-06-17T00:00:00.000Z",
  };
}

function page(ids: string[], nextOffset: number | null): FeedPage {
  return {
    decks: ids.map((id) => deck(id)),
    nextOffset,
  };
}

describe("feed query helpers", () => {
  it("separates feed and search query keys", () => {
    expect(feedQueryKey({ sort: "hot" })).toEqual(["feed", { sort: "hot", query: null }]);
    expect(feedQueryKey({ sort: "likes", query: "blue archive" })).toEqual([
      "feed",
      { sort: "likes", query: "blue archive" },
    ]);
  });

  it("merges infinite pages without duplicating decks", () => {
    const merged = mergeFeedPages([page(["a", "b"], 2), page(["b", "c"], null)]);

    expect(merged.decks.map((deck) => deck.id)).toEqual(["a", "b", "c"]);
    expect(merged.nextOffset).toBeNull();
  });

  it("updates a deck like state inside infinite feed data", () => {
    const data = {
      pages: [page(["a", "b"], 2), page(["c"], null)],
      pageParams: [0, 2],
    };

    const updated = updateDeckLikeInFeedData(data, "b", { liked: true, count: 7 });

    expect(updated.pages[0].decks[1]).toMatchObject({ id: "b", likedByMe: true, like_count: 7 });
    expect(updated.pages[0].decks[0]).toBe(data.pages[0].decks[0]);
    expect(updated.pageParams).toBe(data.pageParams);
  });

  it("restores exact feed/search cache snapshots after optimistic updates", () => {
    const queryClient = new QueryClient();
    const feedKey = feedQueryKey({ sort: "hot" });
    const searchKey = feedQueryKey({ sort: "likes", query: "blue archive" });
    queryClient.setQueryData(feedKey, {
      pages: [{ decks: [deck("b", 7)], nextOffset: null }],
      pageParams: [0],
    });
    queryClient.setQueryData(searchKey, {
      pages: [{ decks: [deck("b", 11)], nextOffset: null }],
      pageParams: [0],
    });
    const snapshot = snapshotFeedQueries(queryClient);

    queryClient.setQueriesData<InfiniteData<FeedPage>>({ queryKey: ["feed"] }, (data) =>
      data ? applyOptimisticDeckLikeInFeedData(data, "b", true) : data,
    );
    restoreFeedQueries(queryClient, snapshot);

    expect(queryClient.getQueryData(feedKey)).toMatchObject({
      pages: [{ decks: [{ id: "b", likedByMe: false, like_count: 7 }] }],
    });
    expect(queryClient.getQueryData(searchKey)).toMatchObject({
      pages: [{ decks: [{ id: "b", likedByMe: false, like_count: 11 }] }],
    });
  });
});
