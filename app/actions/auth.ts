"use server";

import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

export async function signInWithGoogle() {
  const supabase = await createClient();

  const { data } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  });

  if (data.url) {
    redirect(data.url);
  }
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/demo/decks");
}