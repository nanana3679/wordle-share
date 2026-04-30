"use client";

import { useState } from "react";
import { deleteDeck } from "@/app/actions/deck";
import { Deck } from "@/types/decks";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { actionWithToast } from "@/lib/action-with-toast";
import { useTranslations } from "next-intl";

interface DeleteDeckDialogProps {
  deck: Deck;
  children: React.ReactNode;
}

export function DeleteDeckDialog({ deck, children }: DeleteDeckDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const t = useTranslations("Deck.delete");

  async function handleDelete() {
    setIsLoading(true);
    
    try {
      // actionWithToast가 자동으로 toast를 표시하고 에러를 처리합니다
      await actionWithToast(() => deleteDeck(deck.id));
      // deleteDeck은 성공하면 redirect를 호출하므로, 여기까지 오지 않습니다
      setOpen(false);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>
            {t("description")}
          </DialogDescription>
        </DialogHeader>

        <div className="bg-muted p-4 rounded-lg">
          <h4 className="font-medium">{deck.name || t("untitled")}</h4>
          {deck.description && (
            <p className="text-sm text-muted-foreground mt-1">{deck.description}</p>
          )}
          <p className="text-sm text-muted-foreground mt-2">
            {t("wordCount", { count: deck.words?.length || 0 })}
          </p>
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isLoading}
          >
            {t("cancel")}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={isLoading}
          >
            {isLoading ? t("deleting") : t("delete")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
