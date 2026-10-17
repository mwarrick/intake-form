import { requireAdmin } from "@/lib/auth";
import { listUsers } from "@/lib/users";
import { UsersAdmin } from "./UsersAdmin";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const me = await requireAdmin();
  const users = await listUsers();
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-brand-900">Users</h1>
        <p className="text-sm text-slate-600">
          Staff who can see the referral queue. Admins can also manage users. Deactivated users can’t sign in.
        </p>
      </div>
      <UsersAdmin users={users} meId={me.id} />
    </div>
  );
}
