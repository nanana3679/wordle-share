"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getDecks } from "@/app/actions/deck";
import { DeckTable } from "@/components/deckTable";
import { DeckDialog } from "@/components/DeckDialog";
import { Button } from "@/components/ui/button";
import { Plus, LogIn, LogOut } from "lucide-react";
import { useUser } from "@/hook/useUser";
import { signOut } from "@/app/actions/auth";
import Loading from "@/components/Loading";

export default function DecksPage() {
  const { user, loading } = useUser();
  const router = useRouter();
  const [decks, setDecks] = useState<any[]>([]);
  const [decksLoading, setDecksLoading] = useState(true);

  useEffect(() => {
    const loadDecks = async () => {
      try {
        const decksData = await getDecks();
        setDecks(decksData);
      } catch (error) {
        console.error("덱 목록 로드 실패:", error);
      } finally {
        setDecksLoading(false);
      }
    };

    loadDecks();
  }, []);

  const handleLogin = () => {
    router.push("/demo/login");
  };

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("로그아웃 실패:", error);
    }
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">덱 관리</h1>
          <p className="text-muted-foreground mt-2">
            Wordle 게임용 단어 덱을 생성하고 관리하세요
          </p>
        </div>
        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                로그아웃
              </Button>
              <DeckDialog>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  새 덱 만들기
                </Button>
              </DeckDialog>
            </div>
          ) : (
            <Button onClick={handleLogin}>
              <LogIn className="w-4 h-4 mr-2" />
              로그인
            </Button>
          )}
        </div>
      </div>

      <Suspense fallback={<div>덱 목록을 불러오는 중...</div>}>
        {decksLoading ? (
          <div>덱 목록을 불러오는 중...</div>
        ) : (
          <DeckTable decks={decks} />
        )}
      </Suspense>
    </div>
  );
}
