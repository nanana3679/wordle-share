import { unstable_rethrow } from "next/navigation";
import { ActionResponse } from "@/types/action";

/**
 * 서버 액션 내부에서 사용하는 safe wrapper.
 * NEXT_REDIRECT / NEXT_NOT_FOUND는 re-throw하고, 그 외 예외는 ActionResponse로 변환합니다.
 *
 * @example
 * export async function myAction(): Promise<ActionResponse> {
 *   return safeAction(async () => {
 *     // ...
 *     return { success: true, message: "완료" };
 *   });
 * }
 */
export async function safeAction<T>(
  fn: () => Promise<ActionResponse<T>>
): Promise<ActionResponse<T>> {
  try {
    return await fn();
  } catch (e) {
    unstable_rethrow(e); // Next.js redirect/notFound 에러는 여기서 re-throw
    return {
      success: false,
      message: e instanceof Error ? e.message : "오류가 발생했습니다.",
    };
  }
}
