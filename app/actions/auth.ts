"use server";

import { cookies } from "next/headers";
import { signIn, signOut } from "@/auth";

export async function signInWithGoogle() {
  await signIn("google", { redirectTo: "/dashboard" });
}

export async function clearAuthSessions() {
  try {
    await signOut({ redirect: false });
  } finally {
    const cookieStore = await cookies();
    cookieStore.delete("aegis_session");
  }
}
