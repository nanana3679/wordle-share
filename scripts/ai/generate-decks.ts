import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import { config as loadEnv } from "dotenv";

import { buildDeck } from "@/lib/ai/deck-builder";
import { AI_MODEL, type AITrace } from "@/lib/ai/client";
import {
  DecksArtifactSchema,
  TopicsArtifactSchema,
  type DeckDraft,
  type DecksArtifact,
} from "./schemas";

loadEnv({ path: ".env.local" });
loadEnv();

const ARTIFACTS_DIR = path.resolve("scripts/ai/artifacts");
const DECKS_DIR = path.join(ARTIFACTS_DIR, "decks");

function buildRunId(now: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}-${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}`;
}

async function main() {
  const { values, positionals } = parseArgs({
    options: {
      input: { type: "string" },
    },
    allowPositionals: true,
  });

  const inputPath = values.input ?? positionals[0];
  if (!inputPath) {
    console.error(
      "Usage: pnpm ai:generate-decks <path-to-topics-artifact.json>",
    );
    process.exit(1);
  }

  const absolute = path.resolve(inputPath);
  const raw = JSON.parse(await readFile(absolute, "utf8"));
  const topicsArtifact = TopicsArtifactSchema.parse(raw);

  const approved = topicsArtifact.candidates.filter(
    (c) => c.status === "approved",
  );

  if (approved.length === 0) {
    console.error(
      `[generate-decks] no approved topics found in ${absolute}. Edit the file to set "status": "approved" on the ones you want, then re-run.`,
    );
    process.exit(1);
  }

  console.log(
    `[generate-decks] building decks for ${approved.length} approved topic(s) from run ${topicsArtifact.runId}`,
  );

  const now = new Date();
  const runId = buildRunId(now);
  const drafts: DeckDraft[] = [];
  const traces: Array<{ draftId: string; topic: string; trace: AITrace }> = [];

  for (let i = 0; i < approved.length; i++) {
    const topic = approved[i];
    console.log(`[generate-decks] (${i + 1}/${approved.length}) topic="${topic.topic}"`);
    try {
      const { draft, trace } = await buildDeck({ topic, runId, index: i });
      drafts.push(draft);
      traces.push({ draftId: draft.id, topic: draft.topic, trace });
      const preview = draft.words.slice(0, 5).map((w) => w.word).join(", ");
      const allTags = new Set<string>();
      for (const w of draft.words) w.tags.forEach((t) => allTags.add(t));
      console.log(
        `  ✓ ${draft.words.length} words (${allTags.size} unique tags), ${trace.webSearches.length} search(es), ${trace.webFetches.length} fetch(es): ${preview}…`,
      );
    } catch (err) {
      console.error(`  ✗ failed: ${(err as Error).message}`);
    }
  }

  if (drafts.length === 0) {
    console.error("[generate-decks] all topics failed — nothing to write");
    process.exit(1);
  }

  const artifact: DecksArtifact = {
    runId,
    generatedAt: now.toISOString(),
    model: AI_MODEL,
    sourceTopicsRunId: topicsArtifact.runId,
    drafts,
  };

  DecksArtifactSchema.parse(artifact);

  await mkdir(DECKS_DIR, { recursive: true });
  const outputPath = path.join(DECKS_DIR, `decks-${runId}.json`);
  await writeFile(outputPath, JSON.stringify(artifact, null, 2) + "\n", {
    encoding: "utf8",
    flag: "wx",
  });

  const tracePath = path.join(DECKS_DIR, `decks-${runId}.trace.json`);
  await writeFile(
    tracePath,
    JSON.stringify({ runId, generatedAt: now.toISOString(), drafts: traces }, null, 2) + "\n",
    { encoding: "utf8", flag: "wx" },
  );

  console.log(`[generate-decks] wrote ${drafts.length} draft deck(s) to ${outputPath}`);
  console.log(`[generate-decks] trace: ${tracePath}`);
  console.log('[generate-decks] Next: review the file, edit words/name/description as needed, set `"status": "approved"` on the keepers, then upload manually (익명 덱 작성 기능이 추가되면 업로드 스크립트 연결).');
}

main().catch((err) => {
  console.error("[generate-decks] failed:", err);
  process.exit(1);
});
