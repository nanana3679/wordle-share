import { notFound } from "next/navigation";
import { getDeck } from "@/app/actions/deck";
import { DeckDetail } from "@/components/DeckDetail";

interface DeckPageProps {
  params: {
    id: string;
  };
}

export default async function DeckPage({ params }: DeckPageProps) {
  try {
    const deck = await getDeck(params.id);
    
    if (!deck) {
      notFound();
    }

    return <DeckDetail deck={deck} />;
  } catch (error) {
    console.error("덱을 불러오는 중 오류 발생:", error);
    notFound();
  }
}
