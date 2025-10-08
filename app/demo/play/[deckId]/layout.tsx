import { AppBar } from "@/components/layout/AppBar";
import { createClient } from "@/lib/supabase-server";

export default async function PlayLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <>
      <AppBar 
        title="Wordle 게임" 
        showBackButton 
        backButtonText="덱 상세로"
        user={user}
      />
      {children}
    </>
  );
}

