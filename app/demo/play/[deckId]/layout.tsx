import { AppBar } from "@/components/layout/AppBar";
import { createClient } from "@/lib/supabase-server";
import { getDeck } from "@/app/actions/deck";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

export default async function PlayLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ deckId: string }>;
}) {
  const { deckId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: deck } = await getDeck(deckId);
  const t = await getTranslations("AppBar");

  if (!deck) {
    notFound();
  }

  return (
    <>
      <AppBar
        title={deck?.name || t("playFallbackTitle")}
        showBackButton
        user={user}
      />
      {children}
    </>
  );
}

