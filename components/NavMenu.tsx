"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export interface NavItem {
  label: string;
  href: string;
}

/** A top-level entry: a link, or a group that opens a menu. A group with one item shows as that link. */
export type NavEntry = NavItem | { label: string; items: NavItem[] };

const active = (pathname: string, href: string) => pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));

export function NavMenu({ entries }: { entries: NavEntry[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // Close on navigation, outside click and Escape.
  useEffect(() => setOpen(null), [pathname]);
  useEffect(() => {
    if (!open) return;
    const click = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(null);
    const key = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    document.addEventListener("mousedown", click);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mousedown", click);
      document.removeEventListener("keydown", key);
    };
  }, [open]);

  const linkClass = (on: boolean) => `rounded px-2 py-1 hover:bg-slate-100 hover:text-brand-700 ${on ? "font-medium text-brand-700" : ""}`;

  return (
    <div ref={ref} className="flex flex-wrap items-center gap-1 text-sm text-slate-600">
      {entries.map((e) => {
        if (!("items" in e) || e.items.length === 1) {
          const item = "items" in e ? e.items[0] : e;
          return (
            <Link key={item.href} href={item.href} className={linkClass(active(pathname, item.href))}>
              {item.label}
            </Link>
          );
        }
        if (!e.items.length) return null;
        const isOpen = open === e.label;
        const on = e.items.some((i) => active(pathname, i.href));
        return (
          <div key={e.label} className="relative">
            <button
              type="button"
              className={`flex items-center gap-1 ${linkClass(on)}`}
              aria-expanded={isOpen}
              aria-haspopup="menu"
              onClick={() => setOpen(isOpen ? null : e.label)}
            >
              {e.label}
              <svg viewBox="0 0 12 12" className={`size-3 transition-transform ${isOpen ? "rotate-180" : ""}`} aria-hidden="true">
                <path d="M3 4.5 6 7.5 9 4.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {isOpen && (
              <div role="menu" className="absolute left-0 top-full z-20 mt-1 min-w-44 rounded-md border border-slate-200 bg-white py-1 shadow-lg">
                {e.items.map((i) => (
                  <Link
                    key={i.href}
                    href={i.href}
                    role="menuitem"
                    className={`block px-3 py-1.5 hover:bg-slate-50 hover:text-brand-700 ${active(pathname, i.href) ? "font-medium text-brand-700" : "text-slate-700"}`}
                  >
                    {i.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
