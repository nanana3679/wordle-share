import { ActionResponse } from "@/types/action";

/**
 * 서버 액션을 안전하게 실행하는 헬퍼 함수
 * try-catch로 감싸서 에러를 자동으로 처리하고 ActionResponse 형식으로 반환합니다.
 * 
 * @template T - 성공 시 반환할 데이터의 타입
 * @param actionFn - 실행할 서버 액션 로직
 * @returns ActionResponse<T> 형식의 결과
 */

export async function safeAction<T = void>(
  actionFn: () => Promise<ActionResponse<T>>
): Promise<ActionResponse<T>> {
  try {
    // 실제 서버 액션 로직 실행
    return await actionFn();
  } catch (error) {
    // 오류 포착 및 로깅
    console.error("[Server Action Error]", error);
    
    // 일반 Error 처리
    if (error instanceof Error) {
      return {
        success: false,
        message: error.message,
      };
    }
    
    // 알 수 없는 오류
    return {
      success: false,
      message: "알 수 없는 서버 오류가 발생했습니다.",
    };
  }
}