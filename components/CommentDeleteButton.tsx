"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { actionWithToast } from "@/lib/action-with-toast";
import { deleteComment } from "@/app/actions/comment";
import { loadCachedCredentials } from "@/lib/credentialCache";

interface CommentDeleteButtonProps {
  commentId: string;
  onDeleted: () => void;
}

// nick+pw 일치 시 삭제 — 디바이스 무관 (ADR 0007). 검증은 서버에서만.
export function CommentDeleteButton({ commentId, onDeleted }: CommentDeleteButtonProps) {
  const [open, setOpen] = useState(false);
  const [nick, setNick] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    const cached = loadCachedCredentials();
    if (cached) {
      setNick(cached.nick);
      setPassword(cached.password);
    }
  }, [open]);

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const result = await actionWithToast(() =>
        deleteComment({ commentId, nick, password }),
      );
      if (result.success) {
        setOpen(false);
        onDeleted();
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-muted-foreground"
        >
          삭제
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64">
        <form onSubmit={handleDelete} className="space-y-2">
          <p className="text-xs text-muted-foreground">
            작성할 때 쓴 닉네임과 비밀번호를 입력하세요.
          </p>
          <Input
            value={nick}
            onChange={(e) => setNick(e.target.value)}
            placeholder="닉네임"
            required
          />
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호"
            required
          />
          <Button type="submit" size="sm" disabled={submitting} className="w-full">
            {submitting ? "삭제 중..." : "삭제"}
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}
