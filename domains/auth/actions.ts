"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { LoginCredentials, RegisterCredentials } from "./types";

export async function login(credentials: LoginCredentials) {
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword(credentials);

  if (error) {
    return { error: error.message };
  }

  redirect("/dashboard");
}

export async function register(credentials: RegisterCredentials) {
  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({
    email: credentials.email,
    password: credentials.password,
    options: {
      data: { full_name: credentials.fullName },
    },
  });

  if (error) {
    return { error: error.message };
  }

  redirect("/dashboard");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
