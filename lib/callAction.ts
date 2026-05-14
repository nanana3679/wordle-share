"use client";

import { toast } from "sonner";
import { ActionResponse } from "@/types/action";

/**
 * 서버 액션을 실행하는 통합 헬퍼 함수.
 * NEXT_REDIRECT/NEXT_NOT_FOUND는 re-throw하고, 그 외 에러는 ActionResponse로 변환합니다.
 *
 * toast 옵션 동작:
 * - `toast` 자체가 없으면 → toast 없음
 * - `toast.success`가 있으면 → 성공 시 해당 문자열로 toast
 * - `toast.error`가 없으면 → 실패 시 서버 message 사용
 * - `toast.error`가 빈 문자열이면 → 실패 toast 안 띄움
 * - `toast.error`가 false이면 → 실패 toast 안 띄움
 *
 * @template T - 서버 액션이 반환하는 데이터의 타입
 * @param action - 실행할 서버 액션 함수
 * @param options - 추가 옵션
 *
 * @example
 * // toast 없이 실행
 * const result = await callAction(() => createLike(deckId));
 *
 * @example
 * // 성공/실패 toast 표시
 * const result = await callAction(
 *   () => deleteDeck(id),
 *   { toast: { success: "삭제 완료", error: "삭제 실패" } }
 * );
 *
 * @example
 * // 실패 toast만 표시 (성공 toast 없음), 실패 시 서버 message 사용
 * const result = await callAction(
 *   () => deleteDeck(id),
 *   { toast: {} }
 * );
 *
 * @example
 * // 실패 toast 비활성화 (빈 문자열 또는 false)
 * const result = await callAction(
 *   () => createLike(deckId),
 *   { toast: { error: "" } }
 * );
 *
 * @example
 * // onSuccess/onError 콜백 활용
 * const result = await callAction(
 *   () => updateDeck(id, formData),
 *   {
 *     toast: { success: "수정 완료" },
 *     onSuccess: (data) => router.push(`/decks/${data.id}`),
 *     onError: (fieldErrors) => setErrors(fieldErrors),
 *   }
 * );
 */

/** toast.error 값이 "억제" 조건인지 확인 (false 또는 빈 문자열) */
function isSuppressed(error: string | false | undefined): boolean {
  return error === false || error === "";
}

export async function callAction<T>(
  action: () => Promise<ActionResponse<T>>,
  options?: {
    toast?: {
      /** 있을 때만 성공 toast 표시 */
      success?: string;
      /**
       * - 없으면(undefined) → 실패 시 서버 message 사용
       * - 빈 문자열("") 또는 false → 실패 toast 안 띄움
       * - 문자열 → 해당 문자열로 toast
       */
      error?: string | false;
    };
    onSuccess?: (data: T) => void;
    onError?: (fieldErrors: Record<string, string[]> | undefined) => void;
  }
): Promise<ActionResponse<T>> {
  try {
    const result = await action();

    if (result.success) {
      if (options?.toast?.success !== undefined) {
        toast.success(options.toast.success);
      }

      if (options?.onSuccess && result.data !== undefined) {
        options.onSuccess(result.data as T);
      }
    } else {
      if (options?.toast !== undefined && !isSuppressed(options.toast.error)) {
        const errorMessage = options.toast.error ?? result.message;
        toast.error(errorMessage);
      }

      if (options?.onError) {
        options.onError(result.fieldErrors);
      }
    }

    return result;
  } catch (error) {
    // Next.js redirect() / notFound()는 정상 흐름이므로 re-throw
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      typeof (error as { digest: unknown }).digest === "string" &&
      (
        (error as { digest: string }).digest.startsWith("NEXT_REDIRECT") ||
        (error as { digest: string }).digest.startsWith("NEXT_NOT_FOUND")
      )
    ) {
      throw error;
    }

    console.error("[callAction Error]", error);

    const message =
      error instanceof Error ? error.message : "알 수 없는 서버 오류가 발생했습니다.";

    if (options?.toast !== undefined && !isSuppressed(options.toast.error)) {
      toast.error(options.toast.error ?? message);
    }

    if (options?.onError) {
      options.onError(undefined);
    }

    return { success: false, message };
  }
}
