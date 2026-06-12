"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { actionWithToast } from "@/lib/action-with-toast";
import { reportTarget } from "@/app/actions/report";
import type { ReportTargetType } from "@/lib/moderation";

interface ReportButtonProps {
  targetType: ReportTargetType;
  targetId: string;
}

export function ReportButton({ targetType, targetId }: ReportButtonProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const result = await actionWithToast(() =>
        reportTarget({ targetType, targetId, reason }),
      );
      if (result.success) {
        setOpen(false);
        setReason("");
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
          신고
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64">
        <form onSubmit={handleSubmit} className="space-y-2">
          <p className="text-xs text-muted-foreground">
            부적절한 {targetType === "deck" ? "덱" : "댓글"}을 신고합니다.
          </p>
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="사유 (선택)"
            maxLength={200}
          />
          <Button type="submit" size="sm" disabled={submitting} className="w-full">
            {submitting ? "신고 중..." : "신고하기"}
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}
