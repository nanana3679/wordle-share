import { defineConfig, devices } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

// Playwright (unlike Next.js) does not auto-load .env files. Load the same
// files Next reads so the live-Supabase guard (e2e/fixtures.ts) and the
// webServer below see identical env. CI provides these via secrets instead.
for (const file of [".env.local", ".env"]) {
  const path = resolve(__dirname, file);
  if (!existsSync(path)) continue;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const match = /^\s*([\w.-]+)\s*=\s*(.*)?\s*$/.exec(line);
    if (!match) continue;
    const key = match[1];
    if (process.env[key] !== undefined) continue;
    let value = (match[2] ?? "").trim();
    if (/^(['"]).*\1$/.test(value)) value = value.slice(1, -1);
    process.env[key] = value;
  }
}

// Mirror of e2e/fixtures.ts `liveSupabaseConfigured`. Without a live project the
// whole suite is skipped, so we also skip booting the dev server (it cannot
// render the feed without Supabase). Keep both predicates in sync.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const hasLiveSupabase =
  /^https?:\/\//.test(supabaseUrl) && !supabaseUrl.includes("example.supabase.co");

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  // Smoke suite is intentionally serial: anon sessions, daily locks and like
  // counters share global (deck, date) state per ADR 0006/0015.
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [["github"], ["list"]] : [["list"]],
  use: {
    baseURL,
    trace: "on-first-retry",
    locale: "ko-KR",
    // ResultScreen / PerfectClearScreen copy via navigator.clipboard (scenario 7).
    permissions: ["clipboard-read", "clipboard-write"],
    // IP-hash likes (ADR 0002) need a client IP. `next dev` does not forward one,
    // so supply a deterministic test IP for the like-persistence flow (scenario 6).
    extraHTTPHeaders: { "x-forwarded-for": "203.0.113.42" },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // Reuse a locally-running server; in CI boot a fresh one. Skipped when pointing
  // at a remote env (E2E_BASE_URL) or when Supabase is not configured.
  webServer:
    process.env.E2E_BASE_URL || !hasLiveSupabase
      ? undefined
      : {
          command: "pnpm dev",
          url: baseURL,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        },
});
