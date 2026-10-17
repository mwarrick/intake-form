"use server";

import { redirect } from "next/navigation";
import { endSession, staffOrThrow, startSession } from "@/lib/auth";
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
  if (!email || !password) return { error: "Enter your email and password." };

  const { data: user, error } = await db()
    .from(T.users)
    .select("id, active, password_hash")
    .eq("email", email)
    .maybeSingle();
  if (error) return { error: error.message };

  const ok = await verifyPassword(password, user?.password_hash ?? DUMMY_HASH);
  if (!user || !ok) return { error: "Email or password is incorrect." };
  if (!user.active) return { error: "This account has been deactivated. Ask an admin to reactivate it." };

  await startSession(user.id);
  redirect(safeNext(form.get("next")));
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
  const me = await staffOrThrow();
  const current = String(form.get("current") ?? "");
  const next = String(form.get("password") ?? "");
  if (next !== String(form.get("confirm") ?? "")) return { error: "The new passwords don't match." };
  const problem = passwordProblem(next);
  if (problem) return { error: problem };

  const { data, error } = await db().from(T.users).select("password_hash").eq("id", me.id).single();
  if (error) return { error: error.message };
  if (!(await verifyPassword(current, data.password_hash))) return { error: "Your current password is incorrect." };

  const { error: upErr } = await db()
    .from(T.users)
    .update({ password_hash: await hashPassword(next), updated_at: new Date().toISOString() })
    .eq("id", me.id);
  if (upErr) return { error: upErr.message };
  return { ok: "Password changed." };
}
