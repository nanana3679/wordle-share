"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
      toast.error(`${view.targetLength}글자를 입력해주세요.`);
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
  }, [view, ended, submitting, currentUnits, deckId, date, applyResult]);

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
        `${deckName} 챌린지 ${view.date} ${view.score}/${view.totalRounds} 🔥`,
      );
      toast.success("결과를 복사했습니다.");
    } catch {
      toast.error("클립보드 복사에 실패했습니다.");
    }
  }, [view, deckName]);

  if (gateLocked) return <GateLockedView deckId={deckId} />;
  if (loadError) return <p className="text-center text-sm text-destructive">{loadError}</p>;
  if (!view) return <p className="text-center text-sm text-muted-foreground">불러오는 중...</p>;

  if (view.endedReason === "completed") {
    return <PerfectClearScreen deckName={deckName} date={view.date} totalRounds={view.totalRounds} />;
  }

  return (
    <div className="space-y-6">
      <p className="text-center text-sm text-muted-foreground">
        라운드 {Math.min(view.currentRound + 1, view.totalRounds)} / {view.totalRounds} · 점수{" "}
        {view.score}
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
            {view.score}/{view.totalRounds} 🔥
          </p>
          {view.answer && (
            <p className="text-sm text-muted-foreground">
              막힌 단어: <span className="font-semibold text-foreground">{view.answer}</span>
            </p>
          )}
          <Button type="button" onClick={handleCopyFailed}>
            결과 복사
          </Button>
          <p className="text-xs text-muted-foreground">내일 다시 도전할 수 있습니다.</p>
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
              포기하기
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
