"use client";

import { useState } from "react";
import { Copy, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AI_DECK_IMPORT_PROMPT } from "@/lib/aiPromptTemplate";
import {
  parseAiDeckResponse,
  type ParsedAiDeck,
} from "@/lib/parseAiDeckResponse";
import { useTranslations } from "next-intl";

interface AiImportPanelProps {
  onImport: (parsed: ParsedAiDeck) => void;
}

export function AiImportPanel({ onImport }: AiImportPanelProps) {
  const [pasted, setPasted] = useState("");
  const t = useTranslations("Deck.ai");
  const tErrors = useTranslations("Deck.ai.errors");

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(AI_DECK_IMPORT_PROMPT);
      toast.success(t("messages.promptCopied"));
    } catch {
      toast.error(t("messages.copyFailed"));
    }
  };

  const handleImport = () => {
    const trimmed = pasted.trim();
    if (!trimmed) {
      toast.error(t("messages.pasteRequired"));
      return;
    }
    const result = parseAiDeckResponse(trimmed, tErrors);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    onImport(result.data);
    setPasted("");
  };

  const handleClear = () => setPasted("");

  return (
    <div className="space-y-3 rounded-md border bg-muted/30 p-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Sparkles className="size-4 text-primary" />
        <span>{t("panelTitle")}</span>
      </div>
      <p className="text-xs text-muted-foreground">
        {t("intro")}
        {" "}
        {t("introNote")}
      </p>

      <div className="space-y-1.5">
        <Label className="text-xs">{t("promptLabel")}</Label>
        <pre className="max-h-40 overflow-auto rounded-md border bg-background p-2 font-mono text-xs whitespace-pre-wrap break-words">
          {AI_DECK_IMPORT_PROMPT}
        </pre>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleCopyPrompt}
        >
          <Copy className="mr-1.5 size-3.5" />
          {t("copyPrompt")}
        </Button>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="ai-import-paste" className="text-xs">
          {t("resultLabel")}
        </Label>
        <Textarea
          id="ai-import-paste"
          value={pasted}
          onChange={(e) => setPasted(e.target.value)}
          placeholder={t("responsePlaceholder")}
          rows={6}
          className="font-mono text-xs"
        />
        <div className="flex gap-2">
          <Button type="button" size="sm" onClick={handleImport}>
            {t("import")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={handleClear}
            disabled={pasted.length === 0}
          >
            {t("clear")}
          </Button>
        </div>
      </div>
    </div>
  );
}
