"use client";

import { useMemo, useRef } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { WordRow, type WordRowValue } from "@/components/decks/WordRow";

interface WordListProps {
  rows: WordRowValue[];
  categories: string[];
  showCategoryPicker: boolean;
  onChangeRow: (id: string, next: Partial<WordRowValue>) => void;
  onAddRow: (afterId?: string) => void;
  onRemoveRow: (id: string) => void;
  onCreateCategory: (name: string) => boolean;
}

export function WordList({
  rows,
  categories,
  showCategoryPicker,
  onChangeRow,
  onAddRow,
  onRemoveRow,
  onCreateCategory,
}: WordListProps) {
  const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  const duplicates = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of rows) {
      const w = row.word.trim().toLowerCase();
      if (!w) continue;
      counts.set(w, (counts.get(w) ?? 0) + 1);
    }
    return new Set(
      Array.from(counts.entries())
        .filter(([, count]) => count > 1)
        .map(([word]) => word)
    );
  }, [rows]);

  const handleEnter = (id: string) => {
    onAddRow(id);
    requestAnimationFrame(() => {
      const idx = rows.findIndex((row) => row.id === id);
      const nextRow = rows[idx + 1];
      if (nextRow) {
        inputRefs.current.get(nextRow.id)?.focus();
      }
    });
  };

  return (
    <div className="space-y-2">
      <div className="space-y-2">
        {rows.map((row, index) => {
          const trimmed = row.word.trim().toLowerCase();
          const isDuplicate = trimmed.length > 0 && duplicates.has(trimmed);
          const hasInvalidChars =
            row.word.length > 0 && !/^[a-z]*$/.test(row.word);

          return (
            <WordRow
              key={row.id}
              index={index}
              value={row}
              isDuplicate={isDuplicate}
              hasInvalidChars={hasInvalidChars}
              showCategoryPicker={showCategoryPicker}
              categories={categories}
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
