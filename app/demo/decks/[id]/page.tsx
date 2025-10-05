import { notFound } from "next/navigation";
import { getDeck } from "@/app/actions/deck";
import { DeckDetail } from "@/components/DeckDetail";

interface DeckPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function DeckPage({ params }: DeckPageProps) {
  try {
    const { id } = await params;
    const deck = await getDeck(id);
    
    if (!deck) {
      notFound();
    }

    return <DeckDetail deck={deck} />;
  } catch (error) {
    console.error("덱을 불러오는 중 오류 발생:", error);
    notFound();
  }
}
