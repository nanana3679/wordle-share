// 덱 초안 생성 + 업로드 스크립트 (#78) — 기존 generate-decks skill의 코드화
// 사용: ANTHROPIC_API_KEY=... BOT_NICK=bot_xxx BOT_PW=... BOT_SEED_TOKEN=... \
//        pnpm ai:generate-decks <topics-artifact.json> [--dry-run]
//
// 승인(approved)된 주제마다 Claude로 단어를 추출하고(3회 재시도 후 스킵),
// POST /api/decks(bot_ nick + x-bot-token, #77)로 업로드한다.
// --dry-run이면 업로드를 생략하고 artifact만 남긴다 (검수용).

import { readFileSync } from "node:fs";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { DeckDraftSchema, TopicsArtifactSchema } from "./schemas";
import { DEFAULT_MODEL, extractJson, newRunId, requireEnv, writeArtifact } from "./shared";

const MAX_ATTEMPTS = 3;

type DeckDraft = z.infer<typeof DeckDraftSchema>;

async function generateDraft(
  client: Anthropic,
  candidate: { id: string; topic: string; description: string },
): Promise<DeckDraft | null> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const stream = client.messages.stream({
        model: DEFAULT_MODEL,
        max_tokens: 32000,
        thinking: { type: "adaptive" },
        system: [
          "너는 Wordle 덱 작성자다. 주어진 IP의 캐릭터/엔티티 이름으로 단어 덱을 만든다.",
          "규칙: 단어는 영문 a-z만 (공백·숫자·기호 금지, 로마자 표기 사용),",
          "4~10글자 위주 30~60개, 팬이면 아는 정도의 난이도, tags는 IP 내 분류축(소속/세대/역할 등).",
        ].join("\n"),
        messages: [
          {
            role: "user",
            content: [
              `IP: ${candidate.topic} — ${candidate.description}`,
              "",
              "아래 JSON 하나만 출력하라 (```json 펜스):",
              JSON.stringify(
                {
                  id: `deck-${candidate.id}`,
                  topicId: candidate.id,
                  topic: candidate.topic,
                  name: "<덱 이름 (한국어 가능)>",
                  description: "<한 줄 설명>",
                  language: "en",
                  words: [{ word: "<a-z만>", tags: ["<태그>"] }],
                  authorHandle: "TBD",
                  status: "pending",
                },
                null,
                2,
              ),
            ].join("\n"),
          },
        ],
      });
      const message = await stream.finalMessage();
      const text = message.content
        .filter((block): block is Anthropic.TextBlock => block.type === "text")
        .map((block) => block.text)
        .join("\n");
      const draft = DeckDraftSchema.parse(extractJson(text));
      if (draft.words.length < 1) throw new Error("단어 0개"); // 단어 ≥ 1 보장 (AC)
      return draft;
    } catch (error) {
      console.warn(`[generate-decks] ${candidate.id} 시도 ${attempt}/${MAX_ATTEMPTS} 실패:`, error);
    }
  }
  return null; // 3회 실패 → 스킵 (기존 파이프라인 정책)
}

async function uploadDeck(draft: DeckDraft): Promise<{ ok: boolean; detail: string }> {
  const apiBase = (process.env.API_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const response = await fetch(`${apiBase}/api/decks`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // bot_ nick은 운영자 토큰이 있어야 통과한다 (#77)
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
  return response.ok
    ? { ok: true, detail: body.data?.id ?? "created" }
    : { ok: false, detail: `${response.status} ${body.message ?? ""}` };
}

async function main() {
  const artifactPath = process.argv[2];
  if (!artifactPath) {
    console.error("사용법: pnpm ai:generate-decks <topics-artifact.json> [--dry-run]");
    process.exit(1);
  }
  const dryRun = process.argv.includes("--dry-run");
  requireEnv("ANTHROPIC_API_KEY");
  if (!dryRun) {
    // 업로드 자격증명은 LLM 호출 전에 검증 — 토큰 소비 후 실패 방지
    requireEnv("BOT_SEED_TOKEN");
    requireEnv("BOT_NICK");
    requireEnv("BOT_PW");
  }

  const topics = TopicsArtifactSchema.parse(JSON.parse(readFileSync(artifactPath, "utf8")));
  const approved = topics.candidates.filter((c) => c.status === "approved");
  if (approved.length === 0) {
    console.error("approved 상태의 주제가 없습니다. artifact의 status를 검수하세요.");
    process.exit(1);
  }

  const client = new Anthropic();
  const runId = newRunId();
  const results: Array<{ draft: DeckDraft; upload?: { ok: boolean; detail: string } }> = [];

  for (const candidate of approved) {
    console.log(`[generate-decks] ${candidate.topic} 단어 추출 중...`);
    const draft = await generateDraft(client, candidate);
    if (!draft) {
      console.warn(`[generate-decks] ${candidate.id} 스킵 (${MAX_ATTEMPTS}회 실패)`);
      continue;
    }
    if (dryRun) {
      results.push({ draft });
      continue;
    }
    const upload = await uploadDeck(draft);
    console.log(
      `[generate-decks] ${draft.name}: ${upload.ok ? `업로드 완료 (${upload.detail})` : `업로드 실패 — ${upload.detail}`}`,
    );
    results.push({ draft, upload });
  }

  writeArtifact(`scripts/ai/artifacts/decks/decks-${runId}.json`, {
    runId,
    generatedAt: new Date().toISOString(),
    sourceArtifact: artifactPath,
    model: DEFAULT_MODEL,
    dryRun,
    results,
  });
}

main().catch((error) => {
  console.error("[generate-decks] 실패:", error);
  process.exit(1);
});
