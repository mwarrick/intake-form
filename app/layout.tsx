import type { Metadata } from "next";
import Link from "next/link";
import { signOut } from "@/app/auth-actions";
import { type NavEntry, NavMenu } from "@/components/NavMenu";
import { type User, currentUser } from "@/lib/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: "Recuperative Care Intake",
  description: "Read faxed referral forms and take referrals online",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <header className="border-b border-slate-200 bg-white print:hidden">
          <nav className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
            <Link href="/" className="font-semibold text-brand-900">
              Recuperative Care Intake
            </Link>
            <NavMenu entries={menu(user)} />
            <div className="ml-auto flex flex-wrap items-center gap-3 text-sm">
              <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                Demo · fake patient data only
              </span>
              {user ? (
                <>
                  <Link href="/account" className="text-slate-600 hover:text-brand-700">
                    {user.first_name} {user.last_name}
                  </Link>
                  <form action={signOut}>
                    <button className="text-slate-500 hover:text-brand-700">Sign out</button>
                  </form>
                </>
              ) : (
                <Link href="/login" className="text-slate-600 hover:text-brand-700">Staff sign in</Link>
              )}
            </div>
          </nav>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6 print:p-0">{children}</main>
      </body>
    </html>
  );
}

/** Top menu, grouped; entries the user can't open are left out. */
function menu(user: User | null): NavEntry[] {
  const admin = user?.role === "admin";
  const items = (...xs: (false | null | undefined | { label: string; href: string })[]) => xs.filter((x): x is { label: string; href: string } => !!x);
  return [
    { label: "Reports", items: items(admin && { label: "Dashboard", href: "/dashboard" }, user && { label: "Data to fix", href: "/data-to-fix" }) },
    { label: "Admissions", items: items(user && { label: "Admissions", href: "/admissions" }) },
    {
      label: "Referrals",
      items: items(user && { label: "Referral queue", href: "/referrals" }, user && { label: "Upload scan", href: "/upload" }, { label: "Online referral", href: "/refer" }),
    },
    { label: "Users", items: items(admin && { label: "Users", href: "/admin/users" }) },
    { label: "How it works", href: "/how-it-works" },
  ];
}
