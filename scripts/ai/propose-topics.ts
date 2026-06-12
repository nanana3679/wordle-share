// 주제 후보 생성 스크립트 (#78) — 기존 propose-topics skill의 코드화
// 사용: ANTHROPIC_API_KEY=... pnpm ai:propose-topics [category] [count]
//
// Claude(웹 검색 포함)로 Roster-first IP 후보를 산출해
// scripts/ai/artifacts/topics/topics-<runId>.json (status: pending)으로 저장한다.
// 검수 후 status를 approved로 바꾸고 generate-decks.ts에 넘긴다.

import Anthropic from "@anthropic-ai/sdk";
import { TopicsArtifactSchema } from "./schemas";
import { DEFAULT_MODEL, extractJson, newRunId, requireEnv, writeArtifact } from "./shared";

const CATEGORIES = [
  "kpop",
  "vtuber",
  "anime-manga",
  "videogames",
  "mobile-gacha",
  "film-tv",
  "sports",
  "character-brands",
  "tabletop-rpg",
  "mythology-history",
] as const;

async function main() {
  requireEnv("ANTHROPIC_API_KEY");
  const runId = newRunId();
  const category =
    process.argv[2] ?? CATEGORIES[Math.abs(hashCode(runId)) % CATEGORIES.length];
  const count = Math.min(15, Math.max(3, Number.parseInt(process.argv[3] ?? "10", 10) || 10));

  const client = new Anthropic();
  console.log(`[propose-topics] category=${category} count=${count} model=${DEFAULT_MODEL}`);

  // 긴 출력 + 웹 검색이라 스트리밍 사용 (요청 타임아웃 방지)
  const stream = client.messages.stream({
    model: DEFAULT_MODEL,
    max_tokens: 64000,
    thinking: { type: "adaptive" },
    tools: [{ type: "web_search_20260209", name: "web_search" }],
    system: [
      "너는 Wordle 덱 공유 서비스의 IP 큐레이터다.",
      "선정 기준 (3개 모두 충족해야 함):",
      "1. 장기 안정성 — 10년 이상 살아남을 IP. 바이럴/트렌드 추종 금지.",
      "2. 10~20대 디지털 네이티브 팬덤 — 중장년 IP 금지.",
      "3. Roster-first — 50개 이상의 캐릭터/엔티티 명단 + 정기 확장 + 2개 이상의 tag axes.",
      "   이상형: 리그 오브 레전드, 포켓몬, 홀로라이브. Story-first 좁은 캐스트 IP 금지.",
      "웹 검색으로 팬덤 신호(커뮤니티 규모, 최근 활동)를 확인하고 출처를 기록하라.",
    ].join("\n"),
    messages: [
      {
        role: "user",
        content: [
          `카테고리 "${category}"에서 위 기준을 충족하는 IP 후보 ${count}개를 골라라.`,
          "",
          "최종 출력은 아래 JSON 하나만 (```json 펜스로 감싸서):",
          JSON.stringify(
            {
              runId,
              generatedAt: "<ISO8601>",
              category,
              model: DEFAULT_MODEL,
              candidates: [
                {
                  id: "<category>-<slug>",
                  topic: "<IP 이름>",
                  description: "<한 줄 설명>",
                  rationale: "<3개 기준 충족 근거>",
                  fandomSignals: ["<신호>"],
                  sources: [{ url: "<https://...>", title: "<제목>" }],
                  status: "pending",
                },
              ],
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

  let artifact;
  try {
    artifact = TopicsArtifactSchema.parse(extractJson(text));
  } catch (error) {
    console.error("[propose-topics] 응답 파싱 실패. 원본(앞 500자):", text.slice(0, 500));
    throw error;
  }
  writeArtifact(`scripts/ai/artifacts/topics/topics-${runId}.json`, artifact);
  console.log(
    `[propose-topics] 후보 ${artifact.candidates.length}개 — 검수 후 status를 approved로 바꾸고 ` +
      `'pnpm ai:generate-decks scripts/ai/artifacts/topics/topics-${runId}.json' 실행`,
  );
}

function hashCode(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0;
  }
  return hash;
}

main().catch((error) => {
  console.error("[propose-topics] 실패:", error);
  process.exit(1);
});
