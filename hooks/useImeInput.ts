import { useCallback, useEffect, useRef } from "react";
import type { ScriptAdapter } from "@/lib/scripts/types";

interface UseImeInputResult {
  inputRef: React.RefObject<HTMLInputElement | null>;
  inputProps: {
    onCompositionStart: React.CompositionEventHandler<HTMLInputElement>;
    onCompositionEnd: React.CompositionEventHandler<HTMLInputElement>;
    onInput: React.FormEventHandler<HTMLInputElement>;
    onBlur: React.FocusEventHandler<HTMLInputElement>;
  };
}

// OS IME composition 이벤트로부터 자모/모라 단위 입력을 누적하는 일반화된 hook.
// hidden input에 focus가 유지되어 있어야 IME가 동작한다.
// 한글/가나 등 IME 기반 스크립트가 공통으로 사용한다.
//
// 구현 노트:
// - input.value를 절대 비우지 않는다(브라우저별로 IME composition 상태가 깨져
//   두 번째 음절부터 composition이 시작되지 않는 케이스를 차단).
// - 대신 prevValueRef로 이전 길이를 추적해 "추가된 부분"만 dispatch한다.
// - compositionend는 e.data만 dispatch하고 prevValueRef를 현재 value로 동기화.
export function useImeInput(
  adapter: ScriptAdapter,
  onUnit: (unit: string) => void,
  enabled = true,
): UseImeInputResult {
  const inputRef = useRef<HTMLInputElement>(null);
  const composingRef = useRef(false);
  const prevValueRef = useRef("");

  // 활성화되면 가능한 즉시 focus, blur나 외부 클릭 시 다시 focus
  useEffect(() => {
    if (!enabled) return;
    const focusNow = () => inputRef.current?.focus();
    focusNow();
    // 첫 페인트 직후에도 한 번 더 시도 (SSR hydration timing 보강)
    const raf = requestAnimationFrame(focusNow);

    const refocusOnClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      // 인터랙티브 요소 클릭은 그쪽이 focus를 가져가도록 둔다
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

  const dispatch = useCallback(
    (value: string) => {
      if (!value) return;
      const units = adapter.splitUnits(value);
      for (const u of units) onUnit(u);
    },
    [adapter, onUnit],
  );

  const onCompositionStart = useCallback(() => {
    composingRef.current = true;
  }, []);

  const onCompositionEnd = useCallback(
    (e: React.CompositionEvent<HTMLInputElement>) => {
      composingRef.current = false;
      dispatch(e.data || "");
      // 다음 onInput diff의 기준점을 현재 value로 동기화
      prevValueRef.current = e.currentTarget.value;
    },
    [dispatch],
  );

  // 자모 단독키 입력이나 paste 등 composition을 거치지 않는 경로 보강.
  // value는 건드리지 않고 prev와의 차이만 dispatch.
  //
  // 주의: 일부 한글 IME에서 첫 input 이벤트가 compositionstart보다 먼저 발화한다.
  // 이때 composingRef는 아직 false라 첫 자모를 직접 dispatch해버리고, 이후 같은
  // 음절의 후속 자모들은 composition으로 흡수되어 dispatch되지 않는 버그가 생긴다.
  // 따라서 native event의 isComposing / inputType=insertCompositionText를 1차로 확인한다.
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
        dispatch(cur.slice(prev.length));
      }
      // 길이가 줄거나 prefix가 다른 경우(삭제·치환 등)는 게임 입력으로 간주하지 않는다.
      prevValueRef.current = cur;
    },
    [dispatch],
  );

  // 게임 중에는 hidden input이 다시 focus를 가져간다
  const onBlur = useCallback(() => {
    if (!enabled) return;
    // 다음 tick에 재focus (현재 focus를 가져간 요소가 자기 처리를 마치도록)
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  }, [enabled]);

  return {
    inputRef,
    inputProps: {
      onCompositionStart,
      onCompositionEnd,
      onInput,
      onBlur,
    },
  };
}
