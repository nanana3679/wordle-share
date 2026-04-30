"use server";

import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { ActionResponse } from "@/types/action";
import { safeAction } from "@/lib/safe-action";
import { User } from "@supabase/supabase-js";
import { getTranslations } from "next-intl/server";

export async function signInWithGoogle(): Promise<ActionResponse<string>> {
  return safeAction(async () => {
    const supabase = await createClient();
    const t = await getTranslations("Auth.errors");

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
      },
    });

    if (error) {
      return {
        success: false,
        message: t("googleFailed", { message: error.message }),
      };
    }

    if (data.url) {
      redirect(data.url);
    }

    return {
      success: false,
      message: t("loginUrlFailed"),
    };
  });
}

export async function signOut(): Promise<ActionResponse> {
  return safeAction(async () => {
    const supabase = await createClient();
    const t = await getTranslations("Auth.errors");
    const { error } = await supabase.auth.signOut();

    if (error) {
      return {
        success: false,
        message: t("logoutFailed", { message: error.message }),
      };
    }

    redirect("/demo/decks");
  });
}

export async function getUser(): Promise<ActionResponse<User | null>> {
  return safeAction(async () => {
    const supabase = await createClient();
    const tErrors = await getTranslations("Auth.errors");
    const tMessages = await getTranslations("Auth.messages");
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      return {
        success: false,
        message: tErrors("userInfoFailed", { message: error.message }),
      };
    }
    return {
      success: true,
      data: user,
      message: tMessages("userInfoSuccess"),
    };
  });
}