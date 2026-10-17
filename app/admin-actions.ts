"use server";

import { revalidatePath } from "next/cache";
import { type Role, staffOrThrow } from "@/lib/auth";
import { hashPassword, passwordProblem, temporaryPassword } from "@/lib/password";
import { T, db } from "@/lib/supabase";
import { type ImportRow, parseStaffList } from "@/lib/user-import";
import { friendlyDbError, readUserFields } from "@/lib/users";
import type { FormState } from "./auth-actions";

function readRole(form: FormData): Role {
  return form.get("role") === "admin" ? "admin" : "user";
}

export async function addUser(_prev: FormState, form: FormData): Promise<FormState> {
  await staffOrThrow("admin");
  const fields = readUserFields(form);
  if ("error" in fields) return fields;
  const password = String(form.get("password") ?? "");
  const problem = passwordProblem(password);
  if (problem) return { error: problem };

  const { error } = await db()
    .from(T.users)
    .insert({ ...fields, role: readRole(form), active: true, password_hash: await hashPassword(password) });
  if (error) return { error: friendlyDbError(error.message) };
  revalidatePath("/admin/users");
  return { ok: `Added ${fields.first_name} ${fields.last_name}.` };
}

export async function editUser(_prev: FormState, form: FormData): Promise<FormState> {
  const me = await staffOrThrow("admin");
  const id = String(form.get("id") ?? "");
  const fields = readUserFields(form);
  if ("error" in fields) return fields;
  const role = readRole(form);
  const active = form.get("active") === "on";
  // Admins can't lock themselves out by demoting or deactivating their own account.
  if (id === me.id && (role !== "admin" || !active)) return { error: "You can't remove your own admin access or deactivate yourself." };

  const { error } = await db()
    .from(T.users)
    .update({ ...fields, role, active, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: friendlyDbError(error.message) };
  // Deactivated users are signed out everywhere right away.
  if (!active) await db().from(T.sessions).delete().eq("user_id", id);
  revalidatePath("/admin/users");
  return { ok: "Saved." };
}

export async function resetUserPassword(_prev: FormState, form: FormData): Promise<FormState> {
  await staffOrThrow("admin");
  const id = String(form.get("id") ?? "");
  const password = String(form.get("password") ?? "");
  const problem = passwordProblem(password);
  if (problem) return { error: problem };
  const { error } = await db()
    .from(T.users)
    .update({ password_hash: await hashPassword(password), updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: error.message };
  // A reset signs the user out of existing sessions.
  await db().from(T.sessions).delete().eq("user_id", id);
  return { ok: "Password reset. Give the user their new password." };
}

export interface ImportResult {
  /** New users with their temporary passwords; shown to the admin once and never stored in plain text. */
  created: (ImportRow & { password: string })[];
  skipped: { email: string; reason: string }[];
  error?: string;
}

/** Add many staff at once from a pasted list (see parseStaffList). Existing emails are skipped, never changed. */
export async function importUsers(text: string): Promise<ImportResult> {
  await staffOrThrow("admin");
  const { rows } = parseStaffList(text);
  if (!rows.length) return { created: [], skipped: [], error: "No people found in the list." };
  if (rows.length > 200) return { created: [], skipped: [], error: "Import at most 200 people at a time." };

  const { data: existing, error: exErr } = await db()
    .from(T.users)
    .select("email")
    .in("email", rows.map((r) => r.email));
  if (exErr) return { created: [], skipped: [], error: exErr.message };
  const taken = new Set((existing ?? []).map((u) => u.email as string));
  const skipped = rows.filter((r) => taken.has(r.email)).map((r) => ({ email: r.email, reason: "Already a user" }));
  const created = rows.filter((r) => !taken.has(r.email)).map((r) => ({ ...r, password: temporaryPassword() }));
  if (!created.length) return { created, skipped };

  const records = await Promise.all(
    created.map(async ({ password, ...r }) => ({ ...r, active: true, password_hash: await hashPassword(password) })),
  );
  const { error } = await db().from(T.users).insert(records);
  if (error) return { created: [], skipped, error: friendlyDbError(error.message) };
  revalidatePath("/admin/users");
  return { created, skipped };
}
