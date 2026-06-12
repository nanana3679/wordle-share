"use client";

import type { DailyAttemptView } from "@/app/actions/daily";
import { AttemptHistory } from "@/components/AttemptHistory";
import { cn } from "@/lib/utils";

interface GameBoardProps {
  attempts: DailyAttemptView[];
  currentUnits: string[];
  targetLength: number;
  maxAttempts: number;
  finished: boolean;
}

// 가변 격자: 열 수 = 단어 글자(unit) 수, 행 수 = maxAttempts
export function GameBoard({
  attempts,
  currentUnits,
  targetLength,
  maxAttempts,
  finished,
}: GameBoardProps) {
  const emptyRows = Math.max(
    0,
    maxAttempts - attempts.length - (finished ? 0 : 1),
  );

  return (
    <div className="space-y-1">
      <AttemptHistory attempts={attempts} />

      {!finished && (
        <div className="flex justify-center gap-1">
          {Array.from({ length: targetLength }, (_, i) => (
            <span
              key={i}
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded border-2 text-lg font-bold",
                currentUnits[i] ? "border-foreground" : "border-muted",
              )}
            >
              {currentUnits[i] ?? ""}
            </span>
          ))}
        </div>
      )}

      {Array.from({ length: emptyRows }, (_, row) => (
        <div key={row} className="flex justify-center gap-1">
          {Array.from({ length: targetLength }, (_, i) => (
            <span key={i} className="h-12 w-12 rounded border-2 border-muted" />
          ))}
        </div>
      ))}
    </div>
  );
}
