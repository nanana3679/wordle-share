"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface PerfectClearScreenProps {
  deckId: string;
  deckName: string;
  date: string;
  totalRounds: number;
}

export function PerfectClearScreen({ deckId, deckName, date, totalRounds }: PerfectClearScreenProps) {
  const t = useTranslations("game.perfectClear");

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(
        t("shareText", { deckName, date, total: totalRounds }),
      );
      toast.success(t("copySuccess"));
    } catch {
      toast.error(t("copyFailure"));
    }
  };

  return (
    <div className="space-y-4 rounded-lg border-2 border-green-500 p-8 text-center">
      <p className="text-4xl">🎉</p>
      <p className="text-2xl font-bold tracking-wide">{t("title")}</p>
      <p className="text-sm text-muted-foreground">
        {t("description", { count: totalRounds })}
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button type="button" onClick={handleCopy}>
          {t("copyButton")}
        </Button>
        <Button asChild variant="outline">
          <Link href={`/d/${deckId}#comments`}>{t("viewComments")}</Link>
        </Button>
      </div>
    </div>
  );
}
