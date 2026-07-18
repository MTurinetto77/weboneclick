"use server";

import { isGoogleAuthConfigured, signIn } from "@/auth";
import { redirect } from "next/navigation";

export async function continueWithGoogle() {
  if (!isGoogleAuthConfigured()) {
    throw new Error("Google OAuth no está configurado");
  }
  await signIn("google", { redirectTo: "/checkout" });
}

export async function continueAsGuest() {
  redirect("/checkout?modo=invitado");
}
