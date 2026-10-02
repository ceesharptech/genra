"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { actionError, type ActionResult } from "./types";

export async function signOutAction(): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    return actionError(error.message);
  }

  redirect("/");
}
