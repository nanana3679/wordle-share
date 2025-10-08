import { DecksContent } from "@/components/decks/DecksContent";
import { getDecks } from "@/app/actions/deck";
import { AppBar } from "@/components/layout/AppBar";
import { createClient } from "@/lib/supabase-server";

export default async function DecksPage() {
  const response = await getDecks();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <>
      <AppBar title="덱 목록" user={user} />
      <DecksContent initialDecks={response.data || []} />
    </>
  );
}
