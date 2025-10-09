"use client";

import { DeckTable } from "@/components/decks/DeckTable";
import { DeckDialog } from "@/components/decks/DeckDialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Deck } from "@/types/decks";

interface DecksContentProps {
  initialDecks: Deck[];
}

export function DecksContent({ initialDecks }: DecksContentProps) {
  return (
    <div className="container mx-auto py-8">
      <DeckTable decks={initialDecks || []} />
    </div>
  );
}
