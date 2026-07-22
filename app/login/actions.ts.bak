"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signIn(formData: FormData) {
  const supabase = await createClient();

  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");
  const redirectTo = String(formData.get("redirectTo") || "/admin");

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return redirect(
      `/login?error=${encodeURIComponent(error.message)}&redirect=${encodeURIComponent(
        redirectTo
      )}`
    );
  }

  revalidatePath("/", "layout");
  redirect(redirectTo);
}

export async function signUp(formData: FormData) {
  const supabase = await createClient();

  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");
  const fullName = String(formData.get("fullName") || "");

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });

  if (error) {
    return redirect(`/login?mode=signup&error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/", "layout");
  redirect("/admin");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
