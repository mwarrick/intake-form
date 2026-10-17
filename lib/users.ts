import "server-only";
import { USER_COLUMNS, type User } from "@/lib/auth";
import { T, db } from "@/lib/supabase";

export async function listUsers(): Promise<User[]> {
  const { data, error } = await db().from(T.users).select(USER_COLUMNS).order("last_name").order("first_name");
  if (error) throw new Error(error.message);
  return data as User[];
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
