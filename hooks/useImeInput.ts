import { useCallback, useEffect, useRef } from "react";
import type { ScriptAdapter } from "@/lib/scripts/types";

interface UseImeInputResult {
  inputRef: React.RefObject<HTMLInputElement | null>;
  inputProps: {
    onCompositionStart: React.CompositionEventHandler<HTMLInputElement>;
    onCompositionEnd: React.CompositionEventHandler<HTMLInputElement>;
    onInput: React.FormEventHandler<HTMLInputElement>;
  };
}

// OS IME composition 이벤트로부터 자모/모라 단위 입력을 누적하는 일반화된 hook.
// hidden input에 focus가 유지되어 있어야 IME가 동작한다.
// 한글/가나 등 IME 기반 스크립트가 공통으로 사용한다.
export function useImeInput(
  adapter: ScriptAdapter,
  onUnit: (unit: string) => void,
  enabled = true,
): UseImeInputResult {
  const inputRef = useRef<HTMLInputElement>(null);
  const composingRef = useRef(false);
  // compositionend 직후 같은 값으로 input이 재발화하는 브라우저(Safari 일부) 대응
  const justFlushedRef = useRef(false);

  // 활성화되면 마운트 직후 focus, 외부 클릭 시 다시 focus
  useEffect(() => {
    if (!enabled) return;
    inputRef.current?.focus();
    const refocus = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      // 인터랙티브 요소(키보드 버튼, 다이얼로그 등) 클릭은 그쪽이 focus를 가져가도록 둔다
      if (target?.closest("button, input, textarea, select, [contenteditable]")) {
        return;
      }
      inputRef.current?.focus();
    };
    window.addEventListener("click", refocus);
    return () => window.removeEventListener("click", refocus);
  }, [enabled]);

  const flush = useCallback(
    (value: string) => {
      if (!value) return;
      const units = adapter.splitUnits(value);
      for (const u of units) onUnit(u);
      if (inputRef.current) inputRef.current.value = "";
    },
    [adapter, onUnit],
  );

  const onCompositionStart = useCallback(() => {
    composingRef.current = true;
  }, []);

  const onCompositionEnd = useCallback(
    (e: React.CompositionEvent<HTMLInputElement>) => {
      composingRef.current = false;
      flush(e.currentTarget.value);
      justFlushedRef.current = true;
      queueMicrotask(() => {
        justFlushedRef.current = false;
      });
    },
    [flush],
  );

  // 자모 단독키 입력이나 paste 등 composition을 거치지 않는 경로 보강.
  // compositionend 직후 같은 음절이 두 번 누적되지 않도록 justFlushedRef로 한 틱 가드.
  const onInput = useCallback(
    (e: React.FormEvent<HTMLInputElement>) => {
      if (composingRef.current || justFlushedRef.current) return;
      flush(e.currentTarget.value);
    },
    [flush],
  );

  return {
    inputRef,
    inputProps: { onCompositionStart, onCompositionEnd, onInput },
  };
}
