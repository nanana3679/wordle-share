import {
  test,
  expect,
  requireLiveSupabase,
  createDeck,
  uniqueDeckName,
  typeAndSubmit,
  waitForKeyboard,
} from "./fixtures";

// Scenarios 3, 4 & 7 from issue #66: daily solve, challenge perfect-clear,
// and copying the result to the clipboard.
test.describe("gameplay", () => {
  requireLiveSupabase();

  // Scenario 3 + 7: 데일리 시작 → 풀이 완료 → 결과 클립보드 복사
  test("daily round can be solved and the result copied", async ({ page }) => {
    const id = await createDeck(page, { name: uniqueDeckName("daily"), word: "smoketest" });

    await page.goto(`/d/${id}`);
    await page.getByRole("link", { name: "오늘의 데일리 플레이" }).click();
    await page.waitForURL(/mode=daily/);

    await waitForKeyboard(page);
    await typeAndSubmit(page, "smoketest");

    await expect(page.getByText("🎉 정답!")).toBeVisible();
    await expect(page.getByText(/정답:\s*smoketest/)).toBeVisible();

    // Scenario 7: copy result → toast + clipboard payload (ResultScreen).
    await page.getByRole("button", { name: "결과 복사" }).click();
    await expect(page.getByText("결과를 복사했습니다.")).toBeVisible();

    const clipboard = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboard).toContain("데일리");
    expect(clipboard).toContain("🟩");
  });

  // Scenario 4: 챌린지 잠금 해제 → 시작 → 진행 → perfect
  test("clearing the daily unlocks a challenge that perfect-clears", async ({ page }) => {
    const id = await createDeck(page, { name: uniqueDeckName("challenge"), word: "smoketest" });

    // Daily must end before the challenge gate opens (ADR 0006).
    await page.goto(`/d/${id}/play?mode=daily`);
    await waitForKeyboard(page);
    await typeAndSubmit(page, "smoketest");
    await expect(page.getByText("🎉 정답!")).toBeVisible();

    await page.getByRole("link", { name: /챌린지 도전/ }).click();
    await page.waitForURL(/mode=challenge/);

    // One active word ⇒ a single-round run; solving it is a perfect clear.
    await waitForKeyboard(page);
    await typeAndSubmit(page, "smoketest");

    await expect(page.getByText("PERFECT CLEAR")).toBeVisible();
  });

  // Guard: visiting the challenge before the daily ends shows the locked gate.
  test("challenge is gated until the daily is completed", async ({ page }) => {
    const id = await createDeck(page, { name: uniqueDeckName("gate"), word: "smoketest" });

    await page.goto(`/d/${id}/play?mode=challenge`);

    await expect(page.getByText("오늘의 데일리를 먼저 풀어야 챌린지가 열립니다.")).toBeVisible();
    await expect(page.getByRole("link", { name: "오늘의 데일리 풀러 가기" })).toBeVisible();
  });
});
