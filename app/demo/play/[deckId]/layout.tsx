import { AppBar } from "@/components/layout/AppBar";
import { createClient } from "@/lib/supabase-server";

export default async function PlayLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { deckId: string };
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // deck 정보 가져오기 (이름만 필요)
  const { data: deck } = await supabase
    .from("decks")
    .select("name")
    .eq("id", params.deckId)
    .single();

  return (
    <>
      <AppBar 
        title={deck?.name || "Wordle 게임"} 
        showBackButton 
        user={user}
      />
      {children}
    </>
  );
}

