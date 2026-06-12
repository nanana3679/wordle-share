import { notFound } from "next/navigation";
import { getDeckById } from "@/app/actions/deck";
import { DeckEditForm } from "@/components/DeckEditForm";

interface DeckEditPageProps {
  params: Promise<{ id: string }>;
}

export default async function DeckEditPage({ params }: DeckEditPageProps) {
  const { id } = await params;
  const result = await getDeckById(id);
  if (!result.success || !result.data) notFound();

  const { deck, words } = result.data;

  return (
    <main className="mx-auto max-w-xl space-y-6 px-4 py-8">
      <h1 className="text-2xl font-bold">{deck.name} 편집</h1>
      <DeckEditForm deckId={deck.id} words={words} />
    </main>
  );
}
