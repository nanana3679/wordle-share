"use client";

import { useState } from "react";
import { Check, ChevronDown, Plus, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import {
  MAX_CATEGORY_NAME_LENGTH,
  MAX_TAGS_PER_WORD,
  validateCategoryName,
} from "@/lib/deckCategories";

interface TagPickerProps {
  categories: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  onCreateCategory: (name: string) => boolean;
  disabled?: boolean;
}

export function TagPicker({
  categories,
  selected,
  onChange,
  onCreateCategory,
  disabled,
}: TagPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const toggleTag = (category: string) => {
    if (selected.includes(category)) {
      onChange(selected.filter((c) => c !== category));
      return;
    }
    if (selected.length >= MAX_TAGS_PER_WORD) {
      toast.error(`태그는 단어당 최대 ${MAX_TAGS_PER_WORD}개까지 선택할 수 있습니다.`);
      return;
    }
    onChange([...selected, category]);
  };

  const handleRemove = (category: string) => {
    onChange(selected.filter((c) => c !== category));
  };

  const handleCreate = () => {
    const trimmed = search.trim();
    const validation = validateCategoryName(trimmed);
    if (!validation.isValid) {
      toast.error(validation.error ?? "카테고리 이름이 올바르지 않습니다.");
      return;
    }
    const created = onCreateCategory(trimmed);
    if (!created) return;
    if (selected.length < MAX_TAGS_PER_WORD) {
      onChange([...selected, trimmed]);
    } else {
      toast.error(`태그는 단어당 최대 ${MAX_TAGS_PER_WORD}개까지 선택할 수 있습니다.`);
    }
    setSearch("");
  };

  const normalizedSearch = search.trim();
  const exactMatch = categories.some(
    (c) => c.toLowerCase() === normalizedSearch.toLowerCase()
  );
  const canCreate =
    normalizedSearch.length > 0 &&
    !exactMatch &&
    normalizedSearch.length <= MAX_CATEGORY_NAME_LENGTH;

  return (
    <div className="flex flex-wrap items-center gap-1">
      {selected.map((tag) => (
        <button
          key={tag}
          type="button"
          onClick={() => handleRemove(tag)}
          className="inline-flex items-center gap-1 rounded-full bg-secondary text-secondary-foreground px-2 py-0.5 text-xs hover:bg-secondary/80"
          aria-label={`${tag} 태그 제거`}
        >
          {tag}
          <X className="size-3" />
        </button>
      ))}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            className={cn(
              "h-7 gap-1 px-2 text-xs text-muted-foreground",
              selected.length === 0 && "border-dashed"
            )}
          >
            {selected.length === 0 ? "카테고리 선택" : "추가"}
            <ChevronDown className="size-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          sideOffset={4}
          className="w-[260px] p-0 sm:w-[300px]"
          onEscapeKeyDown={() => setOpen(false)}
        >
          <Command shouldFilter>
            <CommandInput
              placeholder="카테고리 검색..."
              value={search}
              onValueChange={setSearch}
              maxLength={MAX_CATEGORY_NAME_LENGTH}
            />
            <CommandList>
              <CommandEmpty>일치하는 카테고리가 없습니다.</CommandEmpty>
              {categories.length > 0 && (
                <CommandGroup heading="카테고리">
                  {categories.map((category) => {
                    const isSelected = selected.includes(category);
                    return (
                      <CommandItem
                        key={category}
                        value={category}
                        onSelect={() => toggleTag(category)}
                        className="flex items-center gap-2"
                      >
                        <span
                          className={cn(
                            "flex size-4 items-center justify-center rounded border",
                            isSelected
                              ? "bg-primary text-primary-foreground border-primary"
                              : "border-muted-foreground/40"
                          )}
                        >
                          {isSelected && <Check className="size-3" />}
                        </span>
                        <span className="flex-1 truncate">{category}</span>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              )}
              {canCreate && (
                <>
                  <CommandSeparator />
                  <CommandGroup>
                    <CommandItem
                      value={`__create__${normalizedSearch}`}
                      onSelect={handleCreate}
                    >
                      <Plus className="size-3.5" />
                      <span>
                        &ldquo;{normalizedSearch}&rdquo; 새 카테고리로 추가
                      </span>
                    </CommandItem>
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
