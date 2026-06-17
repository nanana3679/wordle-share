"use client";

import { useMemo } from "react";
import type { ScriptId } from "@/lib/scripts/types";
import type { LetterState } from "@/lib/wordleGame";
import { getScriptAdapter } from "@/lib/scripts";
import { cn } from "@/lib/utils";

// ADR 0014 hybrid rendering:
// 기본 script 알파벳은 고정 레이아웃 전체 표시(누설 0),
// 특수문자 행은 snapshot에서 derive된 키만 표시한다.

const KEY_STATE_STYLES: Record<string, string> = {
  correct: "bg-green-500 text-white",
  present: "bg-yellow-500 text-white",
  absent: "bg-gray-400 text-white",
};

interface SmartKeyboardProps {
  script: ScriptId;
  specialChars: string[];
  keyStates: Record<string, LetterState>;
  disabled?: boolean;
  onKey: (char: string) => void;
  onEnter: () => void;
  onBackspace: () => void;
}

export function SmartKeyboard({
  script,
  specialChars,
  keyStates,
  disabled = false,
  onKey,
  onEnter,
  onBackspace,
}: SmartKeyboardProps) {
  const adapter = useMemo(() => getScriptAdapter(script), [script]);

  const renderKey = (char: string) => {
    const { enterKeyId, backspaceKeyId, enterLabel } = adapter.keyboard;
    if (char === enterKeyId) {
      return (
        <button
          key={char}
          type="button"
          disabled={disabled}
          onClick={onEnter}
          className={cn("rounded bg-muted px-4 py-3 text-sm font-semibold", disabled && "opacity-50")}
        >
          {enterLabel}
        </button>
      );
    }
    if (char === backspaceKeyId) {
      return (
        <button
          key={char}
          type="button"
          disabled={disabled}
          onClick={onBackspace}
          className={cn("rounded bg-muted px-4 py-3 text-sm font-semibold", disabled && "opacity-50")}
        >
          ⌫
        </button>
      );
    }
    const state = keyStates[adapter.keyId(char)];
    return (
      <button
        key={char}
        type="button"
        disabled={disabled}
        onClick={() => onKey(char)}
        className={cn(
          "min-w-7 rounded px-1.5 py-3 text-sm font-semibold",
          state ? KEY_STATE_STYLES[state] : "bg-muted",
          disabled && "opacity-50",
        )}
      >
        {char}
      </button>
    );
  };

  return (
    <div className="space-y-1.5">
      {specialChars.length > 0 && (
        <div className="flex justify-center gap-1">{specialChars.map(renderKey)}</div>
      )}

      {adapter.keyboard.rows.map((row, i) => (
        <div key={i} className="flex justify-center gap-1">
          {row.map(renderKey)}
        </div>
      ))}

      <div className="flex justify-center gap-1">
        <button
          type="button"
          disabled={disabled}
          onClick={onBackspace}
          className={cn("rounded bg-muted px-4 py-3 text-sm font-semibold", disabled && "opacity-50")}
        >
          ⌫
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={onEnter}
          className={cn("rounded bg-muted px-4 py-3 text-sm font-semibold", disabled && "opacity-50")}
        >
          {adapter.keyboard.enterLabel}
        </button>
      </div>
    </div>
  );
}
