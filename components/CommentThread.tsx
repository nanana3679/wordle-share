"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { CommentForm } from "@/components/CommentForm";
import { CommentDeleteButton } from "@/components/CommentDeleteButton";
import { ReportButton } from "@/components/ReportButton";
import { getComments, type CommentThreadsView } from "@/app/actions/comment";
import { cn } from "@/lib/utils";

function localDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

interface CommentThreadProps {
  deckId: string;
}

// (deck, date) 단위 thread를 날짜 헤더로 그룹해 최신순 표시 (#47).
// 가시성 게이트는 server action(getComments)이 계산한다 — 클라이언트는 결과만 렌더.
export function CommentThread({ deckId }: CommentThreadProps) {
  const t = useTranslations("comments");
  const [view, setView] = useState<CommentThreadsView | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [today] = useState(localDate);

  const reload = useCallback(async () => {
    const result = await getComments(deckId, today);
    if (result.success && result.data) {
      setView(result.data);
      setLoadError(null);
    } else {
      setLoadError(result.message);
    }
  }, [deckId, today]);

  useEffect(() => {
    void reload();
  }, [reload]);

  if (loadError) return <p className="text-sm text-destructive">{loadError}</p>;
  if (!view) return <p className="text-sm text-muted-foreground">{t("loading")}</p>;

  return (
    <section className="space-y-6">
      <h2 className="text-lg font-bold">{t("title")}</h2>

      {view.todayLocked ? (
        <div className="rounded-lg border p-4 text-center text-sm text-muted-foreground">
          {t("todayLocked")}
        </div>
      ) : (
        <CommentForm deckId={deckId} writerToday={today} onCreated={reload} />
      )}

      {view.threads.length === 0 && !view.todayLocked && (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      )}

      {view.threads.map((thread) => (
        <div key={thread.date} className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground">{thread.date}</h3>
          <ul className="space-y-3">
            {thread.comments.map((comment) => (
              <li key={comment.id} className="rounded-lg border p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{comment.displayNick}</span>
                  <div className="flex items-center gap-1">
                    {!comment.hidden && (
                      <ReportButton targetType="comment" targetId={comment.id} />
                    )}
                    <CommentDeleteButton commentId={comment.id} onDeleted={reload} />
                  </div>
                </div>
                <p
                  className={cn(
                    "mt-1 whitespace-pre-wrap text-sm",
                    comment.hidden && "italic text-muted-foreground",
                  )}
                >
                  {comment.text}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
