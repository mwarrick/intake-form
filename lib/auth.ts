import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { hashToken, newSessionToken } from "@/lib/password";
import { T, db } from "@/lib/supabase";

export type Role = "user" | "admin";

export interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: Role;
  active: boolean;
  created_at: string;
  last_login_at: string | null;
  /** Signed in with a temporary password an admin set; must choose their own before using the app. */
  must_change_password: boolean;
}

export const USER_COLUMNS = "id, first_name, last_name, email, role, active, created_at, last_login_at, must_change_password";
/** Where someone with a temporary password is sent until they choose their own. */
export const PASSWORD_CHANGE_PATH = "/account?required=1";
const COOKIE = "illintake_session";
const SESSION_HOURS = 12;

export async function startSession(userId: string): Promise<void> {
  const token = newSessionToken();
  const expires = new Date(Date.now() + SESSION_HOURS * 3600 * 1000);
  const { error } = await db()
    .from(T.sessions)
    .insert({ user_id: userId, token_hash: hashToken(token), expires_at: expires.toISOString() });
  if (error) throw new Error(error.message);
  await db().from(T.users).update({ last_login_at: new Date().toISOString() }).eq("id", userId);
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires,
  });
}

export async function endSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await db().from(T.sessions).delete().eq("token_hash", hashToken(token));
  jar.delete(COOKIE);
}

/**
 * The signed-in user, or null. Checked against the database on every request, so a
 * deactivated user or an expired session is refused immediately. Cached per request.
 */
export const currentUser = cache(async (): Promise<User | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const { data: session } = await db()
    .from(T.sessions)
    .select("user_id, expires_at")
    .eq("token_hash", hashToken(token))
    .maybeSingle();
  if (!session || new Date(session.expires_at).getTime() < Date.now()) return null;
  const { data: user } = await db().from(T.users).select(USER_COLUMNS).eq("id", session.user_id).maybeSingle();
  if (!user || !user.active) return null;
  return user as User;
});

/**
 * For pages: send signed-out visitors to the login page, and anyone still on a temporary password
 * to choose their own (the account page itself passes allowTemporaryPassword).
 */
export async function requireUser(next = "/referrals", opts: { allowTemporaryPassword?: boolean } = {}): Promise<User> {
  const user = await currentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  if (user.must_change_password && !opts.allowTemporaryPassword) redirect(PASSWORD_CHANGE_PATH);
  return user;
}

export async function requireAdmin(): Promise<User> {
  const user = await requireUser("/admin/users");
  if (user.role !== "admin") redirect("/referrals");
  return user;
}

/** For API routes: the signed-in user if they can use the app (not still on a temporary password), else null. */
export async function apiUser(): Promise<User | null> {
  const user = await currentUser();
  return user && !user.must_change_password ? user : null;
}

/** For server actions and API routes, where a redirect isn't the right answer. */
export async function staffOrThrow(role: Role = "user"): Promise<User> {
  const user = await currentUser();
  if (!user) throw new Error("Your session has ended. Please sign in again.");
  if (user.must_change_password) throw new Error("Choose a new password on your Account page first.");
  if (role === "admin" && user.role !== "admin") throw new Error("Only admins can do that.");
  return user;
}

export function fullName(u: Pick<User, "first_name" | "last_name">): string {
  return `${u.first_name} ${u.last_name}`.trim();
}
