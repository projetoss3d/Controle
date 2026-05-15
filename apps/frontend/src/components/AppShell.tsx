"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthGuard } from "@/lib/auth";
import { Spinner } from "./ui";

const navItems = [
  { href: "/dashboard", label: "Resumo", icon: IconHome },
  { href: "/receitas", label: "Receitas", icon: IconArrowDown },
  { href: "/despesas", label: "Despesas", icon: IconArrowUp },
  { href: "/clientes", label: "Clientes", icon: IconUsers },
  { href: "/socios", label: "Sócios", icon: IconHandshake },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const auth = useAuthGuard();
  const pathname = usePathname();

  if (!auth.ready) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <Spinner />
      </main>
    );
  }

  if (!auth.token) {
    // useAuthGuard já redireciona; placeholder enquanto navega.
    return null;
  }

  return (
    <div className="min-h-screen pb-20 sm:pb-0 sm:pt-0">
      {/* Top bar (desktop) */}
      <header className="hidden sm:flex sticky top-0 z-30 items-center justify-between border-b border-ink-200 bg-white/90 px-6 py-3 backdrop-blur">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="font-bold text-ink-900">
            Controle
          </Link>
          <nav className="flex gap-1">
            {navItems.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-lg px-3 py-2 text-sm transition ${
                    active ? "bg-ink-100 text-ink-900 font-medium" : "text-ink-600 hover:bg-ink-100"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-ink-600">{auth.tenant?.name}</span>
          <span className="text-ink-400">·</span>
          <span className="text-ink-900">{auth.user?.name}</span>
          <button
            onClick={auth.logout}
            className="ml-2 rounded-lg px-2 py-1 text-ink-600 hover:bg-ink-100"
          >
            Sair
          </button>
        </div>
      </header>

      {/* Mobile top */}
      <header className="sm:hidden sticky top-0 z-30 flex items-center justify-between border-b border-ink-200 bg-white px-4 py-3">
        <div>
          <p className="text-xs text-ink-600">{auth.tenant?.name}</p>
          <p className="text-sm font-semibold text-ink-900">{currentLabel(pathname)}</p>
        </div>
        <button onClick={auth.logout} className="rounded-lg px-2 py-1 text-sm text-ink-600">
          Sair
        </button>
      </header>

      <main className="px-4 py-4 sm:px-8 sm:py-6 max-w-5xl mx-auto">{children}</main>

      {/* Bottom nav (mobile) */}
      <nav className="sm:hidden fixed bottom-0 inset-x-0 z-40 border-t border-ink-200 bg-white/95 backdrop-blur">
        <ul className="grid grid-cols-5">
          {navItems.map((item) => {
            const active = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] ${
                    active ? "text-ink-900" : "text-ink-600"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

function currentLabel(pathname: string): string {
  return navItems.find((i) => pathname.startsWith(i.href))?.label ?? "Controle";
}

// ---- ícones SVG inline (sem dependência externa) -----------------

function IconHome(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 11l9-8 9 8v10a2 2 0 0 1-2 2h-4v-7H10v7H6a2 2 0 0 1-2-2V11z" />
    </svg>
  );
}
function IconArrowDown(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 5v14M19 12l-7 7-7-7" />
    </svg>
  );
}
function IconArrowUp(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
  );
}
function IconUsers(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function IconHandshake(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M11 17l2 2a2 2 0 0 0 3-3l-5-5-3 3 3 3z" />
      <path d="M14 6l4 4M3 13l5-5 4 4-5 5z" />
    </svg>
  );
}
