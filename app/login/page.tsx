import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { hasAnyUser } from "@/lib/users";
import { FirstAdminForm, SignInForm } from "./forms";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  if (await currentUser()) redirect(next?.startsWith("/") && !next.startsWith("//") ? next : "/referrals");
  const setup = !(await hasAnyUser());

  return (
    <div className="mx-auto max-w-sm space-y-4 pt-6">
      <div>
        <h1 className="text-xl font-semibold text-brand-900">{setup ? "Create the first admin" : "Staff sign in"}</h1>
        <p className="mt-1 text-sm text-slate-600">
          {setup
            ? "No accounts exist yet. The first account is an admin, who can then add everyone else."
            : "For Illumination staff. Hospital referrers don't need an account to submit a referral."}
        </p>
      </div>
      {setup ? <FirstAdminForm /> : <SignInForm next={next ?? ""} />}
    </div>
  );
}
