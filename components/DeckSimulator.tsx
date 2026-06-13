"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GameEngine, type LetterState } from "@/lib/gameEngine";
import { selectRandomWord } from "@/lib/wordleGame";
import { getScriptAdapter } from "@/lib/scripts";
import type { ScriptId } from "@/lib/scripts/types";
import { normalizeWord } from "@/lib/word-validation";
import { cn } from "@/lib/utils";

// 덱 제작자가 저장 전에 1라운드를 미리 플레이해보는 간이 시뮬레이터.
// 정식 게임 보드/키보드는 T2b에서 별도 구현된다.

const TILE_STYLES: Record<LetterState, string> = {
  correct: "bg-green-500 text-white border-green-500",
  present: "bg-yellow-500 text-white border-yellow-500",
  absent: "bg-gray-400 text-white border-gray-400",
  empty: "bg-transparent",
};

interface DeckSimulatorProps {
  words: string[];
  script: ScriptId;
}

export function DeckSimulator({ words, script }: DeckSimulatorProps) {
  const adapter = useMemo(() => getScriptAdapter(script), [script]);
  const [engine, setEngine] = useState<GameEngine>(() =>
    GameEngine.initialize(selectRandomWord(words), script),
  );
  const [guess, setGuess] = useState("");
  const [lengthError, setLengthError] = useState<string | null>(null);

  const game = engine.state;
  const targetLength = adapter.splitUnits(game.targetWord).length;

  const restart = () => {
    setEngine(GameEngine.initialize(selectRandomWord(words), script));
    setGuess("");
    setLengthError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = normalizeWord(guess.trim());
    const guessLength = adapter.splitUnits(normalized).length;
    if (guessLength !== targetLength) {
      setLengthError(`글자 수가 맞지 않습니다 (${guessLength}/${targetLength}).`);
      return;
    }
    setLengthError(null);
    setEngine((prev) => prev.setGuess(normalized).submitGuess().engine);
    setGuess("");
  };

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <p className="text-sm text-muted-foreground">
        시뮬레이션 — {targetLength}글자 단어, {game.maxGuesses}번의 기회
      </p>

      <div className="space-y-1">
        {game.guesses.map((row, i) => (
          <div key={i} className="flex gap-1">
            {row.letters.map((letter, j) => (
              <span
                key={j}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded border text-sm font-bold",
                  TILE_STYLES[letter.state],
                )}
              >
                {letter.char}
              </span>
            ))}
          </div>
        ))}
      </div>

      {game.gameStatus === "playing" ? (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
            placeholder="추측 단어 입력"
            aria-label="추측 단어"
          />
          <Button type="submit" variant="secondary">
            제출
          </Button>
        </form>
      ) : (
        <p className="text-sm font-medium">
          {game.gameStatus === "won" ? "정답!" : `실패 — 정답은 "${game.targetWord}"`}
        </p>
      )}

      {lengthError && <p className="text-sm text-destructive">{lengthError}</p>}

      {engine.isComplete && (
        <Button type="button" variant="outline" size="sm" onClick={restart}>
          다른 단어로 다시
        </Button>
      )}
    </div>
  );
}
