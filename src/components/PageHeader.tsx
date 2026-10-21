"use client";

import type { ReactNode } from "react";
import { MonthPicker } from "./ui";
import { useFinance } from "@/lib/store";

export function PageHeader({ title, subtitle, children, month = true }: { title: string; subtitle?: string; children?: ReactNode; month?: boolean }) {
  const f = useFinance();
  return (
    <header className="mb-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 lg:mb-8">
      <div>
        {subtitle && <p className="text-[14px] text-muted">{subtitle}</p>}
        <h1 className="text-[28px] font-semibold tracking-tight lg:text-[34px]">{title}</h1>
      </div>
      <div className="flex items-center gap-2">
        {children}
        {month && <MonthPicker value={f.month} onChange={f.setMonth} />}
      </div>
    </header>
  );
}

export function Panel({ title, action, children, className = "" }: { title?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`card p-5 sm:p-6 ${className}`}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && <h2 className="whitespace-nowrap text-[17px] font-medium">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
