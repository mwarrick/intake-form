import type { Role } from "@/lib/auth";

export interface ImportRow {
  first_name: string;
  last_name: string;
  email: string;
  role: Role;
}

export interface ParsedImport {
  rows: ImportRow[];
  /** Lines that couldn't be read, with the reason. */
  problems: { line: number; text: string; reason: string }[];
}

const EMAIL = /[^\s<>"',;]+@[^\s<>"',;]+\.[^\s<>"',;]+/;

/**
 * Read a pasted staff list: one person per line, as "First Last, email", "First Last <email>", or
 * spreadsheet columns First / Last / Email / Role (tab- or comma-separated). A header row is skipped.
 * "admin" anywhere on a line as its own column makes that person an admin; everyone else is a user.
 */
export function parseStaffList(text: string): ParsedImport {
  const rows: ImportRow[] = [];
  const problems: ParsedImport["problems"] = [];
  const seen = new Set<string>();
  let first = true;

  text.split(/\r?\n/).forEach((raw, i) => {
    const line = raw.trim();
    if (!line) return;
    const isFirst = first;
    first = false;
    const match = line.match(EMAIL);
    if (!match) {
      // A header row ("First name, Last name, Email, Role") isn't a problem.
      if (!(isFirst && /e-?mail/i.test(line))) problems.push({ line: i + 1, text: line, reason: "No email address" });
      return;
    }
    const email = match[0].toLowerCase();
    const rest = line.replace(match[0], " ").replace(/[<>"]/g, " ");
    const fields = rest
      .split(/[,\t;]/)
      .map((f) => f.trim())
      .filter(Boolean);
    const role: Role = fields.some((f) => /^admin(istrator)?$/i.test(f)) ? "admin" : "user";
    const nameFields = fields.filter((f) => !/^(admin(istrator)?|user|staff)$/i.test(f));

    let firstName = "";
    let lastName = "";
    if (nameFields.length >= 2) {
      [firstName, lastName] = nameFields;
    } else if (nameFields.length === 1) {
      const words = nameFields[0].split(/\s+/);
      lastName = words.length > 1 ? words.pop()! : "";
      firstName = words.join(" ");
    }
    if (!firstName || !lastName) {
      problems.push({ line: i + 1, text: line, reason: "Needs a first and last name" });
      return;
    }
    if (seen.has(email)) {
      problems.push({ line: i + 1, text: line, reason: "Same email as an earlier line" });
      return;
    }
    seen.add(email);
    rows.push({ first_name: firstName, last_name: lastName, email, role });
  });

  return { rows, problems };
}
