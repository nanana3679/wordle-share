"use server";

import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { ActionResponse } from "@/types/action";
import { User } from "@supabase/supabase-js";

export async function signInWithGoogle(): Promise<ActionResponse<string>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
      },
    });

    if (error) {
      return {
        success: false,
        message: `구글 로그인에 실패했습니다: ${error.message}`,
      };
    }

    if (data.url) {
      redirect(data.url);
    }

    return {
      success: false,
      message: "로그인 URL을 생성하지 못했습니다.",
    };
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      typeof (error as { digest: unknown }).digest === "string" &&
      (
        (error as { digest: string }).digest.startsWith("NEXT_REDIRECT") ||
        (error as { digest: string }).digest.startsWith("NEXT_NOT_FOUND")
      )
    ) {
      throw error;
    }
    console.error("[Server Action Error]", error);
    if (error instanceof Error) return { success: false, message: error.message };
    return { success: false, message: "알 수 없는 서버 오류가 발생했습니다." };
  }
}

export async function signOut(): Promise<ActionResponse> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      return {
        success: false,
        message: `로그아웃에 실패했습니다: ${error.message}`,
      };
    }

    redirect("/demo/decks");
    // unreachable: redirect() always throws
    return { success: true, message: "" };
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      typeof (error as { digest: unknown }).digest === "string" &&
      (
        (error as { digest: string }).digest.startsWith("NEXT_REDIRECT") ||
        (error as { digest: string }).digest.startsWith("NEXT_NOT_FOUND")
      )
    ) {
      throw error;
    }
    console.error("[Server Action Error]", error);
    if (error instanceof Error) return { success: false, message: error.message };
    return { success: false, message: "알 수 없는 서버 오류가 발생했습니다." };
  }
}

export async function getUser(): Promise<ActionResponse<User | null>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      return {
        success: false,
        message: `사용자 정보를 가져오는데 실패했습니다: ${error.message}`,
      };
    }
    return {
      success: true,
      data: user,
      message: "사용자 정보를 가져왔습니다.",
    };
  } catch (error) {
    console.error("[Server Action Error]", error);
    if (error instanceof Error) return { success: false, message: error.message };
    return { success: false, message: "알 수 없는 서버 오류가 발생했습니다." };
  }
}