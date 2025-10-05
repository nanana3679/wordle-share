// 사용자 타입 정의
export type User = {
  id: string;
  email: string | null;
  name: string;
  avatar_url: string | null;
  created_at: string;
} | null;