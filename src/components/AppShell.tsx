"use client";

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChartPieSlice, House, ListBullets, Plus, Wallet } from "./icons";
import { useFinance } from "@/lib/store";

const NAV = [
  { href: "/", label: "Resumo", icon: House },
  { href: "/lancamentos", label: "Lançamentos", icon: ListBullets },
  { href: "/graficos", label: "Gráficos", icon: ChartPieSlice },
  { href: "/contas", label: "Contas", icon: Wallet },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const path = usePathname() ?? "/";
  const { openNew } = useFinance();
  const isActive = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));

  // Atalho no computador: tecla N abre um novo lançamento
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing = el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable);
      if (!typing && !e.metaKey && !e.ctrlKey && !e.altKey && e.key.toLowerCase() === "n") {
        e.preventDefault();
        openNew();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openNew]);

  return (
    <div className="min-h-[100dvh]">
      {/* Barra lateral (computador) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-line bg-surface px-4 py-6 lg:flex">
        <div className="flex items-center gap-2.5 px-2">
          <span className="inline-flex size-8 items-center justify-center rounded-[10px] bg-accent text-accent-fg">
            <Wallet size={18} weight="bold" />
          </span>
          <span className="text-[17px] font-semibold tracking-tight">Finanças</span>
        </div>
        <button
          onClick={openNew}
          className="mt-8 inline-flex h-11 items-center justify-center gap-2 rounded-[12px] bg-accent px-4 text-[15px] font-medium text-accent-fg transition-[transform,filter] hover:brightness-110 active:scale-[0.98]"
        >
          <Plus size={18} weight="bold" />
          Novo lançamento
        </button>
        <nav className="mt-6 flex flex-col gap-1">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex h-10 items-center gap-3 rounded-[12px] px-3 text-[15px] transition-colors ${
                  active ? "bg-surface-2 font-medium text-fg" : "text-muted hover:bg-surface-2 hover:text-fg"
                }`}
              >
                <Icon size={19} weight={active ? "fill" : "regular"} />
                {label}
              </Link>
            );
          })}
        </nav>
        <p className="mt-auto px-3 text-xs text-muted">
          Atalho: <kbd className="rounded-md border border-line px-1.5 py-0.5 font-mono text-[11px]">N</kbd> novo lançamento
        </p>
      </aside>

      <main className="pt-safe lg:pl-60">
        <div className="mx-auto w-full max-w-5xl px-4 pb-32 pt-4 sm:px-6 lg:px-10 lg:pb-16 lg:pt-10">{children}</div>
      </main>

      {/* Barra inferior (celular e tablet) */}
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/85 backdrop-blur-xl lg:hidden">
        <div className="mx-auto grid h-16 max-w-lg grid-cols-5 items-center px-2">
          {NAV.slice(0, 2).map((n) => (
            <TabLink key={n.href} {...n} active={isActive(n.href)} />
          ))}
          <div className="flex justify-center">
            <button
              onClick={openNew}
              aria-label="Novo lançamento"
              className="inline-flex size-12 items-center justify-center rounded-full bg-accent text-accent-fg shadow-[0_6px_20px_hsl(var(--shadow)/0.25)] transition-transform active:scale-95"
            >
              <Plus size={22} weight="bold" />
            </button>
          </div>
          {NAV.slice(2).map((n) => (
            <TabLink key={n.href} {...n} active={isActive(n.href)} />
          ))}
        </div>
      </nav>
    </div>
  );
}

function TabLink({ href, label, icon: Icon, active }: (typeof NAV)[number] & { active: boolean }) {
  return (
    <Link
      href={href}
      className={`flex flex-col items-center gap-1 py-1 text-[11px] font-medium transition-colors ${active ? "text-accent" : "text-muted"}`}
    >
      <Icon size={22} weight={active ? "fill" : "regular"} />
      {label}
    </Link>
  );
}
