"use client";

import { useState } from "react";
import { LikeWithDeck, deleteLike } from "@/app/actions/like";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { toast } from "sonner";

interface DeleteLikeDialogProps {
  like: LikeWithDeck;
  children: React.ReactNode;
}

export function DeleteLikeDialog({ like, children }: DeleteLikeDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function handleDelete() {
    setIsLoading(true);
    
    try {
      await deleteLike(like.deck_id);
      toast.success("좋아요를 취소했습니다!");
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "좋아요 취소에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  }

  const deck = like.decks;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-500" />
            좋아요 취소
          </DialogTitle>
          <DialogDescription>
            이 덱에 대한 좋아요를 취소하시겠습니까?
          </DialogDescription>
        </DialogHeader>
        
        {deck && (
          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-medium">{deck.name || "이름 없음"}</h4>
            {deck.description && (
              <p className="text-sm text-muted-foreground mt-1">{deck.description}</p>
            )}
            <p className="text-sm text-muted-foreground mt-2">
              좋아요한 날짜: {like.created_at && new Date(like.created_at).toLocaleDateString('ko-KR')}
            </p>
          </div>
        )}
        
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
            {isLoading ? "취소 중..." : "좋아요 취소"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
