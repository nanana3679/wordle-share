import { DecksContentInfinite } from "@/components/decks/DecksContentInfinite";
import { AppBar } from "@/components/layout/AppBar";
import { createClient } from "@/lib/supabase-server";

export default async function DecksPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <>
      <AppBar title="덱 목록" user={user} />
      <DecksContentInfinite />
    </>
  );
}
