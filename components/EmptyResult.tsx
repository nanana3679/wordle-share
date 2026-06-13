"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

interface EmptyResultProps {
  query?: string;
}

export function EmptyResult({ query }: EmptyResultProps) {
  const t = useTranslations("deck.list");

  return (
    <div className="space-y-4 rounded-lg border p-8 text-center">
      <p className="text-sm text-muted-foreground">
        {query ? t("emptyWithQuery", { query }) : t("emptyNoQuery")}
      </p>
      <Button asChild>
        <Link href="/d/new">{t("createCta")}</Link>
      </Button>
    </div>
  );
}
