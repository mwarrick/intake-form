import "server-only";
import { BUCKET, T, db } from "@/lib/supabase";

/** Uploads not attached to an intake record are kept this long, then deleted. */
export const STALE_AFTER_MS = 24 * 60 * 60 * 1000;
const PAGE = 1000;

export interface CleanupResult {
  draftsDeleted: number;
  strayFolders: number;
  filesDeleted: number;
}

/**
 * Every file path under a prefix, including subfolders (Storage lists folders as entries with no id).
 * With an empty prefix, the top-level folder names.
 */
async function listFiles(prefix: string): Promise<string[]> {
  const out: string[] = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await db().storage.from(BUCKET).list(prefix, { limit: PAGE, offset });
    if (error) throw new Error(`Could not list ${prefix || "bucket"}: ${error.message}`);
    for (const entry of data) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      // At the top level only folders matter: each is one referral's files.
      if (entry.id === null) out.push(...(prefix ? await listFiles(path) : [path]));
      else if (prefix) out.push(path);
    }
    if (data.length < PAGE) return out;
  }
}

async function removeFolder(folder: string): Promise<number> {
  const files = await listFiles(folder);
  for (let i = 0; i < files.length; i += PAGE) {
    const { error } = await db().storage.from(BUCKET).remove(files.slice(i, i + PAGE));
    if (error) throw new Error(`Could not delete files in ${folder}: ${error.message}`);
  }
  return files.length;
}

/**
 * Delete uploads that never became an intake record, once they're a day old:
 * - online-form uploads of a paper form that the referrer never submitted (drafts, including repeat uploads), and
 * - storage folders whose referral record no longer exists.
 * Faxed scans and submitted referrals are intake records and are never touched, even if reading failed.
 */
export async function cleanupStaleUploads(now = Date.now()): Promise<CleanupResult> {
  const supabase = db();
  const cutoff = new Date(now - STALE_AFTER_MS).toISOString();
  const result: CleanupResult = { draftsDeleted: 0, strayFolders: 0, filesDeleted: 0 };

  // Delete the rows first, re-checking status and age in the same statement, so a referral submitted
  // at this moment is never deleted. Their document rows go with them (on delete cascade).
  const { data: deleted, error } = await supabase
    .from(T.referrals)
    .delete()
    .eq("source", "portal")
    .in("status", ["draft", "processing"])
    .lt("updated_at", cutoff)
    .select("id");
  if (error) throw new Error(error.message);
  for (const { id } of deleted ?? []) {
    result.filesDeleted += await removeFolder(id);
    result.draftsDeleted++;
  }

  // Each referral's files live in a folder named after its id. A referral row is always created before
  // its files are uploaded, so a folder with no row belongs to a deleted referral (or a failed cleanup above).
  const folders = await listFiles("");
  for (let i = 0; i < folders.length; i += 200) {
    const batch = folders.slice(i, i + 200);
    const ids = batch.filter(isUuid);
    const { data: rows, error: refErr } = ids.length
      ? await supabase.from(T.referrals).select("id").in("id", ids)
      : { data: [], error: null };
    if (refErr) throw new Error(refErr.message);
    const known = new Set((rows ?? []).map((r) => r.id as string));
    for (const folder of batch) {
      if (known.has(folder)) continue;
      result.filesDeleted += await removeFolder(folder);
      result.strayFolders++;
    }
  }

  return result;
}

function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}
