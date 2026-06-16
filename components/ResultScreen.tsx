"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { DailyRoundView } from "@/app/actions/daily";

const STATE_EMOJI: Record<string, string> = {
  correct: "🟩",
  present: "🟨",
  absent: "⬛",
};

export function buildShareText(shareHeader: string, view: DailyRoundView): string {
  const score =
    view.status === "completed" ? `${view.attempts.length}/${view.maxAttempts}` : `X/${view.maxAttempts}`;
  const grid = view.attempts
    .map((attempt) => attempt.states.map((s) => STATE_EMOJI[s] ?? "⬛").join(""))
    .join("\n");
  return `${shareHeader} ${score}\n\n${grid}`;
}

interface ResultScreenProps {
  deckName: string;
  view: DailyRoundView;
  /** 전달 시 챌린지 진입 CTA 표시 — 데일리 완료가 챌린지를 잠금 해제한다 (ADR 0006) */
  deckId?: string;
}

export function ResultScreen({ deckName, view, deckId }: ResultScreenProps) {
  const t = useTranslations("game.result");
  const won = view.status === "completed";

  const handleCopy = async () => {
    const shareHeader = t("shareText", { deckName, date: view.date });
    try {
      await navigator.clipboard.writeText(buildShareText(shareHeader, view));
      toast.success(t("copySuccess"));
    } catch {
      toast.error(t("copyFailure"));
    }
  };

  return (
    <div className="space-y-3 rounded-lg border p-4 text-center">
      <p className="text-lg font-bold">{won ? t("success") : t("failure")}</p>
      {view.answer && (
        <p className="text-sm text-muted-foreground">
          {t("answerLabel")} <span className="font-semibold text-foreground">{view.answer}</span>
        </p>
      )}
      <p className="text-sm text-muted-foreground">
        {won
          ? t("attemptsCount", { current: view.attempts.length, max: view.maxAttempts })
          : t("attemptsExhausted", { max: view.maxAttempts })}
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button type="button" onClick={handleCopy}>
          {t("copyButton")}
        </Button>
        {deckId && (
          <Button asChild variant="outline">
            <Link href={`/d/${deckId}/play?mode=challenge`}>{t("challengeCta")}</Link>
          </Button>
        )}
        {deckId && (
          <Button asChild variant="outline">
            <Link href={`/d/${deckId}#comments`}>{t("viewComments")}</Link>
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">{t("nextWordUnlock")}</p>
    </div>
  );
}
