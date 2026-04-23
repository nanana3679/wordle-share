import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { config as loadEnv } from "dotenv";

import { selectTopics } from "@/lib/ai/topic-selector";
import { AI_MODEL } from "@/lib/ai/client";
import {
  TOPIC_CATEGORIES,
  TopicsArtifactSchema,
  type TopicCategory,
  type TopicsArtifact,
} from "./schemas";

loadEnv({ path: ".env.local" });
loadEnv();

const ARTIFACTS_DIR = path.resolve("scripts/ai/artifacts");
const TOPICS_DIR = path.join(ARTIFACTS_DIR, "topics");
const RECENT_WINDOW_DAYS = 28;

function pickCategory(explicit: string | undefined, runId: string): TopicCategory {
  if (explicit) {
    if (!(TOPIC_CATEGORIES as readonly string[]).includes(explicit)) {
      throw new Error(
        `Unknown category "${explicit}". Valid options: ${TOPIC_CATEGORIES.join(", ")}`,
      );
    }
    return explicit as TopicCategory;
  }
  const hash = runId
    .split("")
    .reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) >>> 0, 0);
  return TOPIC_CATEGORIES[hash % TOPIC_CATEGORIES.length];
}

async function loadRecentTopics(): Promise<string[]> {
  if (!existsSync(TOPICS_DIR)) return [];
  const files = await readdir(TOPICS_DIR);
  const cutoff = Date.now() - RECENT_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const topics: string[] = [];

  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    try {
      const raw = JSON.parse(
        await readFile(path.join(TOPICS_DIR, file), "utf8"),
      );
      const parsed = TopicsArtifactSchema.safeParse(raw);
      if (!parsed.success) continue;
      const generatedAt = Date.parse(parsed.data.generatedAt);
      if (Number.isNaN(generatedAt) || generatedAt < cutoff) continue;
      for (const candidate of parsed.data.candidates) {
        if (candidate.status !== "rejected") {
          topics.push(candidate.topic);
        }
      }
    } catch {
      // Skip unreadable files.
    }
  }
  return topics;
}

function buildRunId(now: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}-${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}`;
}

async function main() {
  const { values } = parseArgs({
    options: {
      category: { type: "string" },
      count: { type: "string" },
    },
  });

  const now = new Date();
  const runId = buildRunId(now);
  const category = pickCategory(values.category, runId);

  const rawCount = values.count ?? "10";
  const parsedCount = Number(rawCount);
  if (!Number.isInteger(parsedCount)) {
    console.error(`--count must be an integer between 3 and 15, got "${rawCount}"`);
    process.exit(1);
  }
  const candidateCount = Math.max(3, Math.min(15, parsedCount));

  console.log(`[propose-topics] runId=${runId} category=${category} count=${candidateCount}`);

  const recentTopics = await loadRecentTopics();
  console.log(`[propose-topics] loaded ${recentTopics.length} recent topics to avoid`);

  const { candidates, trace } = await selectTopics({
    category,
    candidateCount,
    recentTopics,
    runId,
    now,
  });

  const artifact: TopicsArtifact = {
    runId,
    generatedAt: now.toISOString(),
    category,
    model: AI_MODEL,
    candidates,
  };

  TopicsArtifactSchema.parse(artifact);

  await mkdir(TOPICS_DIR, { recursive: true });
  const outputPath = path.join(TOPICS_DIR, `topics-${runId}.json`);
  await writeFile(outputPath, JSON.stringify(artifact, null, 2) + "\n", {
    encoding: "utf8",
    flag: "wx",
  });

  const tracePath = path.join(TOPICS_DIR, `topics-${runId}.trace.json`);
  await writeFile(tracePath, JSON.stringify(trace, null, 2) + "\n", {
    encoding: "utf8",
    flag: "wx",
  });

  console.log(`[propose-topics] wrote ${candidates.length} candidates to ${outputPath}`);
  console.log(
    `[propose-topics] trace: ${trace.webSearches.length} search(es), ${trace.webFetches.length} fetch(es), ${trace.usage.inputTokens}/${trace.usage.outputTokens} tokens → ${tracePath}`,
  );
  console.log('[propose-topics] Next: review the file, set `"status": "approved"` on ones you want, then run `pnpm ai:generate-decks <path>`.');
}

main().catch((err) => {
  console.error("[propose-topics] failed:", err);
  process.exit(1);
});
