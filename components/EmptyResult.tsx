import Link from "next/link";
import { Button } from "@/components/ui/button";

interface EmptyResultProps {
  query?: string;
}

export function EmptyResult({ query }: EmptyResultProps) {
  return (
    <div className="space-y-4 rounded-lg border p-8 text-center">
      <p className="text-sm text-muted-foreground">
        {query ? `[${query}] 덱이 아직 없습니다. 직접 만들어보세요!` : "아직 덱이 없습니다. 첫 덱을 만들어보세요!"}
      </p>
      <Button asChild>
        <Link href="/d/new">새 덱 만들기</Link>
      </Button>
    </div>
  );
}
