import type { Metadata } from "next";
import Link from "next/link";
import { signOut } from "@/app/auth-actions";
import { currentUser } from "@/lib/auth";
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
            <div className="flex flex-wrap gap-4 text-sm text-slate-600">
              {user?.role === "admin" && <Link href="/dashboard" className="hover:text-brand-700">Dashboard</Link>}
              {user && <Link href="/data-to-fix" className="hover:text-brand-700">Data to fix</Link>}
              {user && <Link href="/admissions" className="hover:text-brand-700">Admissions</Link>}
              {user && <Link href="/referrals" className="hover:text-brand-700">Referral queue</Link>}
              {user && <Link href="/upload" className="hover:text-brand-700">Upload scan</Link>}
              <Link href="/refer" className="hover:text-brand-700">Online referral</Link>
              {user?.role === "admin" && <Link href="/admin/users" className="hover:text-brand-700">Users</Link>}
              <Link href="/how-it-works" className="hover:text-brand-700">How it works</Link>
            </div>
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
