"use server";

import { createAdminClient } from "@/lib/supabase-admin";
import { User } from "@supabase/supabase-js";
import { ActionResponse } from "@/types/action";
import { safeAction } from "@/lib/safe-action";
import { getTranslations } from "next-intl/server";

export async function getUserInfo(userId: string): Promise<ActionResponse<User>> {
  return safeAction(async () => {
    const supabase = createAdminClient();
    const tErrors = await getTranslations("Auth.errors");
    const tMessages = await getTranslations("Auth.messages");

    const { data, error } = await supabase.auth.admin.getUserById(userId);

    if (error) {
      return {
        success: false,
        message: tErrors("userInfoFailed", { message: error.message }),
      };
    }

    return {
      success: true,
      data: data.user as User,
      message: tMessages("userInfoSuccess"),
    };
  });
}
