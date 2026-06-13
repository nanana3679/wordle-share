import { test as base, expect, type Page } from "@playwright/test";

// --- Live-Supabase guard -----------------------------------------------------
// The smoke suite drives real server actions (anon auth, daily locks, likes,
// comments) that require a live Supabase project. While the project is paused
// these specs skip instead of failing — keep this predicate in sync with the
// `hasLiveSupabase` mirror in playwright.config.ts.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const liveSupabaseConfigured =
  /^https?:\/\//.test(supabaseUrl) && !supabaseUrl.includes("example.supabase.co");

export const test = base;
export { expect };

/** Skip every test in the enclosing describe when no live Supabase is wired. */
export function requireLiveSupabase(): void {
  test.skip(
    !liveSupabaseConfigured,
    "requires a live Supabase project (T10c: project paused — see e2e/README.md)",
  );
}

let deckSeq = 0;

/** Collision-resistant deck name so search (scenario 2) finds exactly one. */
export function uniqueDeckName(label: string): string {
  deckSeq += 1;
  return `e2e-${label}-${Date.now()}-${deckSeq}`;
}

interface CreateDeckOptions {
  name: string;
  /** Single latin word (a-z). One active word ⇒ deterministic daily target. */
  word: string;
}

/**
 * Create a latin deck through the real /d/new form and return its id.
 *
 * A one-word deck is intentional: `pickDailyWordId` does `seed % 1`, so the
 * daily/challenge target is always `word` — letting the smoke tests type a
 * known answer without reading server state (ADR 0008 keeps the word off the
 * client until the round ends).
 */
export async function createDeck(page: Page, { name, word }: CreateDeckOptions): Promise<string> {
  await page.goto("/d/new");
  await page.getByLabel("덱 이름").fill(name);
  // script defaults to latin — leave the Select untouched.
  await page.getByLabel("닉네임").fill("e2e");
  await page.getByLabel("비밀번호 (덱 전용 PIN)").fill("e2epw");
  await page.getByLabel("단어 목록 (줄당 1개)").fill(word);
  await page.getByRole("button", { name: "덱 만들기" }).click();

  await page.waitForURL(/\/d\/[^/]+$/);
  const id = page.url().split("/d/")[1]?.split(/[/?#]/)[0];
  if (!id) throw new Error(`createDeck: could not parse deck id from ${page.url()}`);
  return id;
}

/**
 * Type a latin word on the on-screen keyboard and submit it.
 *
 * Keys render as uppercase single chars (lib/scripts/latin.ts). SmartKeyboard
 * also renders a dedicated ENTER button *after* the rows, so the functional
 * submit is the last "ENTER" — `.last()` avoids the row-embedded duplicate.
 */
export async function typeAndSubmit(page: Page, word: string): Promise<void> {
  for (const ch of word.toUpperCase()) {
    await page.getByRole("button", { name: ch, exact: true }).click();
  }
  await page.getByRole("button", { name: "ENTER", exact: true }).last().click();
}

/** Wait until the latin keyboard is interactive (game finished loading). */
export async function waitForKeyboard(page: Page): Promise<void> {
  await expect(page.getByRole("button", { name: "A", exact: true })).toBeVisible();
}
