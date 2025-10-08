/**
 * 서버 액션의 통일된 반환 타입
 * @template T - 성공 시 반환할 데이터의 타입
 */
export type ActionResponse<T = void> = {
  /** 작업 성공 여부 */
  success: boolean;
  /** 성공 시 반환할 실제 데이터 (선택적) */
  data?: T;
  /** 사용자에게 표시할 오류 또는 성공 메시지 (필수) */
  message: string;
  /** Zod와 같은 유효성 검사 실패 시 필드별 오류 목록 (선택적) */
  fieldErrors?: { [key: string]: string[] };
};

