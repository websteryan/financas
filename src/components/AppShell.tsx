"use client";

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChartPieSlice, House, ListBullets, Plus, Wallet } from "./icons";
import { Logo } from "./Logo";
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
      <aside className="glass fixed inset-y-3 left-3 z-30 hidden w-60 flex-col rounded-[28px] px-4 py-6 lg:flex">
        <div className="flex items-center gap-2.5 px-2">
          <Logo size={38} className="drop-shadow-[0_6px_14px_rgb(124_77_255/0.5)]" />
          <span className="text-[17px] font-semibold tracking-tight">Finanças</span>
        </div>
        <button
          onClick={() => openNew()}
          className="bg-brand glow mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-full px-4 text-[15px] font-medium transition-[transform,filter] hover:brightness-110 active:scale-[0.98]"
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
                  active ? "bg-accent-soft font-medium text-fg" : "text-muted hover:bg-surface-2 hover:text-fg"
                }`}
              >
                <Icon size={19} weight={active ? "fill" : "regular"} className={active ? "text-accent-text" : ""} />
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

      {/* Barra inferior flutuante (celular e tablet) */}
      <nav
        aria-label="Navegação"
        className="fixed inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] z-30 px-4 lg:hidden"
      >
        <div className="mx-auto flex max-w-md items-center gap-3">
          <div className="glass flex h-16 flex-1 items-center justify-around rounded-full px-2 shadow-[0_12px_40px_hsl(var(--shadow)/0.6)]">
            {NAV.map((n) => (
              <TabLink key={n.href} {...n} active={isActive(n.href)} />
            ))}
          </div>
          <button
            onClick={() => openNew()}
            aria-label="Novo lançamento"
            className="bg-brand glow inline-flex size-16 shrink-0 items-center justify-center rounded-full transition-transform active:scale-95"
          >
            <Plus size={26} weight="bold" />
          </button>
        </div>
      </nav>
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
      className={`relative flex size-12 items-center justify-center rounded-full transition-colors ${active ? "text-accent-text" : "text-muted"}`}
    >
      <Icon size={24} weight={active ? "fill" : "regular"} />
      {active && <span className="absolute bottom-1 h-[3px] w-4 rounded-full bg-accent-text" />}
    </Link>
  );
}
