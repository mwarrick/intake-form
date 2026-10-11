import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Recuperative Care Intake",
  description: "Read faxed referral forms and take referrals online",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <header className="border-b border-slate-200 bg-white">
          <nav className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
            <Link href="/" className="font-semibold text-brand-900">
              Recuperative Care Intake
            </Link>
            <div className="flex gap-4 text-sm text-slate-600">
              <Link href="/upload" className="hover:text-brand-700">Upload scan</Link>
              <Link href="/refer" className="hover:text-brand-700">Online referral</Link>
              <Link href="/referrals" className="hover:text-brand-700">Referral queue</Link>
            </div>
            <span className="ml-auto rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
              Demo · fake patient data only
            </span>
          </nav>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
