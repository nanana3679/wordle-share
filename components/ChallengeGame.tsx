"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { GameBoard } from "@/components/GameBoard";
import { SmartKeyboard } from "@/components/SmartKeyboard";
import { GateLockedView } from "@/components/GateLockedView";
import { PerfectClearScreen } from "@/components/PerfectClearScreen";
import {
  startChallengeRun,
  submitChallengeGuess,
  failChallengeRun,
  type ChallengeActionResponse,
  type ChallengeRunView,
} from "@/app/actions/challenge";
import { deriveKeyStates } from "@/lib/game-keyboard";
import { getScriptAdapter } from "@/lib/scripts";
import type { ScriptId } from "@/lib/scripts/types";
import { KanaRulesHelp } from "@/components/KanaRulesHelp";

function localDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

interface ChallengeGameProps {
  deckId: string;
  deckName: string;
  script: ScriptId;
}

export function ChallengeGame({ deckId, deckName, script }: ChallengeGameProps) {
  const t = useTranslations("game.challenge");
  const tGame = useTranslations("game");
  const adapter = useMemo(() => getScriptAdapter(script), [script]);
  const [view, setView] = useState<ChallengeRunView | null>(null);
  const [gateLocked, setGateLocked] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [currentUnits, setCurrentUnits] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [date] = useState(localDate);

  useEffect(() => {
    let cancelled = false;
    startChallengeRun(deckId, date).then((result) => {
      if (cancelled) return;
      if (result.success && result.data) setView(result.data);
      else if (result.gateLocked) setGateLocked(true);
      else setLoadError(result.message);
    });
    return () => {
      cancelled = true;
    };
  }, [deckId, date]);

  const applyResult = useCallback((result: ChallengeActionResponse) => {
    if (result.data) setView(result.data);
    if (!result.success) toast.error(result.message);
    else toast.success(result.message);
  }, []);

  const ended = view !== null && view.endedReason !== null;
  const keyStates = useMemo(
    () => (view ? deriveKeyStates(view.attempts, adapter) : {}),
    [view, adapter],
  );

  const handleKey = useCallback(
    (char: string) => {
      if (!view || ended) return;
      setCurrentUnits((prev) =>
        prev.length >= view.targetLength ? prev : [...prev, adapter.normalizeChar(char)],
      );
    },
    [view, ended, adapter],
  );

  const handleBackspace = useCallback(() => {
    setCurrentUnits((prev) => prev.slice(0, -1));
  }, []);

  const handleEnter = useCallback(async () => {
    if (!view || ended || submitting) return;
    if (currentUnits.length !== view.targetLength) {
      toast.error(tGame("board.inputTooShort", { count: view.targetLength }));
      return;
    }
    setSubmitting(true);
    try {
      const result = await submitChallengeGuess({
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
  }, [view, ended, submitting, currentUnits, deckId, date, applyResult, tGame]);

  const handleGiveUp = useCallback(async () => {
    if (!view || ended || submitting) return;
    setSubmitting(true);
    try {
      const result = await failChallengeRun({ deckId, date, expectedVersion: view.version });
      applyResult(result);
    } finally {
      setSubmitting(false);
    }
  }, [view, ended, submitting, deckId, date, applyResult]);

  const handleCopyFailed = useCallback(async () => {
    if (!view) return;
    try {
      await navigator.clipboard.writeText(
        t("shareText", { deckName, date: view.date, score: view.score, total: view.totalRounds }),
      );
      toast.success(t("copySuccess"));
    } catch {
      toast.error(t("copyFailure"));
    }
  }, [view, deckName, t]);

  if (gateLocked) return <GateLockedView deckId={deckId} />;
  if (loadError) return <p className="text-center text-sm text-destructive">{loadError}</p>;
  if (!view) return <p className="text-center text-sm text-muted-foreground">{tGame("loading")}</p>;

  if (view.endedReason === "completed") {
    return <PerfectClearScreen deckName={deckName} date={view.date} totalRounds={view.totalRounds} />;
  }

  return (
    <div className="space-y-6">
      {script === "kana" && <KanaRulesHelp />}
      <p className="text-center text-sm text-muted-foreground">
        {t("roundCounter", {
          current: Math.min(view.currentRound + 1, view.totalRounds),
          total: view.totalRounds,
          score: view.score,
        })}
      </p>

      <GameBoard
        attempts={view.attempts}
        currentUnits={currentUnits}
        targetLength={view.targetLength}
        maxAttempts={view.maxAttempts}
        finished={ended}
      />

      {view.endedReason === "failed" ? (
        <div className="space-y-3 rounded-lg border p-4 text-center">
          <p className="text-lg font-bold">
            {t("failedTitle", { score: view.score, total: view.totalRounds })}
          </p>
          {view.answer && (
            <p className="text-sm text-muted-foreground">
              {t("blockedWordLabel")} <span className="font-semibold text-foreground">{view.answer}</span>
            </p>
          )}
          <Button type="button" onClick={handleCopyFailed}>
            {t("copyButton")}
          </Button>
          <p className="text-xs text-muted-foreground">{t("nextRetry")}</p>
        </div>
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
              {t("giveUp")}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
