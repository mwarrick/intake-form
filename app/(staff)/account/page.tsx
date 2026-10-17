import { fullName, requireUser } from "@/lib/auth";
import { ChangePasswordForm } from "./ChangePasswordForm";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const me = await requireUser("/account");
  return (
    <div className="mx-auto max-w-sm space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-brand-900">My account</h1>
        <p className="text-sm text-slate-600">
          {fullName(me)} · {me.email} · {me.role === "admin" ? "Admin" : "User"}
        </p>
      </div>
      <ChangePasswordForm />
    </div>
  );
}
