import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDisplayNick } from "@/lib/identity";
import type { PublicDeck } from "@/app/actions/deck";

const SCRIPT_LABELS: Record<string, string> = {
  latin: "로마자",
  hangul: "한글",
  kana: "가나",
};

interface DeckMetaCardProps {
  deck: PublicDeck;
  activeWordCount: number;
}

export function DeckMetaCard({ deck, activeWordCount }: DeckMetaCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {deck.name}
          <Badge variant="secondary">{SCRIPT_LABELS[deck.script] ?? deck.script}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1 text-sm text-muted-foreground">
        <p>단어 {activeWordCount}개</p>
        <p>제작자 {formatDisplayNick(deck.creator_nick, deck.creator_id)}</p>
        <p>만든 날 {new Date(deck.created_at).toLocaleDateString("ko-KR")}</p>
      </CardContent>
    </Card>
  );
}
