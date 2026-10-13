import { fullName, requireUser } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/roles";
import { userHasPassword } from "@/lib/users";
import { ChangePasswordForm } from "./ChangePasswordForm";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const me = await requireUser("/account", { allowTemporaryPassword: true });
  const hasPassword = await userHasPassword(me.id);
  return (
    <div className="mx-auto max-w-sm space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-brand-900">My account</h1>
        <p className="text-sm text-slate-600">
          {fullName(me)} · {me.email} · {ROLE_LABELS[me.role]}
        </p>
      </div>
      {me.must_change_password && (
        <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">
          {hasPassword
            ? "You signed in with a temporary password. Choose a new password to continue; enter the temporary one as your current password."
            : "Welcome! Choose a password to finish setting up your account. You'll use it with your email from now on."}
        </p>
      )}
      <ChangePasswordForm hasPassword={hasPassword} />
    </div>
  );
}
