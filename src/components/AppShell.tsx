"use client";

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChartLineUp, ChartPieSlice, House, ListBullets, Plus, Wallet } from "./icons";
import { Logo } from "./Logo";
import { useFinance } from "@/lib/store";

const NAV = [
  { href: "/", label: "Resumo", icon: House },
  { href: "/lancamentos", label: "Lançamentos", icon: ListBullets },
  { href: "/graficos", label: "Gráficos", icon: ChartPieSlice },
  { href: "/investimentos", label: "Investimentos", icon: ChartLineUp },
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
      <aside className="glass fixed inset-y-3 left-3 z-30 hidden w-60 flex-col rounded-[24px] px-4 py-6 lg:flex">
        <div className="flex items-center gap-2.5 px-2">
          <Logo size={38} className="drop-shadow-[0_6px_14px_rgb(124_77_255/0.5)]" />
          <span className="text-[17px] font-semibold tracking-tight">Finanças</span>
        </div>
        <button
          onClick={() => openNew()}
          className="bg-brand mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-full px-4 text-[15px] font-semibold transition-[transform,filter] hover:brightness-110 active:scale-[0.98]"
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
                className={`flex h-11 items-center gap-3 rounded-full px-4 text-[15px] transition-colors ${
                  active ? "bg-brand font-semibold" : "text-muted hover:bg-surface-2 hover:text-fg"
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

      <main className="pt-safe lg:pl-[16.5rem]">
        <div className="mx-auto w-full max-w-5xl px-4 pb-36 pt-4 sm:px-6 lg:px-10 lg:pb-16 lg:pt-10">{children}</div>
      </main>

      {/* Barra inferior flutuante (celular e tablet): a aba atual abre em pílula com o nome */}
      <nav aria-label="Navegação" className="fixed inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] z-30 flex justify-center px-4 lg:hidden">
        <div className="glass flex items-center gap-1 rounded-full p-1.5">
          {NAV.map((n) => (
            <TabLink key={n.href} {...n} active={isActive(n.href)} />
          ))}
        </div>
      </nav>
      {path !== "/" && (
        <button
          onClick={() => openNew()}
          aria-label="Novo lançamento"
          className="bg-brand pop fixed bottom-[calc(5.75rem+env(safe-area-inset-bottom))] right-4 z-30 inline-flex size-14 items-center justify-center rounded-full shadow-[0_8px_24px_rgb(0_0_0/0.45)] transition-transform active:scale-95 lg:hidden"
        >
          <Plus size={24} weight="bold" />
        </button>
      )}
    </div>
  );
}

function TabLink({ href, label, icon: Icon, active }: (typeof NAV)[number] & { active: boolean }) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      aria-current={active ? "page" : undefined}
      className={`flex h-10 items-center justify-center rounded-full transition-colors min-[400px]:h-11 ${
        active ? "bg-brand gap-1.5 px-3.5 text-[14px] font-semibold" : "tile size-10 text-muted hover:text-fg min-[400px]:size-11"
      }`}
    >
      <Icon size={20} weight={active ? "fill" : "regular"} />
      {active && <span className="whitespace-nowrap">{label}</span>}
    </Link>
  );
}
