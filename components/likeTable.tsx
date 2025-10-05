"use client";

import { useState } from "react";
import { LikeWithDeck } from "@/app/actions/like";
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
import { DeleteLikeDialog } from "@/components/deleteLikeDialog";
import { Heart, Search, Filter, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

interface LikeTableProps {
  likes: LikeWithDeck[];
}

export function LikeTable({ likes }: LikeTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPublic, setFilterPublic] = useState<string>("all");

  // 검색 및 필터링
  const filteredLikes = likes.filter((like) => {
    const deck = like.decks;
    if (!deck) return false;
    
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
        <CardTitle className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-red-500" />
          좋아요 목록 ({filteredLikes.length}개)
        </CardTitle>
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
              <SelectItem value="public">공개 덱</SelectItem>
              <SelectItem value="private">비공개 덱</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {filteredLikes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchTerm || filterPublic !== "all" 
              ? "검색 조건에 맞는 좋아요가 없습니다." 
              : "아직 좋아요한 덱이 없습니다. 마음에 드는 덱에 좋아요를 눌러보세요!"}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>덱 이름</TableHead>
                <TableHead>설명</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>좋아요한 날짜</TableHead>
                <TableHead className="text-right">작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLikes.map((like) => {
                const deck = like.decks;
                if (!deck) return null;
                
                return (
                  <TableRow key={`${like.deck_id}-${like.user_id}`}>
                    <TableCell className="font-medium">
                      {deck.name || "이름 없음"}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {deck.description || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={deck.is_public ? "default" : "secondary"}>
                        {deck.is_public ? "공개" : "비공개"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {like.created_at && formatDistanceToNow(new Date(like.created_at), {
                        addSuffix: true,
                        locale: ko
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            // 덱 상세 페이지로 이동 (추후 구현)
                            toast.info("덱 상세 페이지로 이동합니다.");
                          }}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                        <DeleteLikeDialog like={like}>
                          <Button variant="outline" size="sm">
                            <Heart className="w-4 h-4" />
                          </Button>
                        </DeleteLikeDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
