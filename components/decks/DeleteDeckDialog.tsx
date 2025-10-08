"use client";

import { useState } from "react";
import { Deck, deleteDeck } from "@/app/actions/deck";
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

interface DeleteDeckDialogProps {
  deck: Deck;
  children: React.ReactNode;
}

export function DeleteDeckDialog({ deck, children }: DeleteDeckDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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
          <DialogTitle>덱 삭제</DialogTitle>
          <DialogDescription>
            정말로 이 덱을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
          </DialogDescription>
        </DialogHeader>
        
        <div className="bg-muted p-4 rounded-lg">
          <h4 className="font-medium">{deck.name || "이름 없음"}</h4>
          {deck.description && (
            <p className="text-sm text-muted-foreground mt-1">{deck.description}</p>
          )}
          <p className="text-sm text-muted-foreground mt-2">
            단어 {deck.words?.length || 0}개
          </p>
        </div>
        
        <div className="flex justify-end space-x-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isLoading}
          >
            취소
          </Button>
          <Button 
            type="button" 
            variant="destructive" 
            onClick={handleDelete}
            disabled={isLoading}
          >
            {isLoading ? "삭제 중..." : "삭제"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
