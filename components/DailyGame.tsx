"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { GameBoard } from "@/components/GameBoard";
import { SmartKeyboard } from "@/components/SmartKeyboard";
import { ResultScreen } from "@/components/ResultScreen";
import {
  startDailyRound,
  submitDailyGuess,
  endDailyRound,
  type DailyActionResponse,
  type DailyRoundView,
} from "@/app/actions/daily";
import { deriveKeyStates } from "@/lib/game-keyboard";
import { getScriptAdapter } from "@/lib/scripts";
import type { ScriptId } from "@/lib/scripts/types";
import { KanaRulesHelp } from "@/components/KanaRulesHelp";

// 데일리는 client-local date 기준 (ADR 0015 — date는 보안 경계가 아님)
function localDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

interface DailyGameProps {
  deckId: string;
  deckName: string;
  script: ScriptId;
}

export function DailyGame({ deckId, deckName, script }: DailyGameProps) {
  const t = useTranslations("game");
  const adapter = useMemo(() => getScriptAdapter(script), [script]);
  const [view, setView] = useState<DailyRoundView | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [currentUnits, setCurrentUnits] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [date] = useState(localDate);

  useEffect(() => {
    let cancelled = false;
    startDailyRound(deckId, date).then((result) => {
      if (cancelled) return;
      if (result.success && result.data) setView(result.data);
      else setLoadError(result.message);
    });
    return () => {
      cancelled = true;
    };
  }, [deckId, date]);

  // conflict(다른 탭 진행) 응답은 최신 뷰로 강제 갱신한다 (ADR 0009)
  const applyResult = useCallback((result: DailyActionResponse) => {
    if (result.data) setView(result.data);
    if (!result.success) toast.error(result.message);
    else if (result.data?.status === "completed") toast.success(result.message);
  }, []);

  const finished = view !== null && view.status !== "in_progress";
  const keyStates = useMemo(
    () => (view ? deriveKeyStates(view.attempts, adapter) : {}),
    [view, adapter],
  );

  const handleKey = useCallback(
    (char: string) => {
      if (!view || finished) return;
      setCurrentUnits((prev) =>
        prev.length >= view.targetLength ? prev : [...prev, adapter.normalizeChar(char)],
      );
    },
    [view, finished, adapter],
  );

  const handleBackspace = useCallback(() => {
    setCurrentUnits((prev) => prev.slice(0, -1));
  }, []);

  const handleEnter = useCallback(async () => {
    if (!view || finished || submitting) return;
    if (currentUnits.length !== view.targetLength) {
      toast.error(t("board.inputTooShort", { count: view.targetLength }));
      return;
    }
    setSubmitting(true);
    try {
      const result = await submitDailyGuess({
        deckId,
        date,
        guess: currentUnits.join(""),
        expectedVersion: view.version,
      });
      applyResult(result);
      if (result.success || result.conflict) setCurrentUnits([]);
    } finally {
      setSubmitting(false);
    }
  }, [view, finished, submitting, currentUnits, deckId, date, applyResult, t]);

  const handleGiveUp = useCallback(async () => {
    if (!view || finished || submitting) return;
    setSubmitting(true);
    try {
      const result = await endDailyRound({ deckId, date, expectedVersion: view.version });
      applyResult(result);
    } finally {
      setSubmitting(false);
    }
  }, [view, finished, submitting, deckId, date, applyResult]);

  if (loadError) {
    return <p className="text-center text-sm text-destructive">{loadError}</p>;
  }
  if (!view) {
    return <p className="text-center text-sm text-muted-foreground">{t("loading")}</p>;
  }

  return (
    <div className="space-y-6">
      {script === "kana" && <KanaRulesHelp />}
      <GameBoard
        attempts={view.attempts}
        currentUnits={currentUnits}
        targetLength={view.targetLength}
        maxAttempts={view.maxAttempts}
        finished={finished}
        script={script}
      />

      {finished ? (
        <ResultScreen deckName={deckName} view={view} deckId={deckId} />
      ) : (
        <>
          <SmartKeyboard
            script={script}
            specialChars={view.specialChars}
            keyStates={keyStates}
            disabled={submitting}
            onKey={handleKey}
            onEnter={handleEnter}
            onBackspace={handleBackspace}
          />
          <div className="text-center">
            <Button type="button" variant="ghost" size="sm" onClick={handleGiveUp} disabled={submitting}>
              {t("challenge.giveUp")}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
