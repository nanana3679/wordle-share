"use client";

import { toast } from "sonner";
import { ActionResponse } from "@/types/action";

/**
 * 서버 액션을 실행하고 결과 메시지를 자동으로 toast로 표시하는 헬퍼 함수
 * 
 * @template T - 서버 액션이 반환하는 데이터의 타입
 * @param actionFn - 실행할 서버 액션 함수
 * @param options - 추가 옵션
 * @returns 서버 액션의 결과
 * 
 * @example
 * ```tsx
 * const handleSubmit = async () => {
 *   const result = await actionWithToast(() => createDeck(formData));
 *   if (result.success) {
 *     // 성공 시 추가 처리
 *     router.push('/decks');
 *   }
 * };
 * ```
 * 
 * @example
 * ```tsx
 * // 메시지를 표시하지 않고 싶을 때
 * const result = await actionWithToast(
 *   () => getDeck(deckId),
 *   { showToast: false }
 * );
 * ```
 */
export async function actionWithToast<T>(
  actionFn: () => Promise<ActionResponse<T>>,
  options?: {
    /** toast를 표시할지 여부 (기본값: true) */
    showToast?: boolean;
    /** 성공 시에만 toast를 표시할지 여부 (기본값: false) */
    showOnlySuccess?: boolean;
    /** 실패 시에만 toast를 표시할지 여부 (기본값: false) */
    showOnlyError?: boolean;
  }
): Promise<ActionResponse<T>> {
  const {
    showToast = true,
    showOnlySuccess = false,
    showOnlyError = false,
  } = options || {};

  try {
    const result = await actionFn();

    if (showToast) {
      if (result.success) {
        // 성공 시 toast 표시
        if (!showOnlyError) {
          toast.success(result.message);
        }
      } else {
        // 실패 시 toast 표시
        if (!showOnlySuccess) {
          // fieldErrors가 있으면 각 필드의 에러도 표시
          if (result.fieldErrors) {
            const errorMessages = Object.entries(result.fieldErrors)
              .flatMap(([fieldName, errors]) => errors.map(error => `[${fieldName}] ${error}`))
              .join(", ");
            toast.error(`${result.message}\n${errorMessages}`);
          } else {
            toast.error(result.message);
          }
        }
      }
    }

    return result;
  } catch (error) {
    // 예상치 못한 에러 처리
    const errorMessage = error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
    
    if (showToast && !showOnlySuccess) {
      toast.error(errorMessage);
    }

    return {
      success: false,
      message: errorMessage,
    };
  }
}
