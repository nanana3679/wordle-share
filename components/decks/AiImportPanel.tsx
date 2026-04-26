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

interface AiImportPanelProps {
  onImport: (parsed: ParsedAiDeck) => void;
}

export function AiImportPanel({ onImport }: AiImportPanelProps) {
  const [pasted, setPasted] = useState("");

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(AI_DECK_IMPORT_PROMPT);
      toast.success("프롬프트가 복사되었습니다");
    } catch {
      toast.error("복사에 실패했습니다. 직접 선택해 복사해주세요.");
    }
  };

  const handleImport = () => {
    const trimmed = pasted.trim();
    if (!trimmed) {
      toast.error("LLM 응답을 붙여넣어 주세요.");
      return;
    }
    const result = parseAiDeckResponse(trimmed);
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
        <span>AI로 가져오기</span>
      </div>
      <p className="text-xs text-muted-foreground">
        프롬프트를 ChatGPT/Claude/Gemini 등에 붙여 결과를 받은 뒤, 응답 전체를 아래에 붙여넣으세요.
        기존 입력은 유지되며 결과는 추가만 됩니다.
      </p>

      <div className="space-y-1.5">
        <Label className="text-xs">프롬프트</Label>
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
          프롬프트 복사
        </Button>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="ai-import-paste" className="text-xs">
          결과 붙여넣기
        </Label>
        <Textarea
          id="ai-import-paste"
          value={pasted}
          onChange={(e) => setPasted(e.target.value)}
          placeholder='LLM 응답을 그대로 붙여넣으세요 (```json ... ``` 코드블록 포함 가능)'
          rows={6}
          className="font-mono text-xs"
        />
        <div className="flex gap-2">
          <Button type="button" size="sm" onClick={handleImport}>
            가져오기
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={handleClear}
            disabled={pasted.length === 0}
          >
            지우기
          </Button>
        </div>
      </div>
    </div>
  );
}
