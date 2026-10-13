"use server";

import { redirect } from "next/navigation";
import { PASSWORD_CHANGE_PATH, currentUser, endSession, startSession } from "@/lib/auth";
import { hashPassword, passwordProblem, verifyPassword } from "@/lib/password";
import { T, db } from "@/lib/supabase";
import { hasAnyUser, readUserFields } from "@/lib/users";

export interface FormState {
  error?: string;
  ok?: string;
}

// Compared against when the email isn't found, so a wrong email takes as long as a wrong password.
const DUMMY_HASH = "scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$" + Buffer.alloc(64).toString("base64");

/** Only same-site paths, so the login page can't be used to bounce people to another site. */
function safeNext(v: FormDataEntryValue | null): string {
  const s = typeof v === "string" ? v : "";
  return s.startsWith("/") && !s.startsWith("//") && !s.startsWith("/login") ? s : "/referrals";
}

export async function signIn(_prev: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  if (!email) return { error: "Enter your email." };

  const { data: user, error } = await db()
    .from(T.users)
    .select("id, active, password_hash, must_change_password")
    .eq("email", email)
    .maybeSingle();
  if (error) return { error: error.message };

  // No password yet (imported, or cleared by an admin): the email alone signs in, and they choose a password next.
  // There's no email verification yet, so this is on the honor system.
  if (user && !user.password_hash) {
    if (!user.active) return { error: "This account has been deactivated. Ask an admin to reactivate it." };
    await startSession(user.id);
    redirect(PASSWORD_CHANGE_PATH);
  }
  if (!password) return { error: "Enter your password." };
  const ok = await verifyPassword(password, user?.password_hash ?? DUMMY_HASH);
  if (!user || !ok) return { error: "Email or password is incorrect." };
  if (!user.active) return { error: "This account has been deactivated. Ask an admin to reactivate it." };

  await startSession(user.id);
  redirect(user.must_change_password ? PASSWORD_CHANGE_PATH : safeNext(form.get("next")));
}

export async function signOut(): Promise<void> {
  await endSession();
  redirect("/login");
}

/** Only works while there are no users at all: creates the first admin and signs them in. */
export async function createFirstAdmin(_prev: FormState, form: FormData): Promise<FormState> {
  if (await hasAnyUser()) return { error: "An admin already exists. Sign in instead." };
  const fields = readUserFields(form);
  if ("error" in fields) return fields;
  const password = String(form.get("password") ?? "");
  const problem = passwordProblem(password);
  if (problem) return { error: problem };

  const { data, error } = await db()
    .from(T.users)
    .insert({ ...fields, role: "admin", active: true, password_hash: await hashPassword(password) })
    .select("id")
    .single();
  if (error) return { error: error.message };
  await startSession(data.id);
  redirect("/admin/users");
}

export async function changeOwnPassword(_prev: FormState, form: FormData): Promise<FormState> {
  // Not staffOrThrow: this is the one thing someone on a temporary password must be able to do.
  const me = await currentUser();
  if (!me) return { error: "Your session has ended. Please sign in again." };
  const current = String(form.get("current") ?? "");
  const next = String(form.get("password") ?? "");
  if (next !== String(form.get("confirm") ?? "")) return { error: "The new passwords don't match." };
  const problem = passwordProblem(next);
  if (problem) return { error: problem };

  const { data, error } = await db().from(T.users).select("password_hash").eq("id", me.id).single();
  if (error) return { error: error.message };
  // Someone setting their first password has no current one to check.
  if (data.password_hash) {
    if (!(await verifyPassword(current, data.password_hash))) return { error: "Your current password is incorrect." };
    if (next === current) return { error: "Choose a password different from your current one." };
  }

  const { error: upErr } = await db()
    .from(T.users)
    .update({ password_hash: await hashPassword(next), must_change_password: false, updated_at: new Date().toISOString() })
    .eq("id", me.id);
  if (upErr) return { error: upErr.message };
  // Someone who had to change a temporary password goes on to the app.
  if (me.must_change_password) redirect("/referrals");
  return { ok: "Password changed." };
}
