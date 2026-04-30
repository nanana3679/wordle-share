"use server";

import { createClient } from "@/lib/supabase-server";
import { ActionResponse } from "@/types/action";
import { safeAction } from "@/lib/safe-action";
import { getTranslations } from "next-intl/server";

export async function createLike(deckId: string): Promise<ActionResponse> {
  return safeAction(async () => {
    const supabase = await createClient();
    const tAuth = await getTranslations("Auth");
    const tLike = await getTranslations("Like");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return {
        success: false,
        message: tAuth("loginRequired"),
      };
    }

    const { data, error } = await supabase.from("likes").insert({ deck_id: deckId, user_id: user.id });
    console.log("createLike", data, error);

    if (error) {
      return {
        success: false,
        message: tLike("errors.createFailed", { message: error.message }),
      };
    }

    return {
      success: true,
      message: tLike("messages.created"),
    };
  });
}

export async function deleteLike(deckId: string): Promise<ActionResponse> {
  return safeAction(async () => {
    const supabase = await createClient();
    const tAuth = await getTranslations("Auth");
    const tLike = await getTranslations("Like");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return {
        success: false,
        message: tAuth("loginRequired"),
      };
    }
    const { data, error } = await supabase.from("likes").delete().eq("deck_id", deckId);
    console.log("deleteLike", data, error);

    if (error) {
      return {
        success: false,
        message: tLike("errors.deleteFailed", { message: error.message }),
      };
    }

    return {
      success: true,
      message: tLike("messages.deleted"),
    };
  });
}
