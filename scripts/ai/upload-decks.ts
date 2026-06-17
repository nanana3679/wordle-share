// 승인된 AI 덱 artifact를 public API로 업로드한다.
// 사용: BOT_NICK=bot_xxx BOT_PW=... BOT_SEED_TOKEN=... API_BASE_URL=... \
//        pnpm tsx scripts/ai/upload-decks.ts scripts/ai/artifacts/decks/decks-<runId>.json

import { readFileSync } from "node:fs";
import { DeckDraftSchema, DecksArtifactSchema, type DeckDraft } from "./schemas";
import { requireEnv } from "./shared";

interface UploadResult {
  draftId: string;
  name: string;
  ok: boolean;
  detail: string;
}

function readApprovedDrafts(artifactPath: string): DeckDraft[] {
  const raw = JSON.parse(readFileSync(artifactPath, "utf8")) as unknown;
  const decksArtifact = DecksArtifactSchema.safeParse(raw);
  if (decksArtifact.success) {
    return decksArtifact.data.drafts.filter((draft) => draft.status === "approved");
  }

  // Legacy output from scripts/ai/generate-decks.ts uses results[].draft.
  if (raw && typeof raw === "object" && Array.isArray((raw as { results?: unknown }).results)) {
    return (raw as { results: Array<{ draft?: unknown }> }).results
      .map((result) => DeckDraftSchema.safeParse(result.draft))
      .filter((result) => result.success)
      .map((result) => result.data)
      .filter((draft) => draft.status === "approved");
  }

  throw decksArtifact.error;
}

async function uploadDeck(draft: DeckDraft): Promise<UploadResult> {
  const apiBase = (process.env.API_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const response = await fetch(`${apiBase}/api/decks`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-bot-token": requireEnv("BOT_SEED_TOKEN"),
    },
    body: JSON.stringify({
      name: draft.name,
      script: "latin",
      nick: requireEnv("BOT_NICK"),
      password: requireEnv("BOT_PW"),
      words: draft.words.map((w) => w.word.toLowerCase()),
    }),
  });
  const body = (await response.json().catch(() => ({}))) as { message?: string; data?: { id?: string } };
  return {
    draftId: draft.id,
    name: draft.name,
    ok: response.ok,
    detail: response.ok ? body.data?.id ?? "created" : `${response.status} ${body.message ?? ""}`.trim(),
  };
}

async function main() {
  const artifactPath = process.argv[2];
  if (!artifactPath) {
    console.error("사용법: pnpm tsx scripts/ai/upload-decks.ts <decks-artifact.json>");
    process.exit(1);
  }

  requireEnv("BOT_SEED_TOKEN");
  requireEnv("BOT_NICK");
  requireEnv("BOT_PW");

  const approved = readApprovedDrafts(artifactPath);
  if (approved.length === 0) {
    console.error("approved 상태의 덱이 없습니다. artifact의 status를 검수하세요.");
    process.exit(1);
  }

  const results: UploadResult[] = [];
  for (const draft of approved) {
    const result = await uploadDeck(draft);
    results.push(result);
    console.log(`[upload-decks] ${draft.name}: ${result.ok ? `업로드 완료 (${result.detail})` : `업로드 실패 — ${result.detail}`}`);
  }

  if (results.some((result) => !result.ok)) process.exit(1);
}

main().catch((error) => {
  console.error("[upload-decks] 실패:", error);
  process.exit(1);
});
