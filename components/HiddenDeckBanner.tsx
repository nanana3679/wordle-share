import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";

interface HiddenDeckBannerProps {
  deckId: string;
}

// 신고 누적으로 가려진 덱의 직접 링크 방문자 안내 (#55, ADR 0013)
// 작성자는 nick+pw로 편집 페이지에 들어가 모더레이션 대응이 가능하다.
export async function HiddenDeckBanner({ deckId }: HiddenDeckBannerProps) {
  const t = await getTranslations("deck.hidden");

  return (
    <div className="space-y-3 rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-center">
      <p className="font-medium">{t("title")}</p>
      <p className="text-sm text-muted-foreground">
        {t("description")}
      </p>
      <Button asChild variant="outline" size="sm">
        <Link href={`/d/${deckId}/edit`}>{t("editLink")}</Link>
      </Button>
    </div>
  );
}
