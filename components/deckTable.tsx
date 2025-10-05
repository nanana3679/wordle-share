"use client";

import { useState } from "react";
import { Deck } from "@/app/actions/deck";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EditDeckDialog } from "@/components/editDeckDialog";
import { DeleteDeckDialog } from "@/components/deleteDeckDialog";
import { Edit, Trash2, Search, Filter } from "lucide-react";
// 간단한 날짜 포맷팅 함수
function formatDate(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  
  if (diffInDays === 0) return "오늘";
  if (diffInDays === 1) return "1일 전";
  if (diffInDays < 7) return `${diffInDays}일 전`;
  if (diffInDays < 30) return `${Math.floor(diffInDays / 7)}주 전`;
  return `${Math.floor(diffInDays / 30)}개월 전`;
}

interface DeckTableProps {
  decks: Deck[];
}

export function DeckTable({ decks }: DeckTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPublic, setFilterPublic] = useState<string>("all");

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
    <Card>
      <CardHeader>
        <CardTitle>덱 목록 ({filteredDecks.length}개)</CardTitle>
        <div className="flex gap-4 mt-4">
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
            <SelectTrigger className="w-40">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              <SelectItem value="public">공개</SelectItem>
              <SelectItem value="private">비공개</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {filteredDecks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchTerm || filterPublic !== "all" 
              ? "검색 조건에 맞는 덱이 없습니다." 
              : "아직 생성된 덱이 없습니다. 새 덱을 만들어보세요!"}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>이름</TableHead>
                <TableHead>설명</TableHead>
                <TableHead>단어 수</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>생성일</TableHead>
                <TableHead className="text-right">작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDecks.map((deck) => (
                <TableRow key={deck.id}>
                  <TableCell className="font-medium">
                    {deck.name || "이름 없음"}
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {deck.description || "-"}
                  </TableCell>
                  <TableCell>
                    {deck.words?.length || 0}개
                  </TableCell>
                  <TableCell>
                    <Badge variant={deck.is_public ? "default" : "secondary"}>
                      {deck.is_public ? "공개" : "비공개"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {deck.created_at && formatDate(deck.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <EditDeckDialog deck={deck}>
                        <Button variant="outline" size="sm">
                          <Edit className="w-4 h-4" />
                        </Button>
                      </EditDeckDialog>
                      <DeleteDeckDialog deck={deck}>
                        <Button variant="outline" size="sm">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </DeleteDeckDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
