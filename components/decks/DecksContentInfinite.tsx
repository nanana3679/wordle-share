"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, Plus, Loader2 } from "lucide-react";
import { DeckCard } from "@/components/decks/DeckCard";
import { DeckDialog } from "@/components/decks/DeckDialog";
import { Button } from "@/components/ui/button";
import { useInfiniteDecks } from "@/hooks/useInfiniteDecks";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";
import { useTranslations } from "next-intl";

export function DecksContentInfinite() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPublic, setFilterPublic] = useState<string>("all");
  const t = useTranslations("Deck.list");
  const tCommon = useTranslations("Common.error");

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
  } = useInfiniteDecks();

  const loadMoreRef = useIntersectionObserver(
    () => {
      if (hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    { threshold: 0.1 }
  );

  // 모든 페이지의 덱을 하나의 배열로 합치기 (중복 제거)
  const allDecks = (() => {
    const decksMap = new Map();
    data?.pages.forEach(page => {
      page.data?.forEach(deck => {
        if (!decksMap.has(deck.id)) {
          decksMap.set(deck.id, deck);
        }
      });
    });
    return Array.from(decksMap.values());
  })();

  // 검색 및 필터링
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredDecks = allDecks.filter((deck) => {
    // 검색어가 비어있으면 모든 덱이 매칭되어야 한다.
    // (deck.name과 deck.description이 모두 null인 경우 ?. 단락으로 undefined가 반환되어
    //  덱이 잘못 필터링되던 버그 수정)
    const matchesSearch =
      normalizedSearch === "" ||
      deck.name?.toLowerCase().includes(normalizedSearch) ||
      deck.description?.toLowerCase().includes(normalizedSearch);

    const matchesFilter = filterPublic === "all" ||
                         (filterPublic === "public" && deck.is_public) ||
                         (filterPublic === "private" && !deck.is_public);

    return matchesSearch && matchesFilter;
  });

  if (isError) {
    return (
      <div className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-8">
        <div className="text-center py-8 text-destructive">
          {t("errorPrefix", { message: error instanceof Error ? error.message : tCommon("unknown") })}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-8">
      <div className="flex gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder={t("search")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterPublic} onValueChange={setFilterPublic}>
          <SelectTrigger className="w-10 h-10 [&>svg:last-child]:hidden">
            <Filter className="w-4 h-4" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filterAll")}</SelectItem>
            <SelectItem value="public">{t("filterPublic")}</SelectItem>
            <SelectItem value="private">{t("filterPrivate")}</SelectItem>
          </SelectContent>
        </Select>
        <DeckDialog>
          <Button size="icon">
            <Plus className="w-4 h-4" />
          </Button>
        </DeckDialog>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredDecks.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          {searchTerm || filterPublic !== "all"
            ? t("noResults")
            : t("empty")}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 lg:gap-6 p-2">
            {filteredDecks.map((deck) => (
              <DeckCard key={deck.id} deck={deck} />
            ))}
          </div>

          {/* 무한 스크롤 트리거 및 로딩 인디케이터 */}
          <div 
            ref={loadMoreRef} 
            className="h-20 flex items-center justify-center mt-8"
          >
            {isFetchingNextPage && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>{t("loadMore")}</span>
              </div>
            )}
            {!hasNextPage && allDecks.length > 0 && (
              <div className="text-muted-foreground text-sm">
                {t("allLoaded")}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

