import { createClient } from "@/lib/supabase-server";

export async function getAnonUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

// 익명 세션이 없으면 lazy 발급한다.
// ADR 0001은 미들웨어 자동 발급을 제시하지만, 모든 방문(봇 포함)마다
// 익명 유저가 쌓이는 것을 피해 "첫 쓰기/플레이 시점" 발급으로 운영한다.
export async function getOrCreateAnonUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) return user.id;

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error || !data.user) return null;
  return data.user.id;
}
