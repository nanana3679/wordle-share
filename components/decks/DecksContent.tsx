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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">덱 관리</h1>
          <p className="text-muted-foreground mt-2">
            Wordle 게임용 단어 덱을 생성하고 관리하세요
          </p>
        </div>
        {initialDecks && (
          <div className="flex items-center gap-4">
            <DeckDialog>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                새 덱 만들기
              </Button>
            </DeckDialog>
          </div>
        )}
      </div>

      <DeckTable decks={initialDecks || []} />
    </div>
  );
}
