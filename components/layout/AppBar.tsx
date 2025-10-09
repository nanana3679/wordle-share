"use client";

import { Button } from "@/components/ui/button";
import { LogIn, LogOut, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { signInWithGoogle, signOut } from "@/app/actions/auth";
import { User } from "@supabase/supabase-js";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface AppBarProps {
  title: string;
  showBackButton?: boolean;
  backButtonText?: string;
  onBackClick?: () => void;
  user: User | null;
}

export function AppBar({ 
  title, 
  showBackButton = false, 
  onBackClick,
  user
}: AppBarProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const handleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error("로그인 실패:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      // useAuth 훅에서 로그아웃 상태 변경
      queryClient.invalidateQueries({ queryKey: ["auth", "user"] });
      toast.success("로그아웃 되었습니다.");
    } catch (error) {
      console.error("로그아웃 실패:", error);
    }
  };

  const handleBackClick = () => {
    if (onBackClick) {
      onBackClick();
    } else {
      // 항상 뒤로가기로 캐싱된 페이지 사용
      router.back();
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="relative flex h-14 items-center justify-between px-4 w-full max-w-full">
        {/* 왼쪽: 뒤로 가기 버튼 */}
        <div className="flex items-center z-10">
          {showBackButton && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleBackClick}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* 가운데: 제목 (절대 위치로 중앙 고정) */}
        <div className="absolute left-1/2 transform -translate-x-1/2">
          <h1 className="text-lg font-semibold truncate max-w-xs sm:max-w-md">
            {title}
          </h1>
        </div>

        {/* 오른쪽: 로그인/로그아웃 버튼 */}
        <div className="flex items-center z-10">
          {user ? (
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              로그아웃
            </Button>
          ) : (
            <Button size="sm" onClick={handleLogin}>
              <LogIn className="h-4 w-4 mr-2" />
              로그인
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
