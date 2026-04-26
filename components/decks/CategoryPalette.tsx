"use client";

import { useState } from "react";
import { Check, Pencil, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MAX_CATEGORY_NAME_LENGTH,
  validateCategoryName,
} from "@/lib/deckCategories";

interface CategoryPaletteProps {
  categories: string[];
  usageCounts: Record<string, number>;
  onAdd: (name: string) => boolean;
  onRename: (oldName: string, newName: string) => boolean;
  onDelete: (name: string) => void;
}

export function CategoryPalette({
  categories,
  usageCounts,
  onAdd,
  onRename,
  onDelete,
}: CategoryPaletteProps) {
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");

  const handleAdd = () => {
    const trimmed = draft.trim();
    const validation = validateCategoryName(trimmed);
    if (!validation.isValid) {
      toast.error(validation.error ?? "카테고리 이름이 올바르지 않습니다.");
      return;
    }
    if (onAdd(trimmed)) {
      setDraft("");
    }
  };

  const handleStartEdit = (name: string) => {
    setEditing(name);
    setEditingValue(name);
  };

  const commitRename = () => {
    if (!editing) return;
    const trimmed = editingValue.trim();
    if (trimmed === editing) {
      setEditing(null);
      setEditingValue("");
      return;
    }
    const validation = validateCategoryName(trimmed);
    if (!validation.isValid) {
      toast.error(validation.error ?? "카테고리 이름이 올바르지 않습니다.");
      return;
    }
    if (onRename(editing, trimmed)) {
      setEditing(null);
      setEditingValue("");
    }
  };

  const handleDelete = (name: string) => {
    const usage = usageCounts[name] ?? 0;
    if (usage > 0) {
      const ok = window.confirm(
        `"${name}" 카테고리가 ${usage}개 단어에서 제거됩니다. 계속할까요?`
      );
      if (!ok) return;
    }
    onDelete(name);
  };

  return (
    <div className="space-y-2 rounded-md border bg-muted/30 p-3">
      <p className="text-xs text-muted-foreground">
        카테고리는 단어를 분류하는 태그입니다. 각 단어에 최대 5개까지 선택할 수 있어요.
      </p>
      <div className="flex flex-wrap gap-1.5">
        {categories.length === 0 && (
          <p className="text-xs text-muted-foreground">
            아직 등록된 카테고리가 없습니다.
          </p>
        )}
        {categories.map((category) => {
          const isEditing = editing === category;
          if (isEditing) {
            return (
              <div
                key={category}
                className="inline-flex items-center gap-1 rounded-full border bg-background px-2 py-0.5"
              >
                <Input
                  autoFocus
                  value={editingValue}
                  onChange={(e) => setEditingValue(e.target.value)}
                  maxLength={MAX_CATEGORY_NAME_LENGTH}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      commitRename();
                    } else if (e.key === "Escape") {
                      e.preventDefault();
                      setEditing(null);
                      setEditingValue("");
                    }
                  }}
                  className="h-6 w-28 border-0 bg-transparent px-0 text-xs shadow-none focus-visible:ring-0"
                />
                <button
                  type="button"
                  onClick={commitRename}
                  aria-label="저장"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Check className="size-3" />
                </button>
              </div>
            );
          }
          return (
            <span
              key={category}
              className="group inline-flex items-center gap-1 rounded-full border bg-background px-2 py-0.5 text-xs"
            >
              <button
                type="button"
                onClick={() => handleStartEdit(category)}
                className="inline-flex items-center gap-1 hover:underline"
                aria-label={`${category} 이름 변경`}
              >
                {category}
                <Pencil className="size-3 opacity-0 group-hover:opacity-60" />
              </button>
              <button
                type="button"
                onClick={() => handleDelete(category)}
                aria-label={`${category} 삭제`}
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="size-3" />
              </button>
            </span>
          );
        })}
      </div>
      <div className="flex items-center gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={MAX_CATEGORY_NAME_LENGTH}
          placeholder="카테고리 추가..."
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
          className="h-8 text-sm"
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleAdd}
          disabled={draft.trim().length === 0}
        >
          추가
        </Button>
      </div>
    </div>
  );
}
