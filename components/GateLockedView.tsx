import Link from "next/link";
import { Button } from "@/components/ui/button";

interface GateLockedViewProps {
  deckId: string;
}

// ADR 0006: 챌린지는 그날 데일리 완료(솔브 OR 시도 소진) 후 잠금 해제
export function GateLockedView({ deckId }: GateLockedViewProps) {
  return (
    <div className="space-y-4 rounded-lg border p-8 text-center">
      <p className="text-4xl">🔒</p>
      <p className="font-medium">오늘의 데일리를 먼저 풀어야 챌린지가 열립니다.</p>
      <p className="text-sm text-muted-foreground">
        데일리를 완료하면(정답이 아니어도) 챌린지가 잠금 해제됩니다.
      </p>
      <Button asChild>
        <Link href={`/d/${deckId}/play?mode=daily`}>오늘의 데일리 풀러 가기</Link>
      </Button>
    </div>
  );
}
