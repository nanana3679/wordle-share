"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const STORAGE_KEY = "kana-rules-seen";

const RULES_CONTENT = (
  <div className="space-y-4 text-sm">
    <div>
      <p className="font-semibold text-base">日本語(かな)モード ルール</p>
      <ol className="mt-2 list-decimal pl-4 space-y-1">
        <li>
          カタカナとひらがなは同じ文字として扱われます。
          <span className="ml-1 text-muted-foreground">例: カ = か, ア = あ</span>
        </li>
        <li>
          小さい仮名も1マスを使います。
          <span className="ml-1 text-muted-foreground">例: きゃ = き + ゃ, ふぉ = ふ + ぉ</span>
        </li>
        <li>
          促音 っ, 長音 ー, 撥音 ん もそれぞれ1マスを使います。
          <span className="ml-1 text-muted-foreground">例: がっこう = が + っ + こ + う / カード = か + ー + ど</span>
        </li>
      </ol>
    </div>
    <hr className="border-border" />
    <div>
      <p className="font-semibold text-base">일본어(가나) 모드 규칙</p>
      <ol className="mt-2 list-decimal pl-4 space-y-1">
        <li>
          가타카나와 히라가나는 같은 글자로 취급됩니다.
          <span className="ml-1 text-muted-foreground">예: カ = か, ア = あ</span>
        </li>
        <li>
          작은 가나도 한 칸을 차지합니다.
          <span className="ml-1 text-muted-foreground">예: きゃ = き + ゃ, ふぉ = ふ + ぉ</span>
        </li>
        <li>
          촉음 っ, 장음 ー, 발음 ん 도 각각 한 칸을 차지합니다.
          <span className="ml-1 text-muted-foreground">예: がっこう = が + っ + こ + う / カード = か + ー + ど</span>
        </li>
      </ol>
    </div>
  </div>
);

/** 최초 방문 모달: localStorage에 확인 기록이 없을 때 1회 표시. */
function KanaFirstPlayModal({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="kana-rules-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div className="bg-background border rounded-lg shadow-lg max-w-md w-full p-6 space-y-4">
        <h2 id="kana-rules-title" className="text-lg font-bold">
          かな모드 규칙 안내
        </h2>
        {RULES_CONTENT}
        <div className="pt-2 text-center">
          <Button type="button" onClick={onDismiss}>
            확인했습니다
          </Button>
        </div>
      </div>
    </div>
  );
}

/** 화면에 상시 표시되는 물음표(?) 도움말 버튼 + Popover. */
function KanaHelpButton() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label="가나 모드 규칙 보기"
          className="rounded-full"
        >
          ?
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 max-h-[80vh] overflow-y-auto">
        {RULES_CONTENT}
      </PopoverContent>
    </Popover>
  );
}

/**
 * 가나(kana) 덱 전용 규칙 안내 컴포넌트.
 * - 첫 방문 시 모달을 1회 표시하고 localStorage에 기록.
 * - 상시 노출되는 ? 버튼으로 규칙을 다시 볼 수 있음.
 * - 이 컴포넌트는 script === 'kana'인 경우에만 마운트한다.
 */
export function KanaRulesHelp() {
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        setShowModal(true);
      }
    } catch {
      // localStorage 접근 불가 환경 (e.g. SSR 잔재, private mode 제한) — 무시
    }
  }, []);

  const handleDismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore
    }
    setShowModal(false);
  };

  return (
    <>
      {showModal && <KanaFirstPlayModal onDismiss={handleDismiss} />}
      <div className="flex justify-end">
        <KanaHelpButton />
      </div>
    </>
  );
}
