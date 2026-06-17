"use client";

import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { LikeButton } from "@/components/LikeButton";
import { formatDisplayNick } from "@/lib/identity";
import type { FeedDeck } from "@/app/actions/feed";

export function FeedDeckCard({ deck }: { deck: FeedDeck }) {
  const t = useTranslations("deck.meta.scriptLabel");

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border p-4">
      {deck.image_url && (
        <Link href={`/d/${deck.id}`} className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-muted">
          <Image
            src={deck.image_url}
            alt={deck.name}
            fill
            sizes="56px"
            className="object-cover"
          />
        </Link>
      )}
      <Link href={`/d/${deck.id}`} className="min-w-0 flex-1 space-y-1">
        <p className="truncate font-semibold">{deck.name}</p>
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="secondary">{t(deck.script, { defaultValue: deck.script })}</Badge>
          {formatDisplayNick(deck.creator_nick, deck.creator_id)}
        </p>
      </Link>
      <LikeButton deckId={deck.id} initialCount={deck.like_count} initialLiked={deck.likedByMe} />
    </div>
  );
}
