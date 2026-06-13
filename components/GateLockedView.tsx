"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

interface GateLockedViewProps {
  deckId: string;
}

// ADR 0006: 챌린지는 그날 데일리 완료(솔브 OR 시도 소진) 후 잠금 해제
export function GateLockedView({ deckId }: GateLockedViewProps) {
  const t = useTranslations("game.gate");

  return (
    <div className="space-y-4 rounded-lg border p-8 text-center">
      <p className="text-4xl">🔒</p>
      <p className="font-medium">{t("title")}</p>
      <p className="text-sm text-muted-foreground">{t("description")}</p>
      <Button asChild>
        <Link href={`/d/${deckId}/play?mode=daily`}>{t("goToDaily")}</Link>
      </Button>
    </div>
  );
}
