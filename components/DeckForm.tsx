"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { actionWithToast } from "@/lib/action-with-toast";
import { createDeck } from "@/app/actions/deck";
import { parseWordLines } from "@/lib/deckWords";
import { SUPPORTED_SCRIPTS } from "@/lib/scripts";
import type { ScriptId } from "@/lib/scripts/types";
import { DeckSimulator } from "@/components/DeckSimulator";
import {
  loadCachedCredentials,
  saveCachedCredentials,
  appendMyDeck,
} from "@/lib/credentialCache";

export function DeckForm() {
  const router = useRouter();
  const t = useTranslations("deck.form");
  const tValidation = useTranslations("validation.error");
  const [name, setName] = useState("");
  const [script, setScript] = useState<ScriptId>("latin");
  const [nick, setNick] = useState("");
  const [password, setPassword] = useState("");
  const [wordsText, setWordsText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSimulator, setShowSimulator] = useState(false);

  // ADR 0001: localStorage의 (nick, pw) 캐시로 폼 자동 채움
  useEffect(() => {
    const cached = loadCachedCredentials();
    if (cached) {
      setNick(cached.nick);
      setPassword(cached.password);
    }
  }, []);

  const wordsValidation = useMemo(
    () => parseWordLines(wordsText, script, { requireMin: false }),
    [wordsText, script],
  );
  const validWords = wordsValidation.ok ? wordsValidation.words : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.set("name", name);
      formData.set("script", script);
      formData.set("nick", nick);
      formData.set("password", password);
      formData.set("words_text", wordsText);

      const result = await actionWithToast(() => createDeck(formData));
      if (result.success && result.data) {
        saveCachedCredentials({ nick, password });
        appendMyDeck({ id: result.data.id, name });
        router.push(`/d/${result.data.id}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="deck-name">{t("label.name")}</Label>
        <Input
          id="deck-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
          required
        />
      </div>

      <div className="space-y-2">
        <Label>{t("label.script")}</Label>
        <Select value={script} onValueChange={(v) => setScript(v as ScriptId)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SUPPORTED_SCRIPTS.map((id) => (
              <SelectItem key={id} value={id}>
                {t(`scriptOption.${id}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="deck-nick">{t("label.nick")}</Label>
          <Input
            id="deck-nick"
            value={nick}
            onChange={(e) => setNick(e.target.value)}
            maxLength={20}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="deck-password">{t("label.password")}</Label>
          <Input
            id="deck-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={4}
            maxLength={64}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="deck-words">{t("label.words")}</Label>
        <Textarea
          id="deck-words"
          value={wordsText}
          onChange={(e) => setWordsText(e.target.value)}
          rows={10}
          placeholder={"pikachu\ncharmander\n..."}
          required
        />
        {!wordsValidation.ok && (
          <p className="text-sm text-destructive">
            {wordsValidation.invalidLines.length > 0
              ? tValidation("invalidChars", { lines: wordsValidation.invalidLines.join(", ") })
              : tValidation("minOneWord")}
          </p>
        )}
        {wordsValidation.ok && (
          <p className="text-sm text-muted-foreground">{t("hint.validWordCount", { count: validWords.length })}</p>
        )}
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={isSubmitting || validWords.length === 0}>
          {isSubmitting ? t("button.creating") : t("button.create")}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={validWords.length === 0}
          onClick={() => setShowSimulator((v) => !v)}
        >
          {t("button.simulate")}
        </Button>
      </div>

      {showSimulator && validWords.length > 0 && (
        <DeckSimulator words={validWords} script={script} />
      )}
    </form>
  );
}
