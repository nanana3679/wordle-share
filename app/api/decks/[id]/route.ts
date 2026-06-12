import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { verifyDeckCredentials } from "@/app/actions/deck";
import { parseWordLines, planWordSync, type DeckWordRow } from "@/lib/deckWords";
import { isSupportedScript } from "@/lib/scripts";

// PUT /api/decks/{id} — 시즌/스토리 업데이트용 멱등 단어 동기화 (ADR 0011)
// body.words를 desired 집합으로 보고 diff 적용: 신규 insert, 사라진 건 active=false.
// 같은 요청 두 번 → 두 번째는 전부 no-op (멱등성 AC).

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: deckId } = await params;

  let body: { nick?: string; password?: string; words?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, message: "JSON 본문이 필요합니다." }, { status: 400 });
  }
  if (!Array.isArray(body.words)) {
    return NextResponse.json(
      { success: false, message: "words 배열이 필요합니다." },
      { status: 400 },
    );
  }

  const credentials = await verifyDeckCredentials(
    deckId,
    String(body.nick ?? "").trim(),
    String(body.password ?? ""),
  );
  if (!credentials.success) {
    return NextResponse.json(credentials, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: deck } = await admin
    .from("decks")
    .select("script")
    .eq("id", deckId)
    .single();
  if (!deck || !isSupportedScript(deck.script)) {
    return NextResponse.json({ success: false, message: "덱을 찾을 수 없습니다." }, { status: 404 });
  }

  const parsed = parseWordLines(body.words.join("\n"), deck.script);
  if (!parsed.ok) {
    return NextResponse.json({ success: false, message: parsed.message }, { status: 400 });
  }

  const { data: existing } = await admin
    .from("words")
    .select("id, text, active")
    .eq("deck_id", deckId);
  if (!existing) {
    return NextResponse.json(
      { success: false, message: "단어 목록을 가져오는데 실패했습니다." },
      { status: 500 },
    );
  }

  const planResult = planWordSync(existing as DeckWordRow[], parsed.words);
  if (!planResult.ok) {
    // 마지막 active 제거 시도 등 invariant 위반 — 일반 경로와 동일하게 reject (AC)
    return NextResponse.json({ success: false, message: planResult.message }, { status: 400 });
  }

  const { toInsert, toReactivateIds, toDeactivateIds } = planResult.plan;
  if (toInsert.length > 0) {
    const { error } = await admin
      .from("words")
      .insert(toInsert.map((text) => ({ deck_id: deckId, text })));
    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
  }
  if (toReactivateIds.length > 0) {
    const { error } = await admin
      .from("words")
      .update({ active: true })
      .in("id", toReactivateIds);
    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
  }
  if (toDeactivateIds.length > 0) {
    const { error } = await admin
      .from("words")
      .update({ active: false })
      .in("id", toDeactivateIds);
    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
  }

  await admin
    .from("decks")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", deckId);

  return NextResponse.json({
    success: true,
    message: "덱 단어를 동기화했습니다.",
    data: {
      inserted: toInsert.length,
      reactivated: toReactivateIds.length,
      deactivated: toDeactivateIds.length,
    },
  });
}
