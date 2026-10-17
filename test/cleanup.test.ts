import { beforeEach, describe, expect, it, vi } from "vitest";

type Row = { id: string; source: string; status: string; updated_at: string };
const state = { rows: [] as Row[], files: [] as string[] };

// Just enough of the Supabase client for lib/cleanup.ts.
function query(rows: () => Row[]) {
  const filters: ((r: Row) => boolean)[] = [];
  let del = false;
  const q = {
    delete: () => ((del = true), q),
    eq: (k: keyof Row, v: string) => (filters.push((r) => r[k] === v), q),
    in: (k: keyof Row, vs: string[]) => (filters.push((r) => vs.includes(r[k])), q),
    lt: (k: keyof Row, v: string) => (filters.push((r) => r[k] < v), q),
    select: () => q,
    then: (resolve: (v: { data: { id: string }[]; error: null }) => void) => {
      const hit = rows().filter((r) => filters.every((f) => f(r)));
      if (del) state.rows = state.rows.filter((r) => !hit.includes(r));
      resolve({ data: hit.map((r) => ({ id: r.id })), error: null });
    },
  };
  return q;
}

const fakeDb = {
  from: () => ({ delete: () => query(() => state.rows).delete(), select: () => query(() => state.rows) }),
  storage: {
    from: () => ({
      list: async (prefix: string) => {
        const under = state.files.filter((f) => (prefix ? f.startsWith(`${prefix}/`) : true));
        const names = new Map<string, boolean>();
        for (const f of under) {
          const rest = prefix ? f.slice(prefix.length + 1) : f;
          const [head, ...tail] = rest.split("/");
          names.set(head, tail.length > 0);
        }
        return { data: [...names].map(([name, isFolder]) => ({ name, id: isFolder ? null : name })), error: null };
      },
      remove: async (paths: string[]) => {
        state.files = state.files.filter((f) => !paths.includes(f));
        return { data: [], error: null };
      },
    }),
  },
};

vi.mock("@/lib/supabase", () => ({ BUCKET: "b", T: { referrals: "r", documents: "d" }, db: () => fakeDb }));
const { cleanupStaleUploads } = await import("@/lib/cleanup");

const NOW = Date.parse("2026-10-12T12:00:00Z");
const OLD = "2026-10-10T12:00:00Z";
const FRESH = "2026-10-12T11:00:00Z";
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const filesFor = (rid: string) => [`${rid}/original-scan.pdf`, `${rid}/page-01.jpg`, `${rid}/attachments/1-hp.pdf`];

describe("cleanupStaleUploads", () => {
  beforeEach(() => {
    state.rows = [
      { id: id(1), source: "portal", status: "draft", updated_at: OLD }, // abandoned pre-fill: delete
      { id: id(2), source: "portal", status: "processing", updated_at: OLD }, // stuck pre-fill: delete
      { id: id(3), source: "portal", status: "draft", updated_at: FRESH }, // in progress: keep
      { id: id(4), source: "portal", status: "needs_review", updated_at: OLD }, // submitted: keep
      { id: id(5), source: "scan", status: "failed", updated_at: OLD }, // fax that failed to read is still a record: keep
      { id: id(6), source: "scan", status: "processing", updated_at: OLD }, // keep
    ];
    state.files = [1, 2, 3, 4, 5, 6, 7].flatMap((n) => filesFor(id(n))); // id(7) has files but no row
  });

  it("deletes stale drafts and stray folders, and nothing attached to an intake record", async () => {
    const result = await cleanupStaleUploads(NOW);
    expect(state.rows.map((r) => r.id)).toEqual([id(3), id(4), id(5), id(6)]);
    expect(new Set(state.files.map((f) => f.split("/")[0]))).toEqual(new Set([id(3), id(4), id(5), id(6)]));
    expect(result).toEqual({ draftsDeleted: 2, strayFolders: 1, filesDeleted: 9 });
  });

  it("does nothing on a second run", async () => {
    await cleanupStaleUploads(NOW);
    expect(await cleanupStaleUploads(NOW)).toEqual({ draftsDeleted: 0, strayFolders: 0, filesDeleted: 0 });
  });
});
