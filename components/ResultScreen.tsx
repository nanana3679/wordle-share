"use client";

import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { DailyRoundView } from "@/app/actions/daily";

const STATE_EMOJI: Record<string, string> = {
  correct: "🟩",
  present: "🟨",
  absent: "⬛",
};

export function buildShareText(deckName: string, view: DailyRoundView): string {
  const score =
    view.status === "completed" ? `${view.attempts.length}/${view.maxAttempts}` : `X/${view.maxAttempts}`;
  const grid = view.attempts
    .map((attempt) => attempt.states.map((s) => STATE_EMOJI[s] ?? "⬛").join(""))
    .join("\n");
  return `${deckName} 데일리 ${view.date} ${score}\n\n${grid}`;
}

interface ResultScreenProps {
  deckName: string;
  view: DailyRoundView;
  /** 전달 시 챌린지 진입 CTA 표시 — 데일리 완료가 챌린지를 잠금 해제한다 (ADR 0006) */
  deckId?: string;
}

export function ResultScreen({ deckName, view, deckId }: ResultScreenProps) {
  const won = view.status === "completed";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(buildShareText(deckName, view));
      toast.success("결과를 복사했습니다.");
    } catch {
      toast.error("클립보드 복사에 실패했습니다.");
    }
  };

  return (
    <div className="space-y-3 rounded-lg border p-4 text-center">
      <p className="text-lg font-bold">{won ? "🎉 정답!" : "아쉽네요"}</p>
      {view.answer && (
        <p className="text-sm text-muted-foreground">
          정답: <span className="font-semibold text-foreground">{view.answer}</span>
        </p>
      )}
      <p className="text-sm text-muted-foreground">
        {won ? `${view.attempts.length}/${view.maxAttempts} 시도` : `X/${view.maxAttempts}`}
      </p>
      <div className="flex justify-center gap-2">
        <Button type="button" onClick={handleCopy}>
          결과 복사
        </Button>
        {deckId && (
          <Button asChild variant="outline">
            <Link href={`/d/${deckId}/play?mode=challenge`}>🔥 챌린지 도전</Link>
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">내일 새로운 단어가 잠금 해제됩니다.</p>
    </div>
  );
}
