import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const BUCKET = "illintake-files";
export const T = {
  referrals: "ILLINTAKE_referrals",
  documents: "ILLINTAKE_documents",
  supporting: "ILLINTAKE_supporting_docs",
  users: "ILLINTAKE_users",
  sessions: "ILLINTAKE_sessions",
} as const;

let admin: SupabaseClient | undefined;

/** Service-role client. Only server code touches the database; RLS blocks the public key. */
export function db(): SupabaseClient {
  if (!admin) {
    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY).");
    admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  }
  return admin;
}

export interface UploadTarget {
  path: string;
  token: string;
}

/** Signed upload URLs let the browser send files straight to Storage, past Vercel's 4.5 MB request limit. */
export async function createUploadTargets(paths: string[]): Promise<UploadTarget[]> {
  return Promise.all(
    paths.map(async (path) => {
      const { data, error } = await db().storage.from(BUCKET).createSignedUploadUrl(path, { upsert: true });
      if (error) throw new Error(`Could not create upload URL for ${path}: ${error.message}`);
      return { path, token: data.token };
    }),
  );
}

export async function signedUrls(paths: string[], expiresIn = 3600): Promise<Map<string, string>> {
  if (!paths.length) return new Map();
  const { data, error } = await db().storage.from(BUCKET).createSignedUrls(paths, expiresIn);
  if (error) throw new Error(error.message);
  const out = new Map<string, string>();
  for (const d of data) if (d.path && d.signedUrl) out.set(d.path, d.signedUrl);
  return out;
}

export function safeName(name: string): string {
  return name.replace(/[^A-Za-z0-9._-]+/g, "_").slice(-80) || "file";
}
