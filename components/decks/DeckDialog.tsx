"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { nanoid } from "nanoid";
import { createDeck, createAnonymousDeck, updateDeck } from "@/app/actions/deck";
import { Deck } from "@/types/decks";
import { uploadDeckThumbnail } from "@/app/actions/storage";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getScriptAdapter, isSupportedScript } from "@/lib/scripts";
import type { ScriptId } from "@/lib/scripts/types";
import { toast } from "sonner";
import { Sparkles, Upload, X, Image as ImageIcon } from "lucide-react";
import Image from "next/image";
import { actionWithToast } from "@/lib/action-with-toast";
import { CategoryPalette } from "@/components/decks/CategoryPalette";
import { WordList } from "@/components/decks/WordList";
import type { WordRowValue } from "@/components/decks/WordRow";
import { AiImportPanel } from "@/components/decks/AiImportPanel";
import type { ParsedAiDeck } from "@/lib/parseAiDeckResponse";
import { useTranslations } from "next-intl";

interface DeckDialogProps {
  deck?: Deck; // deck이 있으면 수정 모드, 없으면 생성 모드
  children: React.ReactNode;
}

type DeckFormState = {
  words: WordRowValue[];
  categories: string[];
  usesCategories: boolean;
  hiddenCategories: string[];
  hiddenWordTags: Record<string, string[]>;
};

function makeRow(word = "", tags: string[] = []): WordRowValue {
  return { id: nanoid(), word, tags };
}

function buildInitialState(deck?: Deck): DeckFormState {
  const deckWords = deck?.words ?? [];
  const deckCategories = deck?.categories ?? [];
  const hasAnyTag = deckWords.some((w) => (w.tags?.length ?? 0) > 0);
  const usesCategories = deckCategories.length > 0 || hasAnyTag;

  const rows: WordRowValue[] =
    deckWords.length > 0
      ? deckWords.map((w) => makeRow(w.word, w.tags ?? []))
      : [makeRow(), makeRow(), makeRow()];

  return {
    words: rows,
    categories: deckCategories,
    usesCategories,
    hiddenCategories: [],
    hiddenWordTags: {},
  };
}

