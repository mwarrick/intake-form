import "server-only";
import { USER_COLUMNS, type User } from "@/lib/auth";
import { T, db } from "@/lib/supabase";

/** A user as the admin list shows them: whether they've chosen a password, never the hash itself. */
export type ListedUser = User & { has_password: boolean };

export async function listUsers(): Promise<ListedUser[]> {
  const { data, error } = await db()
    .from(T.users)
    .select(`${USER_COLUMNS}, password_hash`)
    .order("last_name")
    .order("first_name");
  if (error) throw new Error(error.message);
  return (data ?? []).map(({ password_hash, ...u }) => ({ ...(u as User), has_password: !!password_hash }));
}

export async function userHasPassword(id: string): Promise<boolean> {
  const { data, error } = await db().from(T.users).select("password_hash").eq("id", id).single();
  if (error) throw new Error(error.message);
  return !!data.password_hash;
}

export function readUserFields(form: FormData): { first_name: string; last_name: string; email: string } | { error: string } {
  const first_name = String(form.get("first_name") ?? "").trim();
  const last_name = String(form.get("last_name") ?? "").trim();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!first_name || !last_name) return { error: "First and last name are required." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Enter a valid email address." };
  return { first_name, last_name, email };
}

/** Postgres unique-violation on email, as a readable message. */
export function friendlyDbError(message: string): string {
  return /duplicate key|unique/i.test(message) ? "A user with that email already exists." : message;
}

export async function hasAnyUser(): Promise<boolean> {
  const { count, error } = await db().from(T.users).select("id", { count: "exact", head: true });
  if (error) throw new Error(error.message);
  return (count ?? 0) > 0;
}
