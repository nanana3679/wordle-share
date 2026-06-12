import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { LikeButton } from "@/components/LikeButton";
import { formatDisplayNick } from "@/lib/identity";
import type { FeedDeck } from "@/app/actions/feed";

const SCRIPT_LABELS: Record<string, string> = {
  latin: "로마자",
  hangul: "한글",
  kana: "가나",
};

export function FeedDeckCard({ deck }: { deck: FeedDeck }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border p-4">
      <Link href={`/d/${deck.id}`} className="min-w-0 flex-1 space-y-1">
        <p className="truncate font-semibold">{deck.name}</p>
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="secondary">{SCRIPT_LABELS[deck.script] ?? deck.script}</Badge>
          {formatDisplayNick(deck.creator_nick, deck.creator_id)}
        </p>
      </Link>
      <LikeButton deckId={deck.id} initialCount={deck.like_count} />
    </div>
  );
}
