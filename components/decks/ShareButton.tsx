"use client";

import { Button } from "@/components/ui/button";
import { Share2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

export function ShareButton() {
  const t = useTranslations("Deck.share");
  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success(t("copied"));
    } catch {
      toast.error(t("failed"));
    }
  };

  return (
    <Button onClick={handleShare} variant="outline" size="icon">
      <Share2 className="h-4 w-4" />
    </Button>
  );
}

