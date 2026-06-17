import { describe, expect, it } from "vitest";
import { feedQueryKey, mergeFeedPages, updateDeckLikeInFeedData } from "./feed-query";
import type { FeedPage } from "../app/actions/feed";

function deck(id: string, likeCount = 0, likedByMe = false) {
  return {
    id,
    name: `deck-${id}`,
    script: "latin",
    creator_id: "creator",
    creator_nick: "nick",
    image_url: null,
    like_count: likeCount,
    likedByMe,
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

  it("displays count as others baseline plus likedByMe", () => {
    const data = {
      pages: [{ decks: [deck("a"), deck("b", 7, false), deck("c", 11, true)], nextOffset: null }],
      pageParams: [0, 2],
    };

    const liked = updateDeckLikeInFeedData(data, "b", { liked: true });
    const unliked = updateDeckLikeInFeedData(data, "c", { liked: false });

    expect(liked.pages[0].decks[1]).toMatchObject({ id: "b", likedByMe: true, like_count: 8 });
    expect(unliked.pages[0].decks[2]).toMatchObject({ id: "c", likedByMe: false, like_count: 10 });
    expect(liked.pages[0].decks[0]).toBe(data.pages[0].decks[0]);
    expect(liked.pageParams).toBe(data.pageParams);
  });

  it("clamps malformed others baseline to zero", () => {
    const data = {
      pages: [{ decks: [deck("a", 0, true)], nextOffset: null }],
      pageParams: [0],
    };

    const updated = updateDeckLikeInFeedData(data, "a", { liked: false });

    expect(updated.pages[0].decks[0]).toMatchObject({
      id: "a",
      likedByMe: false,
      like_count: 0,
    });
  });
});
