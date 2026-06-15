"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { actionWithToast } from "@/lib/action-with-toast";
import { verifyDeckCredentials, updateDeckImage, updateDeckWords, type DeckWord } from "@/app/actions/deck";
import { loadCachedCredentials, saveCachedCredentials } from "@/lib/credentialCache";
import { cn } from "@/lib/utils";

interface DeckEditFormProps {
  deckId: string;
  words: DeckWord[];
}

export function DeckEditForm({ deckId, words }: DeckEditFormProps) {
  const router = useRouter();
  const t = useTranslations("deck.form");
  const [nick, setNick] = useState("");
  const [password, setPassword] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  // 저장 전까지 보류되는 비활성화/재활성화 토글 (id 집합)
  const [toggledIds, setToggledIds] = useState<Set<string>>(new Set());
  const [addWordsText, setAddWordsText] = useState("");

  useEffect(() => {
    const cached = loadCachedCredentials();
    if (cached) {
      setNick(cached.nick);
      setPassword(cached.password);
    }
  }, []);

  const willBeActive = (word: DeckWord) =>
    toggledIds.has(word.id) ? !word.active : word.active;

  const activeAfterToggle = words.filter(willBeActive).length;

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifying(true);
    try {
      const result = await actionWithToast(
        () => verifyDeckCredentials(deckId, nick.trim(), password),
        { showOnlyError: true },
      );
      if (result.success) {
        saveCachedCredentials({ nick: nick.trim(), password });
        setUnlocked(true);
      }
    } finally {
      setVerifying(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // 재활성화 토글은 add(text 재추가)로, 비활성화 토글은 deactivateIds로 전달
      const reactivateTexts = words
        .filter((w) => toggledIds.has(w.id) && !w.active)
        .map((w) => w.text);
      const deactivateIds = words
        .filter((w) => toggledIds.has(w.id) && w.active)
        .map((w) => w.id);

      const result = await actionWithToast(() =>
        updateDeckWords({
          deckId,
          nick: nick.trim(),
          password,
          addWordsText: [addWordsText, ...reactivateTexts].join("\n"),
          deactivateIds,
        }),
      );
      if (result.success) {
        setToggledIds(new Set());
        setAddWordsText("");
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleImageSave = async () => {
    if (!imageFile) return;
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.set("deckId", deckId);
      formData.set("nick", nick.trim());
      formData.set("password", password);
      formData.set("image", imageFile);

      const result = await actionWithToast(() => updateDeckImage(formData));
      if (result.success) {
        setImageFile(null);
        router.refresh();
      }
    } finally {
      setUploadingImage(false);
    }
  };

  if (!unlocked) {
    return (
      <form onSubmit={handleVerify} className="max-w-sm space-y-4">
        <p className="text-sm text-muted-foreground">
          {t("hint.editCredentials")}
        </p>
        <div className="space-y-2">
          <Label htmlFor="edit-nick">{t("label.nick")}</Label>
          <Input id="edit-nick" value={nick} onChange={(e) => setNick(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-password">{t("label.password")}</Label>
          <Input
            id="edit-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <Button type="submit" disabled={verifying}>
          {verifying ? t("button.verifying") : t("button.verify")}
        </Button>
      </form>
    );
  }

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h2 className="text-sm font-medium">{t("hint.validWordCount", { count: words.length })}</h2>
        <ul className="space-y-1">
          {words.map((word) => {
            const active = willBeActive(word);
            return (
              <li key={word.id} className="flex items-center gap-2">
                <span className={cn("flex-1 text-sm", !active && "text-muted-foreground line-through")}>
                  {word.text}
                </span>
                {toggledIds.has(word.id) && <Badge variant="outline">{t("hint.wordChanged")}</Badge>}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setToggledIds((prev) => {
                      const next = new Set(prev);
                      if (next.has(word.id)) next.delete(word.id);
                      else next.add(word.id);
                      return next;
                    })
                  }
                >
                  {active ? t("button.deactivate") : t("button.reactivate")}
                </Button>
              </li>
            );
          })}
        </ul>
        {activeAfterToggle < 1 && (
          <p className="text-sm text-destructive">{t("error.minActiveWords")}</p>
        )}
      </section>

      <section className="space-y-2">
        <Label htmlFor="edit-add-words">{t("label.addWords")}</Label>
        <Textarea
          id="edit-add-words"
          value={addWordsText}
          onChange={(e) => setAddWordsText(e.target.value)}
          rows={4}
        />
      </section>

      <section className="space-y-2">
        <Label htmlFor="edit-image">{t("label.image")}</Label>
        <div className="flex gap-2">
          <Input
            id="edit-image"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
          />
          <Button
            type="button"
            variant="outline"
            disabled={!imageFile || uploadingImage}
            onClick={handleImageSave}
          >
            {uploadingImage ? t("button.uploadingImage") : t("button.uploadImage")}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">{t("hint.image")}</p>
      </section>

      <Button onClick={handleSave} disabled={saving || activeAfterToggle < 1}>
        {saving ? t("button.saving") : t("button.save")}
      </Button>
    </div>
  );
}
