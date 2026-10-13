import { type Role, parseRole } from "@/lib/roles";

/** Staff emails are first and last name run together at this domain, e.g. danawhitfield@illuminationhealthhome.org. */
export const STAFF_EMAIL_DOMAIN = "illuminationhealthhome.org";

export interface ImportRow {
  first_name: string;
  last_name: string;
  email: string;
  role: Role;
  /** The email was made from the name because the email column was blank. */
  generatedEmail?: boolean;
}

export interface ParsedImport {
  rows: ImportRow[];
  /** Lines that couldn't be read, with the reason. */
  problems: { line: number; text: string; reason: string }[];
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** The staff email for a name: letters and digits of first + last name, lowercased, at the staff domain. */
export function staffEmail(first: string, last: string): string {
  const local = `${first}${last}`
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  return `${local}@${STAFF_EMAIL_DOMAIN}`;
}

/**
 * Read a staff list in firstname, lastname, email columns (role optional), from a CSV file or rows pasted
 * from a spreadsheet (comma- or tab-separated). A header row is used to find the columns if present; otherwise
 * the order is firstname, lastname, email, role. A blank email is made from the name (see staffEmail).
 * "admin" in the role column makes that person an admin; everyone else is a user.
 */
export function parseStaffList(text: string): ParsedImport {
  const rows: ImportRow[] = [];
  const problems: ParsedImport["problems"] = [];
  const seen = new Set<string>();
  // Lines aren't trimmed: a leading tab or comma is a blank first column.
  const lines = text.split(/\r?\n/).map((raw, i) => ({ n: i + 1, raw })).filter((l) => l.raw.trim());
  if (!lines.length) return { rows, problems };

  const sep = lines[0].raw.includes("\t") ? "\t" : ",";
  let cols = { first: 0, last: 1, email: 2, role: 3 };
  const header = splitRow(lines[0].raw, sep).map((h) => h.toLowerCase().replace(/[^a-z]/g, ""));
  if (header.some((h) => /^(firstname|first|givenname)$/.test(h))) {
    const find = (re: RegExp) => header.findIndex((h) => re.test(h));
    cols = {
      first: find(/^(firstname|first|givenname)$/),
      last: find(/^(lastname|last|surname|familyname)$/),
      email: find(/^(email|emailaddress|workemail)$/),
      role: find(/^role$/),
    };
    lines.shift();
  }

  for (const { n, raw } of lines) {
    const cells = splitRow(raw, sep);
    const cell = (i: number) => (i >= 0 ? (cells[i] ?? "").trim() : "");
    const first = cell(cols.first);
    const last = cell(cols.last);
    if (!first || !last) {
      problems.push({ line: n, text: raw.trim(), reason: "Needs a first and last name" });
      continue;
    }
    let email = cell(cols.email).toLowerCase();
    const generatedEmail = !email;
    if (generatedEmail) email = staffEmail(first, last);
    if (!EMAIL.test(email)) {
      problems.push({ line: n, text: raw.trim(), reason: "Email address isn't valid" });
      continue;
    }
    if (seen.has(email)) {
      problems.push({ line: n, text: raw.trim(), reason: `Same email as an earlier line (${email})` });
      continue;
    }
    seen.add(email);
    const role: Role = parseRole(cell(cols.role));
    rows.push({ first_name: first, last_name: last, email, role, ...(generatedEmail ? { generatedEmail } : {}) });
  }

  return { rows, problems };
}

/** One CSV/TSV row, honouring double-quoted cells (which may contain the separator and "" for a quote). */
function splitRow(line: string, sep: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cur += c;
    } else if (c === '"') quoted = true;
    else if (c === sep) {
      out.push(cur);
      cur = "";
    } else cur += c;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}
