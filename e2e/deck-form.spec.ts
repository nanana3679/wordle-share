import { test, expect } from "./fixtures";

test.describe("deck form", () => {
  test("simulator submit does not submit the surrounding deck form", async ({ page }) => {
    await page.goto("/d/new");
    await page.getByLabel("덱 이름").fill("preview-only");
    await page.getByLabel("닉네임").fill("preview");
    await page.getByLabel("비밀번호 (덱 전용 PIN)").fill("previewpw");
    await page.getByLabel("단어 목록 (줄당 1개)").fill("abcde");

    await page.getByRole("button", { name: "시뮬레이션" }).click();
    await page.getByLabel("추측 단어").fill("abcde");
    await page.getByLabel("추측 단어").press("Enter");

    await expect(page).toHaveURL(/\/d\/new$/);
    await expect(page.getByText("정답!")).toBeVisible();
  });
});
