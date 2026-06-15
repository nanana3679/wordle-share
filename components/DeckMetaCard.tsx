import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDisplayNick } from "@/lib/identity";
import type { PublicDeck } from "@/app/actions/deck";

interface DeckMetaCardProps {
  deck: PublicDeck;
  activeWordCount: number;
}

export async function DeckMetaCard({ deck, activeWordCount }: DeckMetaCardProps) {
  const t = await getTranslations("deck.meta");

  return (
    <Card>
      {deck.image_url && (
        <div className="relative aspect-[16/9] overflow-hidden rounded-t-lg bg-muted">
          <Image
            src={deck.image_url}
            alt={deck.name}
            fill
            sizes="(max-width: 640px) 100vw, 640px"
            className="object-cover"
          />
        </div>
      )}
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {deck.name}
          <Badge variant="secondary">{t(`scriptLabel.${deck.script}`, { defaultValue: deck.script })}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1 text-sm text-muted-foreground">
        <p>{t("wordCount", { count: activeWordCount })}</p>
        <p>{t("creator", { nick: formatDisplayNick(deck.creator_nick, deck.creator_id) })}</p>
        <p>{t("createdAt", { date: new Date(deck.created_at).toLocaleDateString("ko-KR") })}</p>
      </CardContent>
    </Card>
  );
}
