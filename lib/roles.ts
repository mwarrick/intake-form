/** Staff roles. Clinical staff (e.g. the LVN medical coordinator) admit approved patients; admins also manage users. */
export const ROLES = ["user", "clinical", "admin"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = { user: "User", clinical: "Clinical", admin: "Admin" };

/** A role from a form value or an import cell; anything unrecognized is a plain user. */
export function parseRole(value: unknown): Role {
  const v = String(value ?? "").trim().toLowerCase();
  if (/^admin(istrator)?$/.test(v)) return "admin";
  if (/^(clinical|clinician|nurse|lvn|rn)$/.test(v)) return "clinical";
  return "user";
}
