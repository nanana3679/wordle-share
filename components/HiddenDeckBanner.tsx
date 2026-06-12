import Link from "next/link";
import { Button } from "@/components/ui/button";

interface HiddenDeckBannerProps {
  deckId: string;
}

// 신고 누적으로 가려진 덱의 직접 링크 방문자 안내 (#55, ADR 0013)
// 작성자는 nick+pw로 편집 페이지에 들어가 모더레이션 대응이 가능하다.
export function HiddenDeckBanner({ deckId }: HiddenDeckBannerProps) {
  return (
    <div className="space-y-3 rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-center">
      <p className="font-medium">🚧 이 덱은 신고로 비공개됐습니다.</p>
      <p className="text-sm text-muted-foreground">
        플레이·좋아요·댓글이 차단된 상태입니다. 덱을 만든 분이라면 내용을 수정해
        검토에 대응할 수 있습니다.
      </p>
      <Button asChild variant="outline" size="sm">
        <Link href={`/d/${deckId}/edit`}>작성자 수정 페이지</Link>
      </Button>
    </div>
  );
}
