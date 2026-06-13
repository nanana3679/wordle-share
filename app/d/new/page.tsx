import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { DeckForm } from "@/components/DeckForm";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("deck.new");
  return {
    title: t("pageTitle"),
  };
}

export default async function NewDeckPage() {
  const t = await getTranslations("deck.new");

  return (
    <main className="mx-auto max-w-xl space-y-6 px-4 py-8">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <DeckForm />
    </main>
  );
}
