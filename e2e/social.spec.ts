import {
  test,
  expect,
  requireLiveSupabase,
  createDeck,
  uniqueDeckName,
  typeAndSubmit,
  waitForKeyboard,
} from "./fixtures";

// Scenarios 5 & 6 from issue #66: commenting (nick + pw) and liking.
test.describe("social", () => {
  requireLiveSupabase();

  // Scenario 5: 댓글 작성 (nick + pw)
  test("a comment can be posted after the daily gate opens", async ({ page }) => {
    const id = await createDeck(page, { name: uniqueDeckName("comment"), word: "smoketest" });

    // Today's thread stays locked until the reader finishes today's daily
    // (CONTEXT.md 가시성 게이트). Solve it first to reveal the comment form.
    await page.goto(`/d/${id}/play?mode=daily`);
    await waitForKeyboard(page);
    await typeAndSubmit(page, "smoketest");
    await expect(page.getByText("🎉 정답!")).toBeVisible();

    await page.goto(`/d/${id}`);

    const body = `e2e 댓글 ${Date.now()}`;
    await page.getByPlaceholder("오늘의 단어에 대해 한마디 (결과를 붙여넣어도 좋아요)").fill(body);
    await page.getByPlaceholder("닉네임").fill("e2e작성자");
    await page.getByPlaceholder("비밀번호").fill("pw1234");
    await page.getByRole("button", { name: "댓글 남기기" }).click();

    await expect(page.getByText(body)).toBeVisible();
    await expect(page.getByText(/e2e작성자#[0-9a-f]{4}/)).toBeVisible();
  });

  // Scenario 6: 좋아요 클릭 → 카운트 증가 → 새로고침 후 유지
  test("liking increments the count and persists across a reload", async ({ page }) => {
    const id = await createDeck(page, { name: uniqueDeckName("like"), word: "smoketest" });
    await page.goto(`/d/${id}`);

    // The deck detail page renders exactly one aria-pressed button (LikeButton).
    const like = page.locator("button[aria-pressed]");
    await expect(like).toHaveAttribute("aria-pressed", "false");
    await expect(like).toContainText("0");

    await like.click();
    await expect(like).toHaveAttribute("aria-pressed", "true");
    await expect(like).toContainText("1");

    await page.reload();
    const likeAfter = page.locator("button[aria-pressed]");
    await expect(likeAfter).toHaveAttribute("aria-pressed", "true");
    await expect(likeAfter).toContainText("1");
  });
});
