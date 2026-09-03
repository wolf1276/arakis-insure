"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/claims", label: "Claims" },
  { href: "/disaster", label: "Disaster" },
  { href: "/operations", label: "Operations" },
];

export function Nav() {
  const pathname = usePathname();
  const { user, ready, logout } = useAuth();

  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 md:px-8">
        <Link href="/" className="text-lg font-semibold tracking-tight text-brand">
          SurakshChain
        </Link>
        <nav className="hidden gap-6 text-sm font-medium text-muted md:flex">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={pathname === link.href ? "text-brand" : "hover:text-foreground"}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="text-sm">
          {!ready ? null : user ? (
            <div className="flex items-center gap-3">
              <span className="hidden text-muted sm:inline">{user.name}</span>
              <button onClick={logout} className="rounded-full border border-border px-4 py-1.5 font-medium hover:bg-brand-soft">
                Log out
              </button>
            </div>
          ) : (
            <Link href="/login" className="rounded-full bg-brand px-4 py-1.5 font-medium text-white hover:opacity-90">
              Log in
            </Link>
          )}
        </div>
      </div>
      <nav className="flex gap-4 overflow-x-auto border-t border-border px-4 py-2 text-sm font-medium text-muted md:hidden">
        {LINKS.map((link) => (
          <Link key={link.href} href={link.href} className={pathname === link.href ? "text-brand" : ""}>
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
