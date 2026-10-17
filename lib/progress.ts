/** Where the reader is with a scan, saved on the referral while it's processing so the screen can show each step live. */
export interface ReadProgress {
  step: "start" | "classify" | "extract" | "reread";
  /** When reading started (ISO), for the elapsed-time counter. */
  startedAt: string;
  pages?: number;
  formPages?: number[];
  /** How many fields the stronger model is double-checking. */
  fields?: number;
}

/** What the status endpoint reports while a referral is being read. */
export interface ReadStatus {
  status: string;
  progress: ReadProgress | null;
  docsPending: number;
  docsTotal: number;
  /** The admission criteria check (lib/criteria.ts): running, done, failed, or null before it has run. */
  criteria: string | null;
}
