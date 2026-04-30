import { Deck } from "@/types/decks";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import { DeckDialog } from "@/components/decks/DeckDialog";
import { DeleteDeckDialog } from "@/components/decks/DeleteDeckDialog";
import { useTranslations } from "next-intl";

interface DeckCreatorActionsProps {
  deck: Deck;
}

export function DeckCreatorActions({ deck }: DeckCreatorActionsProps) {
  const t = useTranslations("Deck.creator");
  return (
    <div className="mt-8 flex justify-center gap-4">
      <DeckDialog deck={deck}>
        <Button variant="outline">
          <Edit className="h-4 w-4 mr-2" />
          {t("edit")}
        </Button>
      </DeckDialog>
      <DeleteDeckDialog deck={deck}>
        <Button variant="destructive">
          <Trash2 className="h-4 w-4 mr-2" />
          {t("delete")}
        </Button>
      </DeleteDeckDialog>
    </div>
  );
}
