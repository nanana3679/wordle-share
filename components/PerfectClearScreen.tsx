"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface PerfectClearScreenProps {
  deckName: string;
  date: string;
  totalRounds: number;
}

export function PerfectClearScreen({ deckName, date, totalRounds }: PerfectClearScreenProps) {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(
        `🎉 PERFECT CLEAR — ${deckName} 챌린지 ${date} ${totalRounds}/${totalRounds}`,
      );
      toast.success("결과를 복사했습니다.");
    } catch {
      toast.error("클립보드 복사에 실패했습니다.");
    }
  };

  return (
    <div className="space-y-4 rounded-lg border-2 border-green-500 p-8 text-center">
      <p className="text-4xl">🎉</p>
      <p className="text-2xl font-bold tracking-wide">PERFECT CLEAR</p>
      <p className="text-sm text-muted-foreground">
        덱의 모든 단어({totalRounds}개)를 풀어냈습니다!
      </p>
      <Button type="button" onClick={handleCopy}>
        결과 복사
      </Button>
    </div>
  );
}
