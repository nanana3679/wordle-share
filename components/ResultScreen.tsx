"use client";

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
}

export function ResultScreen({ deckName, view }: ResultScreenProps) {
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
      <Button type="button" onClick={handleCopy}>
        결과 복사
      </Button>
      <p className="text-xs text-muted-foreground">내일 새로운 단어가 잠금 해제됩니다.</p>
    </div>
  );
}
