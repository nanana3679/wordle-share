import { describe, expect, it } from "vitest";
import { feedQueryKey, mergeFeedPages, updateDeckLikeInFeedData } from "./feed-query";
import type { FeedPage } from "../app/actions/feed";

function page(ids: string[], nextOffset: number | null): FeedPage {
  return {
    decks: ids.map((id) => ({
      id,
      name: `deck-${id}`,
      script: "latin",
      creator_id: "creator",
      creator_nick: "nick",
      image_url: null,
      like_count: 0,
      likedByMe: false,
      created_at: "2026-06-17T00:00:00.000Z",
    })),
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
});
