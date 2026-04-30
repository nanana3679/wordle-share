import { AppBar } from "@/components/layout/AppBar";
import { createClient } from "@/lib/supabase-server";
import { getTranslations } from "next-intl/server";

export default async function DeckDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const t = await getTranslations("AppBar");

  return (
    <>
      <AppBar
        title={t("deckDetailTitle")}
        user={user}
        showBackButton
      />
      {children}
    </>
  );
}

