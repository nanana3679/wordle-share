"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { actionWithToast } from "@/lib/action-with-toast";
import { createComment } from "@/app/actions/comment";
import { loadCachedCredentials, saveCachedCredentials } from "@/lib/credentialCache";

interface CommentFormProps {
  deckId: string;
  writerToday: string;
  onCreated: () => void;
}

export function CommentForm({ deckId, writerToday, onCreated }: CommentFormProps) {
  const [text, setText] = useState("");
  const [nick, setNick] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // ADR 0001: 단일 (nick, pw) convention — localStorage 캐시로 자동 채움
  useEffect(() => {
    const cached = loadCachedCredentials();
    if (cached) {
      setNick(cached.nick);
      setPassword(cached.password);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const result = await actionWithToast(() =>
        createComment({ deckId, text, nick, password, writerToday }),
      );
      if (result.success) {
        saveCachedCredentials({ nick: nick.trim(), password });
        setText("");
        onCreated();
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="오늘의 단어에 대해 한마디 (결과를 붙여넣어도 좋아요)"
        maxLength={500}
        rows={3}
        required
      />
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={nick}
          onChange={(e) => setNick(e.target.value)}
          placeholder="닉네임"
          maxLength={20}
          className="w-32"
          required
        />
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="비밀번호"
          minLength={4}
          maxLength={64}
          className="w-32"
          required
        />
        <Button type="submit" disabled={submitting}>
          {submitting ? "작성 중..." : "댓글 남기기"}
        </Button>
      </div>
    </form>
  );
}
