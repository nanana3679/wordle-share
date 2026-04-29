"use client";

import { useEffect, useMemo, useRef } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { WordRow, type WordRowValue } from "@/components/decks/WordRow";
import type { ScriptAdapter } from "@/lib/scripts/types";

interface WordListProps {
  rows: WordRowValue[];
  categories: string[];
  showCategoryPicker: boolean;
  adapter: ScriptAdapter;
  onChangeRow: (id: string, next: Partial<WordRowValue>) => void;
  onAddRow: (afterId?: string) => void;
  onRemoveRow: (id: string) => void;
  onCreateCategory: (name: string) => boolean;
}

export function WordList({
  rows,
  categories,
  showCategoryPicker,
  adapter,
  onChangeRow,
  onAddRow,
  onRemoveRow,
  onCreateCategory,
}: WordListProps) {
  const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map());
  const pendingFocusAfterIdRef = useRef<string | null>(null);

  // onAddRow가 부모 상태를 비동기로 갱신하므로, 보류된 포커스 대상을 ref에 저장해두고
  // 새 rows가 도착한 다음 effect에서 다음 행을 찾아 포커스한다.
  useEffect(() => {
    const afterId = pendingFocusAfterIdRef.current;
    if (!afterId) return;
    const idx = rows.findIndex((row) => row.id === afterId);
    const nextRow = idx >= 0 ? rows[idx + 1] : undefined;
    if (nextRow) {
      inputRefs.current.get(nextRow.id)?.focus();
    }
    pendingFocusAfterIdRef.current = null;
  }, [rows]);

  const duplicates = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of rows) {
      const w = adapter.normalize(row.word);
      if (!w) continue;
      counts.set(w, (counts.get(w) ?? 0) + 1);
    }
    return new Set(
      Array.from(counts.entries())
        .filter(([, count]) => count > 1)
        .map(([word]) => word)
    );
  }, [rows, adapter]);

  const handleEnter = (id: string) => {
    pendingFocusAfterIdRef.current = id;
    onAddRow(id);
  };

  return (
    <div className="space-y-2">
      <div className="space-y-2">
        {rows.map((row, index) => {
          const trimmed = adapter.normalize(row.word);
          const isDuplicate = trimmed.length > 0 && duplicates.has(trimmed);
          const hasInvalidChars =
            row.word.trim().length > 0 && !adapter.isAllowedWord(row.word.trim());

          return (
            <WordRow
              key={row.id}
              index={index}
              value={row}
              isDuplicate={isDuplicate}
              hasInvalidChars={hasInvalidChars}
              showCategoryPicker={showCategoryPicker}
              categories={categories}
              adapter={adapter}
              onChangeWord={(word) => onChangeRow(row.id, { word })}
              onChangeTags={(tags) => onChangeRow(row.id, { tags })}
              onCreateCategory={onCreateCategory}
              onRemove={() => onRemoveRow(row.id)}
              onEnter={() => handleEnter(row.id)}
              inputRef={(el) => {
                if (el) inputRefs.current.set(row.id, el);
                else inputRefs.current.delete(row.id);
              }}
            />
          );
        })}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onAddRow()}
        className="ml-9 gap-1"
      >
        <Plus className="size-4" />
        단어 추가
      </Button>
    </div>
  );
}
