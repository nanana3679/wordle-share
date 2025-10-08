import { createClient } from "@/lib/supabase-server";
import { ReactNode } from "react";

export default async function DemoLayout({
  children,
}: {
  children: ReactNode;
}) {
  // 모든 하위 라우트에서 사용할 수 있도록 user 정보를 미리 가져옵니다
  const supabase = await createClient();
  await supabase.auth.getUser();

  return <>{children}</>;
}

