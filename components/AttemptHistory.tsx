"use client";

import type { DailyAttemptView } from "@/app/actions/daily";
import type { LetterState } from "@/lib/wordleGame";
import { cn } from "@/lib/utils";

export const TILE_STYLES: Record<LetterState, string> = {
  correct: "bg-green-500 text-white border-green-500",
  present: "bg-yellow-500 text-white border-yellow-500",
  absent: "bg-gray-400 text-white border-gray-400",
  empty: "bg-transparent",
};

interface AttemptHistoryProps {
  attempts: DailyAttemptView[];
}

export function AttemptHistory({ attempts }: AttemptHistoryProps) {
  return (
    <>
      {attempts.map((attempt, i) => (
        <div key={i} className="flex justify-center gap-1">
          {attempt.units.map((unit, j) => (
            <span
              key={j}
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded border-2 text-lg font-bold",
                TILE_STYLES[attempt.states[j] ?? "empty"],
              )}
            >
              {unit}
            </span>
          ))}
        </div>
      ))}
    </>
  );
}
