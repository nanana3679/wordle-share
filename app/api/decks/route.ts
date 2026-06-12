import { NextResponse } from "next/server";
import { createDeck } from "@/app/actions/deck";
import { isBotNick } from "@/lib/identity";

// POST /api/decks — 운영자 시드 도구의 진입점 (ADR 0011: 일반 사용자 API 도그푸딩)
// bot_* nick은 운영자 전용 — x-bot-token이 BOT_SEED_TOKEN과 일치할 때만 허용 (#77)

function botTokenValid(request: Request): boolean {
  const token = process.env.BOT_SEED_TOKEN;
  return Boolean(token) && request.headers.get("x-bot-token") === token;
}

export async function POST(request: Request) {
  let body: {
    name?: string;
    script?: string;
    nick?: string;
    password?: string;
    words?: string[];
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, message: "JSON 본문이 필요합니다." }, { status: 400 });
  }

  const nick = String(body.nick ?? "").trim();
  if (isBotNick(nick) && !botTokenValid(request)) {
    return NextResponse.json(
      { success: false, message: "bot_ prefix 닉네임은 사용할 수 없습니다." },
      { status: 400 },
    );
  }
  if (!Array.isArray(body.words)) {
    return NextResponse.json(
      { success: false, message: "words 배열이 필요합니다." },
      { status: 400 },
    );
  }

  // 서버 액션(createDeck)을 그대로 재사용 — 검증·invariant가 한 곳에 유지된다
  const formData = new FormData();
  formData.set("name", String(body.name ?? ""));
  formData.set("script", String(body.script ?? "latin"));
  formData.set("nick", nick);
  formData.set("password", String(body.password ?? ""));
  formData.set("words_text", body.words.join("\n"));

  const result = await createDeck(formData);
  return NextResponse.json(result, { status: result.success ? 201 : 400 });
}
