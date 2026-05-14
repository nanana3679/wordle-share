import { nanoid } from "nanoid";

// ── 외부 타입 의존을 최소화하기 위한 로컬 타입 정의 ──────────────────────────

/** 덱 편집 폼에서 사용되는 단어 행 값 (WordRowValue 서브셋) */
export type DeckRowValue = {
  id: string;
  word: string;
  tags: string[];
};

/**
 * 덱 편집 폼의 전체 상태 스냅샷.
 * DeckDialog 내부의 DeckFormState와 구조가 동일합니다.
 */
export type DeckDraft = {
  words: DeckRowValue[];
  categories: string[];
  usesCategories: boolean;
  hiddenCategories: string[];
  hiddenWordTags: Record<string, string[]>;
};

/** AI 임포트 파이프라인이 반환하는 정규화된 결과 */
export type AiImportResult = {
  words: { word: string; tags: string[] }[];
  categories: string[];
};

/**
 * 기존 덱 초안에 AI 임포트 결과를 병합합니다.
 *
 * - 중복 단어 제거: 정규화된 값(trim + lowercase)을 키로 사용
 * - 기존 카테고리 보존 + 새 카테고리 추가 (중복 없이)
 * - 태그 합집합 유지
 * - usesCategories OFF → ON 자동 전환 시 숨겨진 stash 복원
 *
 * @param existing  현재 폼 상태 스냅샷
 * @param imported  AI 파싱 결과 (parseAiDeckResponse 출력)
 * @returns 병합된 새 DeckDraft (불변 — 원본을 수정하지 않음)
 */
export function mergeDeckImport(
  existing: DeckDraft,
  imported: AiImportResult,
): DeckDraft {
  // ── 1. 카테고리: 기존 순서 유지 + 새 항목 append ─────────────────────────
  const existingCats = new Set(existing.categories);
  const newCats = imported.categories.filter((c) => !existingCats.has(c));
  const mergedCategories = [...existing.categories, ...newCats];

  // 단어 정규화 키 함수 (trim + lowercase)
  const normalizeKey = (w: string) => w.trim().toLowerCase();

  // ── 2. 끝의 빈 행 제거 후, 중간 연속 빈 행도 하나로 축소 ──────────────────
  const allWords = [...existing.words];
  // 끝의 빈 행 제거
  while (
    allWords.length > 0 &&
    allWords[allWords.length - 1].word.trim().length === 0 &&
    allWords[allWords.length - 1].tags.length === 0
  ) {
    allWords.pop();
  }
  // 중간 연속 빈 행 → 1개로 축소
  const baseWords: DeckRowValue[] = [];
  let prevBlank = false;
  for (const row of allWords) {
    const isBlank = row.word.trim().length === 0 && row.tags.length === 0;
    if (isBlank && prevBlank) continue;
    baseWords.push(row);
    prevBlank = isBlank;
  }

  // ── 3. 정규화된 word를 키로 중복 검사 맵 구성 ────────────────────────────
  const byWord = new Map<string, { idx: number; row: DeckRowValue }>();
  for (let i = 0; i < baseWords.length; i++) {
    const row = baseWords[i];
    const key = normalizeKey(row.word);
    if (key) byWord.set(key, { idx: i, row });
  }

  // ── 4. 임포트 단어 병합 ──────────────────────────────────────────────────
  const merged: DeckRowValue[] = [...baseWords];
  for (const incoming of imported.words) {
    const key = normalizeKey(incoming.word);
    const existing = byWord.get(key);
    if (existing) {
      // 이미 있는 단어: tags 합집합
      const updated: DeckRowValue = {
        ...existing.row,
        tags: Array.from(new Set([...existing.row.tags, ...incoming.tags])),
      };
      merged[existing.idx] = updated;
      byWord.set(key, { idx: existing.idx, row: updated });
    } else {
      // 새 단어 추가
      const row: DeckRowValue = {
        id: nanoid(),
        word: incoming.word,
        tags: incoming.tags,
      };
      const idx = merged.length;
      merged.push(row);
      byWord.set(key, { idx, row });
    }
  }

  // ── 5. 끝에 빈 행 1개 유지 (사용자가 추가 입력하기 쉽게) ─────────────────
  merged.push({ id: nanoid(), word: "", tags: [] });

  // ── 6. usesCategories OFF → ON 자동 전환 처리 ───────────────────────────
  const incomingHasTags = imported.words.some((w) => w.tags.length > 0);
  const willTurnOn =
    !existing.usesCategories &&
    (mergedCategories.length > 0 || incomingHasTags);

  if (willTurnOn) {
    // OFF → ON: 숨겨진 stash 복원 (handleToggleCategories(true) 미러링)
    const restoredWords = merged.map((row) => {
      const stashed = existing.hiddenWordTags[row.id];
      if (stashed && stashed.length > 0 && row.tags.length === 0) {
        return { ...row, tags: stashed };
      }
      return row;
    });

    // hiddenCategories 중 mergedCategories에 없는 것도 복원
    const mergedSet = new Set(mergedCategories);
    const restoredCategories = [...mergedCategories];
    for (const c of existing.hiddenCategories) {
      if (!mergedSet.has(c)) {
        mergedSet.add(c);
        restoredCategories.push(c);
      }
    }

    return {
      ...existing,
      categories: restoredCategories,
      words: restoredWords,
      usesCategories: true,
      hiddenCategories: [],
      hiddenWordTags: {},
    };
  }

  return {
    ...existing,
    categories: mergedCategories,
    words: merged,
    // usesCategories / hiddenCategories / hiddenWordTags: 이미 ON이면 그대로, OFF면 OFF 유지
  };
}
