"use client";

import { toast } from "sonner";
import { ActionResponse } from "@/types/action";

/**
 * 서버 액션을 실행하는 통합 헬퍼 함수.
 * NEXT_REDIRECT/NEXT_NOT_FOUND는 re-throw하고, 그 외 에러는 ActionResponse로 변환합니다.
 * toast 옵션을 지정하면 결과 메시지를 자동으로 표시합니다.
 *
 * @template T - 서버 액션이 반환하는 데이터의 타입
 * @param action - 실행할 서버 액션 함수
 * @param options - 추가 옵션
 *
 * @example
 * // 토스트 없이 실행
 * const result = await callAction(() => createLike(deckId));
 *
 * @example
 * // 성공/실패 토스트 표시
 * const result = await callAction(
 *   () => deleteDeck(id),
 *   { toast: { success: "삭제 완료", error: "삭제 실패" } }
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
export async function callAction<T>(
  action: () => Promise<ActionResponse<T>>,
  options?: {
    toast?: {
      success?: string;
      /** 없으면 서버 message 사용 */
      error?: string;
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
      } else if (options?.toast && result.message) {
        // toast 옵션이 있지만 success 키가 없으면 서버 message 사용
        toast.success(result.message);
      }

      if (options?.onSuccess && result.data !== undefined) {
        options.onSuccess(result.data as T);
      }
    } else {
      if (options?.toast !== undefined) {
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

    if (options?.toast !== undefined) {
      toast.error(options.toast.error ?? message);
    }

    if (options?.onError) {
      options.onError(undefined);
    }

    return { success: false, message };
  }
}
