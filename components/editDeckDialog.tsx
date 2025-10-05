"use client";

import { useState } from "react";
import { Deck, updateDeck } from "@/app/actions/deck";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

interface EditDeckDialogProps {
  deck: Deck;
  children: React.ReactNode;
}

export function EditDeckDialog({ deck, children }: EditDeckDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setIsLoading(true);
    
    try {
      await updateDeck(deck.id, formData);
      toast.success("덱이 성공적으로 수정되었습니다!");
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "덱 수정에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>덱 수정</DialogTitle>
          <DialogDescription>
            덱 정보를 수정하세요. 단어는 쉼표로 구분하여 입력하세요.
          </DialogDescription>
        </DialogHeader>
        
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">덱 이름 *</Label>
            <Input
              id="name"
              name="name"
              defaultValue={deck.name || ""}
              placeholder="예: 동물 단어"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">설명</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={deck.description || ""}
              placeholder="덱에 대한 설명을 입력하세요..."
              rows={3}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="words">단어 목록 *</Label>
            <Textarea
              id="words"
              name="words"
              defaultValue={deck.words?.join(", ") || ""}
              placeholder="예: 고양이, 강아지, 토끼, 사자, 호랑이"
              rows={4}
              required
            />
            <p className="text-sm text-muted-foreground">
              단어는 쉼표(,)로 구분하여 입력하세요. 각 단어는 5글자여야 합니다.
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch 
              id="is_public" 
              name="is_public" 
              defaultChecked={deck.is_public || false}
            />
            <Label htmlFor="is_public">공개 덱으로 만들기</Label>
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
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "수정 중..." : "덱 수정"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
