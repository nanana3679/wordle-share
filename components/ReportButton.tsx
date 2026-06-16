"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("report");
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
          {t("trigger")}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64">
        <form onSubmit={handleSubmit} className="space-y-2">
          <p className="text-xs text-muted-foreground">
            {t("description", { target: t(`target.${targetType}`) })}
          </p>
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t("reasonPlaceholder")}
            maxLength={200}
          />
          <Button type="submit" size="sm" disabled={submitting} className="w-full">
            {submitting ? t("submitting") : t("submit")}
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}
