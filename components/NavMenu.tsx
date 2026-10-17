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

  // Sits on the navy header: current page in the yellow accent.
  const linkClass = (on: boolean) => `rounded px-2 py-1 hover:bg-white/10 hover:text-white ${on ? "font-semibold text-accent-400" : ""}`;

  return (
    <div ref={ref} className="flex flex-wrap items-center gap-1 text-sm text-white/85">
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

/** Narrow screens: a hamburger that drops a panel with every link, groups under their heading, then `children` (account links). */
export function MobileNav({ entries, children }: { entries: NavEntry[]; children?: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close on navigation and Escape.
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [open]);

  const linkClass = (href: string) => `block rounded px-3 py-2 hover:bg-white/10 hover:text-white ${active(pathname, href) ? "font-semibold text-accent-400" : ""}`;

  return (
    <div className="md:hidden">
      <button
        type="button"
        className="flex size-9 items-center justify-center rounded hover:bg-white/10"
        aria-expanded={open}
        aria-controls="mobile-nav"
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen(!open)}
      >
        <svg viewBox="0 0 24 24" className="size-6" aria-hidden="true">
          <path
            d={open ? "M6 6l12 12M18 6 6 18" : "M4 7h16M4 12h16M4 17h16"}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </button>
      {open && (
        <div id="mobile-nav" className="absolute inset-x-0 top-full z-30 border-b-4 border-accent-400 bg-brand-900 px-4 pb-4 pt-2 text-sm text-white/85 shadow-lg">
          {entries.map((e) => {
            if (!("items" in e) || e.items.length === 1) {
              const item = "items" in e ? e.items[0] : e;
              return (
                <Link key={item.href} href={item.href} className={linkClass(item.href)}>
                  {item.label}
                </Link>
              );
            }
            if (!e.items.length) return null;
            return (
              <div key={e.label} className="py-1">
                <div className="px-3 pt-2 pb-1 text-xs font-semibold uppercase tracking-wide text-white/50">{e.label}</div>
                {e.items.map((i) => (
                  <Link key={i.href} href={i.href} className={`${linkClass(i.href)} pl-6`}>
                    {i.label}
                  </Link>
                ))}
              </div>
            );
          })}
          {children && <div className="mt-2 flex flex-col gap-1 border-t border-white/15 px-3 pt-3">{children}</div>}
        </div>
      )}
    </div>
  );
}
