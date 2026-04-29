import { useCallback, useEffect, useRef } from "react";
import type { ScriptAdapter } from "@/lib/scripts/types";

interface UseImeInputOptions {
  adapter: ScriptAdapter;
  onUnit: (unit: string) => void;
  onBackspace: () => void;
  enabled?: boolean;
}

interface UseImeInputResult {
  inputRef: React.RefObject<HTMLInputElement | null>;
  inputProps: {
    onCompositionStart: React.CompositionEventHandler<HTMLInputElement>;
    onCompositionUpdate: React.CompositionEventHandler<HTMLInputElement>;
    onCompositionEnd: React.CompositionEventHandler<HTMLInputElement>;
    onInput: React.FormEventHandler<HTMLInputElement>;
    onBlur: React.FocusEventHandler<HTMLInputElement>;
  };
}

// OS IME composition 이벤트로부터 자모/모라 단위 입력을 누적하는 일반화된 hook.
//
// 핵심 아이디어: `compositionupdate`로 실시간 자모를 dispatch한다.
// - 한국어 IME는 ㄱ을 입력해도 즉시 commit하지 않고 다음 입력을 기다린다
//   (compositionend는 다음 음절이 시작되거나 composition이 끊길 때만 발화).
// - compositionend에만 의존하면 모든 입력이 한 박자씩 밀려 보인다.
// - 따라서 매 compositionupdate마다 현재 composition의 자모 시퀀스와 직전
//   dispatch한 시퀀스의 공통 prefix를 비교해, 줄어든 만큼 onBackspace,
//   늘어난 만큼 onUnit을 호출한다.
export function useImeInput({
  adapter,
  onUnit,
  onBackspace,
  enabled = true,
}: UseImeInputOptions): UseImeInputResult {
  const inputRef = useRef<HTMLInputElement>(null);
  const composingRef = useRef(false);
  // 현재 진행 중인 composition으로 누적 dispatch한 자모 시퀀스
  const compositionUnitsRef = useRef<string[]>([]);
  // composition 외 경로(direct paste 등)용 prev value
  const prevValueRef = useRef("");

  // 활성화되면 가능한 즉시 focus, blur나 외부 클릭 시 다시 focus
  useEffect(() => {
    if (!enabled) return;
    const focusNow = () => inputRef.current?.focus();
    focusNow();
    const raf = requestAnimationFrame(focusNow);

    const refocusOnClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest("button, input, textarea, select, [contenteditable]")) {
        return;
      }
      inputRef.current?.focus();
    };
    window.addEventListener("click", refocusOnClick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("click", refocusOnClick);
    };
  }, [enabled]);

  // 직전 dispatch 자모 시퀀스(prev)와 새 시퀀스(next)를 비교해
  // 공통 prefix 이후를 backspace + 새 자모 dispatch로 동기화.
  const reconcile = useCallback(
    (prev: string[], next: string[]) => {
      let common = 0;
      while (common < prev.length && common < next.length && prev[common] === next[common]) {
        common++;
      }
      for (let i = prev.length - 1; i >= common; i--) {
        onBackspace();
      }
      for (let i = common; i < next.length; i++) {
        onUnit(next[i]);
      }
    },
    [onUnit, onBackspace],
  );

  const onCompositionStart = useCallback(() => {
    composingRef.current = true;
    compositionUnitsRef.current = [];
  }, []);

  const onCompositionUpdate = useCallback(
    (e: React.CompositionEvent<HTMLInputElement>) => {
      const next = adapter.splitUnits(e.data || "");
      reconcile(compositionUnitsRef.current, next);
      compositionUnitsRef.current = next;
    },
    [adapter, reconcile],
  );

  const onCompositionEnd = useCallback(
    (e: React.CompositionEvent<HTMLInputElement>) => {
      composingRef.current = false;
      // compositionupdate가 처리했지만, 마지막 update와 end의 data가 어긋나는
      // 브라우저 변종 보강 (Windows MS IME 등에서 종성 처리 차이).
      const finalUnits = adapter.splitUnits(e.data || "");
      reconcile(compositionUnitsRef.current, finalUnits);
      compositionUnitsRef.current = [];
      prevValueRef.current = e.currentTarget.value;
    },
    [adapter, reconcile],
  );

  // composition을 거치지 않는 직접 입력(자모 단독키, paste 등) 보강.
  const onInput = useCallback(
    (e: React.FormEvent<HTMLInputElement>) => {
      const native = e.nativeEvent as InputEvent;
      if (composingRef.current) return;
      if (native.isComposing) return;
      if (typeof native.inputType === "string" && native.inputType.startsWith("insertCompositionText")) {
        return;
      }
      const cur = e.currentTarget.value;
      const prev = prevValueRef.current;
      if (cur.length > prev.length && cur.startsWith(prev)) {
        const added = cur.slice(prev.length);
        for (const u of adapter.splitUnits(added)) onUnit(u);
      }
      prevValueRef.current = cur;
    },
    [adapter, onUnit],
  );

  const onBlur = useCallback(() => {
    if (!enabled) return;
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  }, [enabled]);

  return {
    inputRef,
    inputProps: {
      onCompositionStart,
      onCompositionUpdate,
      onCompositionEnd,
      onInput,
      onBlur,
    },
  };
}
