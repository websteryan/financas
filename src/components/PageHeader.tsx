"use client";

import type { ReactNode } from "react";
import { Plus } from "./icons";
import { IconButton, MonthPicker } from "./ui";
import { useFinance } from "@/lib/store";

export function PageHeader({ title, subtitle, children, month = true, newButton = true }: { title: string; subtitle?: string; children?: ReactNode; month?: boolean; newButton?: boolean }) {
  const f = useFinance();
  return (
    <header className="mb-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 lg:mb-8">
      <div className="min-w-0 flex-1 lg:flex-none">
        {subtitle && <p className="text-[14px] text-muted">{subtitle}</p>}
        <h1 className="text-[28px] font-semibold tracking-tight lg:text-[34px]">{title}</h1>
      </div>
      {newButton && <NewButton />}
      <div className="order-last flex w-full items-center gap-2 lg:order-none lg:w-auto">
        {children}
        {month && <MonthPicker value={f.month} onChange={f.setMonth} />}
      </div>
    </header>
  );
}

/** Minimal: o + vira ação no cabeçalho (celular). No Moderno é o botão flutuante. */
export function NewButton() {
  const { openNew } = useFinance();
  return (
    <span className="minimal-only">
      <IconButton label="Novo lançamento" onClick={() => openNew()} className="bg-brand border-0 text-accent-fg hover:brightness-110 lg:hidden">
        <Plus size={18} weight="bold" />
      </IconButton>
    </span>
  );
}

export function Panel({ title, action, children, className = "" }: { title?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`card p-5 sm:p-6 ${className}`}>
      {(title || action) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          {title && <h2 className="whitespace-nowrap text-[17px] font-medium">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
