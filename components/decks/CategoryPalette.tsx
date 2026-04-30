"use client";

import { useState } from "react";
import { Check, Pencil, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MAX_CATEGORY_NAME_LENGTH,
  makeValidateCategoryName,
} from "@/lib/deckCategories";
import { useTranslations } from "next-intl";

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
  const t = useTranslations("Deck.categories");
  const tCategoriesErr = useTranslations("Categories.errors");
  const validateCategoryName = makeValidateCategoryName(tCategoriesErr);

  const handleAdd = () => {
    const trimmed = draft.trim();
    const validation = validateCategoryName(trimmed);
    if (!validation.isValid) {
      toast.error(validation.error ?? t("errors.invalidName"));
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
      toast.error(validation.error ?? t("errors.invalidName"));
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
      const ok = window.confirm(t("removeWarning", { name, count: usage }));
      if (!ok) return;
    }
    onDelete(name);
  };

  return (
    <div className="space-y-2 rounded-md border bg-muted/30 p-3">
      <p className="text-xs text-muted-foreground">
        {t("hint")}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {categories.length === 0 && (
          <p className="text-xs text-muted-foreground">
            {t("empty")}
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
                  aria-label={t("saveAria")}
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
                aria-label={t("renameAria", { name: category })}
              >
                {category}
                <Pencil className="size-3 opacity-0 group-hover:opacity-60" />
              </button>
              <button
                type="button"
                onClick={() => handleDelete(category)}
                aria-label={t("deleteAria", { name: category })}
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
          placeholder={t("addPlaceholder")}
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
          {t("addButton")}
        </Button>
      </div>
    </div>
  );
}
