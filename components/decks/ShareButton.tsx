"use client";

import { Button } from "@/components/ui/button";
import { Share2 } from "lucide-react";
import { toast } from "sonner";

export function ShareButton() {
  const handleShare = async () => {
    await navigator.clipboard.writeText(window.location.href);
    toast.success("링크가 클립보드에 복사되었습니다.");
  };

  return (
    <Button onClick={handleShare} variant="outline" size="icon">
      <Share2 className="h-4 w-4" />
    </Button>
  );
}