export function DeckDialog({ deck, children }: DeckDialogProps) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState(deck?.thumbnail_url || "");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [formState, setFormState] = useState<DeckFormState>(() =>
    buildInitialState(deck)
  );
  const [name, setName] = useState(deck?.name ?? "");
  const [description, setDescription] = useState(deck?.description ?? "");
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const initialScript: ScriptId =
    deck?.script && isSupportedScript(deck.script) ? deck.script : "latin";
  const [script, setScript] = useState<ScriptId>(initialScript);
  const adapter = useMemo(() => getScriptAdapter(script), [script]);
  const t = useTranslations("Deck.dialog");
  const tCommon = useTranslations("Common.buttons");
  const tScripts = useTranslations("Game.scripts");
  const charDescription = tScripts(`${adapter.id}.charDescription`);

  const isEditMode = !!deck;
  const isAnonymousCreate = !isEditMode && !isAuthenticated;
  const title = isEditMode
    ? t("title.edit")
    : isAnonymousCreate
      ? t("title.anon")
      : t("title.create");
  const submitButtonText = isEditMode ? t("submit.edit") : t("submit.create");
  const loadingText = isEditMode ? t("submit.editing") : t("submit.creating");

  // 다이얼로그를 다시 열 때 폼 상태 초기화
  useEffect(() => {
    if (open) {
      setFormState(buildInitialState(deck));
      setThumbnailUrl(deck?.thumbnail_url || "");
      setSelectedFile(null);
      setPreviewUrl("");
      setName(deck?.name ?? "");
      setDescription(deck?.description ?? "");
      setAiPanelOpen(false);
      setScript(
        deck?.script && isSupportedScript(deck.script) ? deck.script : "latin",
      );
    }
  }, [open, deck]);

  // 미리보기 URL 정리
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const usageCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const row of formState.words) {
      for (const tag of row.tags) {
        map[tag] = (map[tag] ?? 0) + 1;
      }
    }
    return map;
  }, [formState.words]);

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error(t("errors.imageOnly"));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error(t("errors.imageSize"));
      return;
    }

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleRemoveImage = () => {
    setThumbnailUrl("");
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl("");
    }
  };

  const updateRow = useCallback((id: string, next: Partial<WordRowValue>) => {
    setFormState((prev) => ({
      ...prev,
      words: prev.words.map((row) => (row.id === id ? { ...row, ...next } : row)),
    }));
  }, []);

  const addRow = useCallback((afterId?: string) => {
    setFormState((prev) => {
      const newRow = makeRow();
      if (!afterId) {
        return { ...prev, words: [...prev.words, newRow] };
      }
      const idx = prev.words.findIndex((row) => row.id === afterId);
      if (idx === -1) return { ...prev, words: [...prev.words, newRow] };
      const next = [...prev.words];
      next.splice(idx + 1, 0, newRow);
      return { ...prev, words: next };
    });
  }, []);

  const removeRow = useCallback((id: string) => {
    setFormState((prev) => {
      const filtered = prev.words.filter((row) => row.id !== id);
      return {
        ...prev,
        words: filtered.length > 0 ? filtered : [makeRow()],
      };
    });
  }, []);

  const addCategory = useCallback(
    (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return false;
      if (formState.categories.includes(trimmed)) {
        toast.error(t("errors.categoryDuplicate", { name: trimmed }));
        return false;
      }
      setFormState((prev) =>
        prev.categories.includes(trimmed)
          ? prev
          : { ...prev, categories: [...prev.categories, trimmed] },
      );
      return true;
    },
    [formState.categories, t],
  );

  const renameCategory = useCallback(
    (oldName: string, newName: string) => {
      const trimmed = newName.trim();
      if (!trimmed || trimmed === oldName) return false;
      if (formState.categories.includes(trimmed)) {
        toast.error(t("errors.categoryDuplicate", { name: trimmed }));
        return false;
      }
      setFormState((prev) => {
        if (prev.categories.includes(trimmed)) return prev;
        return {
          ...prev,
          categories: prev.categories.map((c) => (c === oldName ? trimmed : c)),
          words: prev.words.map((row) => ({
            ...row,
            tags: row.tags.map((t) => (t === oldName ? trimmed : t)),
          })),
        };
      });
      return true;
    },
    [formState.categories, t],
  );

  const deleteCategory = useCallback((name: string) => {
    setFormState((prev) => ({
      ...prev,
      categories: prev.categories.filter((c) => c !== name),
      words: prev.words.map((row) => ({
        ...row,
        tags: row.tags.filter((t) => t !== name),
      })),
    }));
  }, []);

  const handleAiImport = useCallback(
    (parsed: ParsedAiDeck) => {
      // name/description: 비어있을 때만 채움
      if (parsed.name && name.trim().length === 0) setName(parsed.name);
      if (parsed.description && description.trim().length === 0) {
        setDescription(parsed.description);
      }

      setFormState((prev) => {
        // categories: 합집합 (기존 순서 유지 + 새 항목 append)
        const existingCats = new Set(prev.categories);
        const newCats = parsed.categories.filter((c) => !existingCats.has(c));
        const mergedCategories = [...prev.categories, ...newCats];

        // 끝의 빈 행 분리 (모두 제거 후 마지막에 1개만 다시 추가)
        const baseWords = [...prev.words];
        while (
          baseWords.length > 0 &&
          baseWords[baseWords.length - 1].word.trim().length === 0 &&
          baseWords[baseWords.length - 1].tags.length === 0
        ) {
          baseWords.pop();
        }

        // 정규화된 word를 키로 사용 (incoming.word와 비교 일관성)
        const byWord = new Map<string, { idx: number; row: WordRowValue }>();
        for (let i = 0; i < baseWords.length; i++) {
          const row = baseWords[i];
          const key = row.word.trim().toLowerCase();
          if (key) byWord.set(key, { idx: i, row });
        }

        const merged: WordRowValue[] = [...baseWords];
        for (const incoming of parsed.words) {
          const existing = byWord.get(incoming.word);
          if (existing) {
            const updated: WordRowValue = {
              ...existing.row,
              tags: Array.from(
                new Set([...existing.row.tags, ...incoming.tags])
              ),
            };
            merged[existing.idx] = updated;
            byWord.set(incoming.word, { idx: existing.idx, row: updated });
          } else {
            const row: WordRowValue = {
              id: nanoid(),
              word: incoming.word,
              tags: incoming.tags,
            };
            const idx = merged.length;
            merged.push(row);
            byWord.set(incoming.word, { idx, row });
          }
        }

        // 끝에 빈 행 1개 유지 (사용자가 추가 입력하기 쉽게)
        merged.push(makeRow());

        const incomingHasTags = parsed.words.some((w) => w.tags.length > 0);
        const willTurnOn =
          !prev.usesCategories &&
          (mergedCategories.length > 0 || incomingHasTags);

        if (willTurnOn) {
          // OFF → ON 자동 전환: 기존 stash 복원 (handleToggleCategories(true) 미러링)
          const restoredWords = merged.map((row) => {
            const stashed = prev.hiddenWordTags[row.id];
            if (stashed && stashed.length > 0 && row.tags.length === 0) {
              return { ...row, tags: stashed };
            }
            return row;
          });
          // 기존 hiddenCategories 중 mergedCategories에 없는 것은 복원
          const mergedSet = new Set(mergedCategories);
          const restoredCategories = [...mergedCategories];
          for (const c of prev.hiddenCategories) {
            if (!mergedSet.has(c)) {
              mergedSet.add(c);
              restoredCategories.push(c);
            }
          }
          return {
            ...prev,
            categories: restoredCategories,
            words: restoredWords,
            usesCategories: true,
            hiddenCategories: [],
            hiddenWordTags: {},
          };
        }

        return {
          ...prev,
          categories: mergedCategories,
          words: merged,
          // 이미 ON이면 그대로 유지, 아니면 OFF 유지 (stash도 그대로)
        };
      });

      const droppedCount = parsed.droppedWords.length;
      toast.success(t("messages.wordsAdded", { count: parsed.words.length }));
      if (droppedCount > 0) {
        toast.warning(t("messages.wordsDropped", { count: droppedCount }));
      }
    },
    [name, description, t]
  );

  const handleToggleCategories = useCallback((checked: boolean) => {
    setFormState((prev) => {
      if (checked) {
        // OFF -> ON: 숨겨둔 값 복원
        const restoredWords = prev.words.map((row) => {
          const stashed = prev.hiddenWordTags[row.id];
          if (stashed && stashed.length > 0) {
            return { ...row, tags: stashed };
          }
          return row;
        });
        return {
          ...prev,
          usesCategories: true,
          categories:
            prev.categories.length > 0 ? prev.categories : prev.hiddenCategories,
          hiddenCategories: [],
          hiddenWordTags: {},
          words: restoredWords,
        };
      }
      // ON -> OFF: 보존
      const stash: Record<string, string[]> = {};
      const cleared = prev.words.map((row) => {
        if (row.tags.length > 0) stash[row.id] = row.tags;
        return { ...row, tags: [] };
      });
      return {
        ...prev,
        usesCategories: false,
        hiddenCategories: prev.categories,
        hiddenWordTags: stash,
        categories: [],
        words: cleared,
      };
    });
  }, []);

  async function handleSubmit(formData: FormData) {
    setIsLoading(true);

    try {
      // 빈 행 자동 제거 + 어댑터 정규화 (latin은 lowercase + trim, 한글은 trim + NFC)
      const trimmedRows = formState.words
        .map((row) => ({ ...row, word: adapter.normalize(row.word) }))
        .filter((row) => row.word.length > 0);

      if (trimmedRows.length === 0) {
        toast.error(t("errors.minOneWord"));
        return;
      }

      const invalidRow = trimmedRows.find((row) => !adapter.isAllowedWord(row.word));
      if (invalidRow) {
        toast.error(t("errors.wordCharsOnly", { word: invalidRow.word, charDescription }));
        return;
      }

      const seen = new Set<string>();
      for (const row of trimmedRows) {
        if (seen.has(row.word)) {
          toast.error(t("errors.wordDuplicate", { word: row.word }));
          return;
        }
        seen.add(row.word);
      }

      // 카테고리 토글 ON인데 등록된 카테고리가 0개면 OFF로 전환하고 진행
      let effectiveUsesCategories = formState.usesCategories;
      if (effectiveUsesCategories && formState.categories.length === 0) {
        toast.warning(t("errors.categoriesEmpty"));
        effectiveUsesCategories = false;
      }

      const serializedWords = trimmedRows.map((row) => ({
        word: row.word,
        tags: effectiveUsesCategories ? row.tags : [],
      }));
      const serializedCategories = effectiveUsesCategories
        ? formState.categories
        : [];

      formData.set("words_json", JSON.stringify(serializedWords));
      formData.set("categories_json", JSON.stringify(serializedCategories));
      formData.set("script", script);
      formData.delete("words");

      // 익명 덱 생성: 썸네일·공개 토글 없이 바로 생성
      if (isAnonymousCreate) {
        const response = await actionWithToast(() => createAnonymousDeck(formData));
        if (!response.success) {
          toast.error(response.message || t("errors.anonCreateFailed"));
          return;
        }
        setOpen(false);
        router.refresh();
        return;
      }

      let finalThumbnailUrl = thumbnailUrl;

      // 새로 선택된 이미지가 있으면 업로드
      if (selectedFile) {
        if (isEditMode && deck) {
          // 수정 모드: 기존 deckId 사용
          const uploadResponse = await actionWithToast(
            () => uploadDeckThumbnail(selectedFile, deck.id),
            { showOnlyError: true }
          );
          if (!uploadResponse.success || !uploadResponse.data) {
            toast.error(uploadResponse.message || t("errors.imageUploadFailed"));
            return;
          }
          finalThumbnailUrl = uploadResponse.data;
        } else {
          // 생성 모드: 먼저 덱을 생성한 후 이미지 업로드
          const createResponse = await actionWithToast(
            () => createDeck(formData),
            { showOnlyError: true }
          );
          if (!createResponse.success || !createResponse.data) {
            toast.error(createResponse.message || t("errors.deckCreateFailed"));
            return;
          }

          const uploadResponse = await actionWithToast(
            () => uploadDeckThumbnail(selectedFile, createResponse.data?.id as string),
            { showOnlyError: true }
          );
          if (!uploadResponse.success || !uploadResponse.data) {
            toast.error(uploadResponse.message || t("errors.imageUploadFailed"));
            return;
          }
          finalThumbnailUrl = uploadResponse.data;

          // 이미지 URL로 덱 업데이트
          const updateFormData = new FormData();
          updateFormData.set("name", formData.get("name") as string);
          updateFormData.set("description", formData.get("description") as string);
          updateFormData.set("words_json", formData.get("words_json") as string);
          updateFormData.set("categories_json", formData.get("categories_json") as string);
          updateFormData.set("script", script);
          updateFormData.set("is_public", formData.get("is_public") as string);
          updateFormData.set("thumbnail_url", finalThumbnailUrl);

          const updateResponse = await actionWithToast(
            () => updateDeck(createResponse.data?.id as string, updateFormData)
          );
          if (!updateResponse.success) {
            toast.error(updateResponse.message || t("errors.deckUpdateGenericFailed"));
            return;
          }

          setOpen(false);
          router.refresh();
          return;
        }
      }

      // 이미지 URL을 FormData에 추가
      if (finalThumbnailUrl) {
        formData.set("thumbnail_url", finalThumbnailUrl);
      }

      if (isEditMode && deck) {
        const response = await actionWithToast(() => updateDeck(deck.id, formData));
        if (!response.success) {
          toast.error(response.message || t("errors.deckUpdateFailed"));
          return;
        }

        setTimeout(() => {
          router.refresh();
        }, 1000);
      } else if (!isEditMode) {
        const response = await actionWithToast(() => createDeck(formData));
        if (!response.success) {
          toast.error(response.message || t("errors.deckCreateFailed"));
          return;
        }

        router.refresh();
      }

      setOpen(false);
    } catch (error) {
      console.error("deck operation failed:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : isEditMode
            ? t("errors.deckUpdateFailed")
            : t("errors.deckCreateFailed");
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {isEditMode ? t("description.edit") : t("description.create")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-1">
          <form action={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t("name.label")}</Label>
              <Input
                id="name"
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("name.placeholder")}
                required
              />
            </div>

            {/* 이미지 업로드 (익명 생성은 미지원) */}
            {!isAnonymousCreate && (
              <div className="space-y-2">
                <Label>{t("thumbnail.label")}</Label>
                {thumbnailUrl || previewUrl ? (
                  <div className="relative w-full h-32 rounded-lg overflow-hidden border">
                    <Image
                      src={previewUrl || thumbnailUrl}
                      alt={t("thumbnail.alt")}
                      fill
                      sizes="(max-width: 640px) 100vw, 600px"
                      className="object-cover"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={handleRemoveImage}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                    <ImageIcon className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-2">
                      {t("thumbnail.placeholder")}
                    </p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                      id="thumbnail-upload"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById("thumbnail-upload")?.click()}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {t("thumbnail.select")}
                    </Button>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  {t("thumbnail.sizeLimit")}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="description">{t("descriptionField.label")}</Label>
              <Textarea
                id="description"
                name="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("descriptionField.placeholder")}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="script">{t("script.label")}</Label>
              <Select
                value={script}
                onValueChange={(v) => setScript(v as ScriptId)}
                disabled={isEditMode}
              >
                <SelectTrigger id="script">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="latin">{t("script.latin")}</SelectItem>
                  <SelectItem value="hangul">{t("script.hangul")}</SelectItem>
                </SelectContent>
              </Select>
              {isEditMode && (
                <p className="text-xs text-muted-foreground">
                  {t("script.lockNote")}
                </p>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <Label>{t("words.label")}</Label>
                <div className="flex items-center gap-3">
                  {script === "latin" && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setAiPanelOpen((v) => !v)}
                      aria-expanded={aiPanelOpen}
                      aria-controls="ai-import-panel"
                      className="h-8 gap-1.5 text-xs"
                    >
                      <Sparkles className="size-3.5" />
                      {aiPanelOpen ? t("ai.collapse") : t("ai.expand")}
                    </Button>
                  )}
                  <div className="flex items-center gap-2">
                    <Label
                      htmlFor="uses_categories"
                      className="text-xs text-muted-foreground"
                    >
                      {t("categoriesToggle.label")}
                    </Label>
                    <Switch
                      id="uses_categories"
                      checked={formState.usesCategories}
                      onCheckedChange={handleToggleCategories}
                    />
                  </div>
                </div>
              </div>

              {aiPanelOpen && script === "latin" && (
                <div id="ai-import-panel">
                  <AiImportPanel onImport={handleAiImport} />
                </div>
              )}

              {formState.usesCategories && (
                <CategoryPalette
                  categories={formState.categories}
                  usageCounts={usageCounts}
                  onAdd={addCategory}
                  onRename={renameCategory}
                  onDelete={deleteCategory}
                />
              )}

              <WordList
                rows={formState.words}
                categories={formState.categories}
                showCategoryPicker={formState.usesCategories}
                adapter={adapter}
                onChangeRow={updateRow}
                onAddRow={addRow}
                onRemoveRow={removeRow}
                onCreateCategory={addCategory}
              />
              <p className="text-xs text-muted-foreground pl-9">
                {t("words.rowHint")}
              </p>
            </div>

            {isAnonymousCreate ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="author_handle">{t("anon.displayNameLabel")}</Label>
                  <Input
                    id="author_handle"
                    name="author_handle"
                    placeholder={t("anon.displayNamePlaceholder")}
                    minLength={2}
                    maxLength={20}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">{t("anon.passwordLabel")}</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder={t("anon.passwordPlaceholder")}
                    minLength={4}
                    maxLength={64}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("anon.warning")}
                  </p>
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_public"
                  name="is_public"
                  defaultChecked={deck?.is_public ?? true}
                />
                <Label htmlFor="is_public">{t("isPublic.label")}</Label>
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isLoading}
              >
                {tCommon("cancel")}
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? loadingText : submitButtonText}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
