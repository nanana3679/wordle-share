import { test, expect, requireLiveSupabase } from "./fixtures";

// T11 (#56): verify the security baseline reaches the browser — the CSP header
// is present with the nonce/strict-dynamic lock, and a clean page load trips no
// CSP violations (which browsers report to the console). Skipped while Supabase
// is paused since the dev server only boots with a live project.
test.describe("security baseline", () => {
  requireLiveSupabase();

  test("home response carries the CSP + security headers", async ({ page }) => {
    const response = await page.goto("/");
    const headers = response!.headers();

    const csp = headers["content-security-policy"];
    expect(csp).toBeTruthy();
    expect(csp).toContain("'strict-dynamic'");
    expect(csp).toContain("'nonce-");
    expect(csp).not.toContain("'unsafe-inline'"); // script-src must not relax to inline
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");

    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  });

  test("a clean load raises no CSP violations in the console", async ({ page }) => {
    const violations: string[] = [];
    page.on("console", (msg) => {
      if (/content security policy/i.test(msg.text())) violations.push(msg.text());
    });

    await page.goto("/");
    await expect(page.getByRole("heading", { name: "wordledecks" })).toBeVisible();

    expect(violations).toEqual([]);
  });
});
