"use client";

import { useState } from "react";
import { Deck } from "@/types/decks";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, Plus } from "lucide-react";
import { DeckCard } from "@/components/decks/DeckCard";
import { DeckDialog } from "@/components/decks/DeckDialog";
import { Button } from "@/components/ui/button";

interface DecksContentProps {
  initialDecks: Deck[];
}

export function DecksContent({ initialDecks }: DecksContentProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPublic, setFilterPublic] = useState<string>("all");

  const decks = initialDecks || [];

  // 검색 및 필터링
  const filteredDecks = decks.filter((deck) => {
    const matchesSearch = deck.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         deck.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterPublic === "all" ||
                         (filterPublic === "public" && deck.is_public) ||
                         (filterPublic === "private" && !deck.is_public);
    
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-8">
      <div className="flex gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="덱 이름이나 설명으로 검색..."
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
            <SelectItem value="all">전체</SelectItem>
            <SelectItem value="public">공개</SelectItem>
            <SelectItem value="private">비공개</SelectItem>
          </SelectContent>
        </Select>
        <DeckDialog>
          <Button size="icon">
            <Plus className="w-4 h-4" />
          </Button>
        </DeckDialog>
      </div>
      
      {filteredDecks.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          {searchTerm || filterPublic !== "all" 
            ? "검색 조건에 맞는 덱이 없습니다." 
            : "아직 생성된 덱이 없습니다. 새 덱을 만들어보세요!"}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 lg:gap-6 p-2">
          {filteredDecks.map((deck) => (
            <DeckCard key={deck.id} deck={deck} />
          ))}
        </div>
      )}
    </div>
  );
}
