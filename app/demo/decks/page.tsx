import { Suspense } from "react";
import { getDecks } from "@/app/actions/deck";
import { DeckTable } from "@/components/deckTable";
import { CreateDeckDialog } from "@/components/createDeckDialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function DecksPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">덱 관리</h1>
          <p className="text-muted-foreground mt-2">
            Wordle 게임용 단어 덱을 생성하고 관리하세요
          </p>
        </div>
        <CreateDeckDialog>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            새 덱 만들기
          </Button>
        </CreateDeckDialog>
      </div>

      <Suspense fallback={<div>덱 목록을 불러오는 중...</div>}>
        <DeckList />
      </Suspense>
    </div>
  );
}

async function DeckList() {
  const decks = await getDecks();
  
  return <DeckTable decks={decks} />;
}
