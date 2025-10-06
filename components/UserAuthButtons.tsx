"use client";

import { Button } from "@/components/ui/button";
import { LogIn, LogOut } from "lucide-react";
import { User as SupabaseUser } from "@supabase/supabase-js";

interface UserAuthButtonsProps {
  user: SupabaseUser | null;
  onLogin: () => void;
  onLogout: () => void;
}

export function UserAuthButtons({ user, onLogin, onLogout }: UserAuthButtonsProps) {
  return (
    <div className="flex items-center gap-4">
      {user ? (
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={onLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            로그아웃
          </Button>
        </div>
      ) : (
        <Button onClick={onLogin}>
          <LogIn className="w-4 h-4 mr-2" />
          로그인
        </Button>
      )}
    </div>
  );
}
