"use client";

import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TagPicker } from "@/components/decks/TagPicker";
import { cn } from "@/lib/utils";

export interface WordRowValue {
  id: string;
  word: string;
  tags: string[];
}

interface WordRowProps {
  value: WordRowValue;
  index: number;
  isDuplicate: boolean;
  hasInvalidChars: boolean;
  showCategoryPicker: boolean;
  categories: string[];
  onChangeWord: (word: string) => void;
  onChangeTags: (tags: string[]) => void;
  onCreateCategory: (name: string) => boolean;
  onRemove: () => void;
  onEnter: () => void;
  inputRef?: (el: HTMLInputElement | null) => void;
}

export function WordRow({
  value,
  index,
  isDuplicate,
  hasInvalidChars,
  showCategoryPicker,
  categories,
  onChangeWord,
  onChangeTags,
  onCreateCategory,
  onRemove,
  onEnter,
  inputRef,
}: WordRowProps) {
  const hasError = hasInvalidChars || isDuplicate;
  const errorId = `word-row-${value.id}-error`;
  return (
    <div className="space-y-1">
      <div className="flex items-start gap-2">
        <div className="flex w-7 shrink-0 items-center justify-center pt-2 text-xs text-muted-foreground tabular-nums">
          {index + 1}
        </div>
        <div className="flex flex-1 flex-wrap items-center gap-2 rounded-md border bg-background px-2 py-1.5 focus-within:ring-1 focus-within:ring-ring">
          <Input
            ref={inputRef}
            value={value.word}
            onChange={(e) => onChangeWord(e.target.value.toLowerCase())}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onEnter();
              }
            }}
            placeholder="단어 (a-z)"
            autoComplete="off"
            spellCheck={false}
            className={cn(
              "h-7 flex-1 min-w-[120px] border-0 bg-transparent px-1 shadow-none focus-visible:ring-0",
              hasError && "text-destructive"
            )}
            aria-invalid={hasError}
            aria-describedby={hasError ? errorId : undefined}
          />
          {showCategoryPicker && (
            <TagPicker
              categories={categories}
              selected={value.tags}
              onChange={onChangeTags}
              onCreateCategory={onCreateCategory}
            />
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onRemove}
          aria-label={`${index + 1}번째 단어 삭제`}
          className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
        >
          <X className="size-4" />
        </Button>
      </div>
      {hasError && (
        <p id={errorId} className="pl-9 text-xs text-destructive">
          {hasInvalidChars && "영문자(a-z)만 사용할 수 있습니다."}
          {hasInvalidChars && isDuplicate && " "}
          {isDuplicate && "중복된 단어입니다."}
        </p>
      )}
    </div>
  );
}
