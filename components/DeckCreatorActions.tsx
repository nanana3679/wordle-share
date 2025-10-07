"use client";

import { Deck } from "@/app/actions/deck";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import { DeckDialog } from "@/components/DeckDialog";
import { DeleteDeckDialog } from "@/components/DeleteDeckDialog";
import { useUser } from "@/hook/useUser";

interface DeckCreatorActionsProps {
  deck: Deck;
}

export function DeckCreatorActions({ deck }: DeckCreatorActionsProps) {
  const { user } = useUser();
  
  // 현재 사용자가 덱의 생성자인지 확인
  const isCreator = user && deck.creator_id === user.id;

  if (!isCreator) {
    return null;
  }

  return (
    <div className="mt-8 flex justify-center gap-4">
      <DeckDialog deck={deck}>
        <Button variant="outline">
          <Edit className="h-4 w-4 mr-2" />
          수정
        </Button>
      </DeckDialog>
      <DeleteDeckDialog deck={deck}>
        <Button variant="destructive">
          <Trash2 className="h-4 w-4 mr-2" />
          삭제
        </Button>
      </DeleteDeckDialog>
    </div>
  );
}
