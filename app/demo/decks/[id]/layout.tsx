import { AppBar } from "@/components/layout/AppBar";
import { createClient } from "@/lib/supabase-server";

export default async function DeckDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <>
      <AppBar 
        title="덱 상세" 
        user={user} 
        showBackButton
        backButtonText="덱 목록으로"
      />
      {children}
    </>
  );
}

