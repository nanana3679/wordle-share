"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Deck, createDeck, updateDeck } from "@/app/actions/deck";
import { uploadDeckThumbnail } from "@/app/actions/storage";
import {
  Dialog,
  DialogContent,
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
import { Upload, X, Image as ImageIcon } from "lucide-react";
import Image from "next/image";

interface DeckDialogProps {
  deck?: Deck; // deck이 있으면 수정 모드, 없으면 생성 모드
  children: React.ReactNode;
}

export function DeckDialog({ deck, children }: DeckDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState(deck?.thumbnail_url || "");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  
  const isEditMode = !!deck;
  const title = isEditMode ? "덱 수정" : "새 덱 만들기";
  const submitButtonText = isEditMode ? "덱 수정" : "덱 생성";
  const loadingText = isEditMode ? "수정 중..." : "생성 중...";

  // 미리보기 URL 정리
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 파일 타입 검증
    if (!file.type.startsWith('image/')) {
      toast.error("이미지 파일만 선택할 수 있습니다.");
      return;
    }

    // 파일 크기 검증 (5MB 제한)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("이미지 크기는 5MB 이하여야 합니다.");
      return;
    }

    // 파일 저장 및 미리보기 생성
    setSelectedFile(file);
    
    // 미리보기 URL 생성
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleRemoveImage = () => {
    setThumbnailUrl("");
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl("");
    }
  };

  async function handleSubmit(formData: FormData) {
    setIsLoading(true);
    
    try {
      let finalThumbnailUrl = thumbnailUrl;
      
      // 새로 선택된 이미지가 있으면 업로드
      if (selectedFile) {
        if (isEditMode && deck) {
          // 수정 모드: 기존 deckId 사용
          finalThumbnailUrl = await uploadDeckThumbnail(selectedFile, deck.id);
        } else {
          // 생성 모드: 먼저 덱을 생성한 후 이미지 업로드
          const createdDeck = await createDeck(formData);
          finalThumbnailUrl = await uploadDeckThumbnail(selectedFile, createdDeck.id);
          
          // 이미지 URL로 덱 업데이트
          const updateFormData = new FormData();
          updateFormData.set("name", formData.get("name") as string);
          updateFormData.set("description", formData.get("description") as string);
          updateFormData.set("words", formData.get("words") as string);
          updateFormData.set("is_public", formData.get("is_public") as string);
          updateFormData.set("thumbnail_url", finalThumbnailUrl);
          
          await updateDeck(createdDeck.id, updateFormData);
          toast.success("덱이 성공적으로 생성되었습니다!");
          setOpen(false);
          return;
        }
      }
      
      // 이미지 URL을 FormData에 추가
      if (finalThumbnailUrl) {
        formData.set("thumbnail_url", finalThumbnailUrl);
      }
      
      if (isEditMode && deck) {
        await updateDeck(deck.id, formData);
        toast.success("덱이 성공적으로 수정되었습니다!");
        
        // 수정 후 페이지 새로고침
        setTimeout(() => {
          router.refresh();
        }, 1000);
      }
      
      setOpen(false);
    } catch (error) {
      console.error("덱 처리 중 오류 발생:", error);
      const errorMessage = isEditMode ? "덱 수정에 실패했습니다." : "덱 생성에 실패했습니다.";
      toast.error(error instanceof Error ? error.message : errorMessage);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto px-1">
          <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">덱 이름 *</Label>
            <Input
              id="name"
              name="name"
              defaultValue={deck?.name || ""}
              placeholder="예: 동물 단어"
              required
            />
          </div>

          {/* 이미지 업로드 */}
          <div className="space-y-2">
            <Label>썸네일 이미지</Label>
            {(thumbnailUrl || previewUrl) ? (
              <div className="relative w-full h-32 rounded-lg overflow-hidden border">
                <Image
                  src={previewUrl || thumbnailUrl}
                  alt="덱 썸네일"
                  fill
                  className="object-cover"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={handleRemoveImage}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                <ImageIcon className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-2">
                  이미지를 선택하여 덱에 썸네일을 추가하세요
                </p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                  id="thumbnail-upload"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('thumbnail-upload')?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  이미지 선택
                </Button>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              이미지 크기는 5MB 이하여야 합니다.
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">설명</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={deck?.description || ""}
              placeholder="덱에 대한 설명을 입력하세요..."
              rows={3}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="words">단어 목록 *</Label>
            <Textarea
              id="words"
              name="words"
              defaultValue={deck?.words?.join(", ") || ""}
              placeholder="예: 고양이, 강아지, 토끼, 사자, 호랑이"
              rows={4}
              required
            />
            <p className="text-sm text-muted-foreground">
              단어는 쉼표(,)로 구분하여 입력하세요.
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch 
              id="is_public" 
              name="is_public" 
              defaultChecked={deck?.is_public ?? true}
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
                {isLoading ? loadingText : submitButtonText}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
