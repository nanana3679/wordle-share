import { notFound } from "next/navigation";
import { getDeck } from "@/app/actions/deck";
import { DeckDetailStatic } from "@/components/DeckDetailStatic";

interface DeckPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function DeckPage({ params }: DeckPageProps) {
  const { id } = await params;
  const deck = await getDeck(id);
  
  if (!deck) {
    notFound();
  }

  return <DeckDetailStatic deck={deck} />;
}
