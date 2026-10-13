import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import Link from "next/link";
import { signOut } from "@/app/auth-actions";
import { type NavEntry, NavMenu } from "@/components/NavMenu";
import { type User, currentUser } from "@/lib/auth";
import "./globals.css";

const archivo = Archivo({ subsets: ["latin"], variable: "--font-archivo", display: "swap" });

export const metadata: Metadata = {
  title: "Recuperative Care Intake",
  description: "Read faxed referral forms and take referrals online",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  return (
    <html lang="en" className={archivo.variable}>
      <body className="min-h-screen antialiased">
        <header className="bg-brand-900 text-white print:hidden">
          <nav className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
            <Link href="/" className="flex items-center gap-3" aria-label="Recuperative Care Intake, home">
              {/* eslint-disable-next-line @next/next/no-img-element -- static SVG logo */}
              <img src="/brand/ihh-logo-light.svg" alt="Illumination Health + Home" width={168} height={28} className="h-7 w-auto" />
              <span className="hidden border-l border-white/30 pl-3 text-sm font-medium text-white/90 sm:inline">Recuperative Care Intake</span>
            </Link>
            <NavMenu entries={menu(user)} />
            <div className="ml-auto flex flex-wrap items-center gap-3 text-sm">
              <span className="rounded bg-accent-400 px-2 py-0.5 text-xs font-semibold text-brand-900">Demo · fake patient data only</span>
              {user ? (
                <>
                  <Link href="/account" className="text-white/85 hover:text-accent-400">
                    {user.first_name} {user.last_name}
                  </Link>
                  <form action={signOut}>
                    <button className="text-white/70 hover:text-accent-400">Sign out</button>
                  </form>
                </>
              ) : (
                <Link href="/login" className="text-white/85 hover:text-accent-400">Staff sign in</Link>
              )}
            </div>
          </nav>
          <div className="h-1 bg-accent-400" />
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
