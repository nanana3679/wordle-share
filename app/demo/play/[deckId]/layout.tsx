import { AppBar } from "@/components/layout/AppBar";
import { createClient } from "@/lib/supabase-server";
import { getDeck } from "@/app/actions/deck";
import { notFound } from "next/navigation";

export default async function PlayLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { deckId: string };
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: deck } = await getDeck(params.deckId);

  if (!deck) {
    notFound();
  }

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

