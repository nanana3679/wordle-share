import { Suspense } from "react";
import { getLikes } from "@/app/actions/like";
import { LikeTable } from "@/components/likeTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, Users, TrendingUp } from "lucide-react";

export default function LikesPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Heart className="w-8 h-8 text-red-500" />
          좋아요 관리
        </h1>
        <p className="text-muted-foreground mt-2">
          좋아요한 덱들을 확인하고 관리하세요
        </p>
      </div>

      <div className="grid gap-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">총 좋아요</CardTitle>
              <Heart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <Suspense fallback={<div className="text-2xl font-bold">-</div>}>
                <LikeCount />
              </Suspense>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">공개 덱</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <Suspense fallback={<div className="text-2xl font-bold">-</div>}>
                <PublicDeckCount />
              </Suspense>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">비공개 덱</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <Suspense fallback={<div className="text-2xl font-bold">-</div>}>
                <PrivateDeckCount />
              </Suspense>
            </CardContent>
          </Card>
        </div>
      </div>

      <Suspense fallback={<div>좋아요 목록을 불러오는 중...</div>}>
        <LikeList />
      </Suspense>
    </div>
  );
}

async function LikeList() {
  const likes = await getLikes();
  
  return <LikeTable likes={likes} />;
}

async function LikeCount() {
  const likes = await getLikes();
  return <div className="text-2xl font-bold">{likes.length}</div>;
}

async function PublicDeckCount() {
  const likes = await getLikes();
  const publicCount = likes.filter(like => like.decks?.is_public).length;
  return <div className="text-2xl font-bold">{publicCount}</div>;
}

async function PrivateDeckCount() {
  const likes = await getLikes();
  const privateCount = likes.filter(like => !like.decks?.is_public).length;
  return <div className="text-2xl font-bold">{privateCount}</div>;
}
