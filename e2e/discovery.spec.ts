import { test, expect, requireLiveSupabase, createDeck, uniqueDeckName } from "./fixtures";

// Scenarios 1 & 2 from issue #66: anonymous session + feed entry, and
// discovering a deck through search.
test.describe("discovery", () => {
  requireLiveSupabase();

  // Scenario 1: 익명 세션 자동 발급 → 메인 피드 진입
  test("feed renders and the first write lazily issues an anon session", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "wordledecks" })).toBeVisible();
    await expect(page.getByRole("searchbox", { name: "덱 이름 검색" })).toBeVisible();
    await expect(page.getByRole("link", { name: "새 덱" })).toBeVisible();
    await expect(page.getByRole("link", { name: "🔥 Hot" })).toBeVisible();

    // ADR 0001: no anon session until the first write/play. Browsing the feed
    // alone must not mint one.
    const hasAuthCookie = async () =>
      (await page.context().cookies()).some((c) => /sb-.*auth-token/.test(c.name));
    expect(await hasAuthCookie()).toBe(false);

    // Creating a deck is a write → getOrCreateAnonUserId() signs in anonymously.
    await createDeck(page, { name: uniqueDeckName("anon"), word: "smoketest" });
    expect(await hasAuthCookie()).toBe(true);
  });

  // Scenario 2: 검색으로 덱 발견 → 덱 상세 진입
  test("search surfaces a deck and links into its detail page", async ({ page }) => {
    const name = uniqueDeckName("search");
    const id = await createDeck(page, { name, word: "smoketest" });

    await page.goto("/");
    await page.getByRole("searchbox", { name: "덱 이름 검색" }).fill(name);
    await page.getByRole("searchbox", { name: "덱 이름 검색" }).press("Enter");

    await page.waitForURL(/\/search\?q=/);
    await page.getByText(name).first().click();

    await page.waitForURL(new RegExp(`/d/${id}(\\?|$|/)`));
    await expect(page.getByRole("link", { name: "오늘의 데일리 플레이" })).toBeVisible();
  });
});
