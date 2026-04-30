"use client";

import { Button } from "@/components/ui/button";
import { LogIn, LogOut } from "lucide-react";
import { User as SupabaseUser } from "@supabase/supabase-js";
import { useTranslations } from "next-intl";

interface UserAuthButtonsProps {
  user: SupabaseUser | null;
  onLogin: () => void;
  onLogout: () => void;
}

export function UserAuthButtons({ user, onLogin, onLogout }: UserAuthButtonsProps) {
  const t = useTranslations("Auth");
  return (
    <div className="flex items-center gap-4">
      {user ? (
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={onLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            {t("logout")}
          </Button>
        </div>
      ) : (
        <Button onClick={onLogin}>
          <LogIn className="w-4 h-4 mr-2" />
          {t("login")}
        </Button>
      )}
    </div>
  );
}
