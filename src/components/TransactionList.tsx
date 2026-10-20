"use client";

import { useRef, type CSSProperties } from "react";
import { dayLabel, money } from "@/lib/format";
import { useFinance } from "@/lib/store";
import type { Transaction } from "@/lib/types";

export function Amount({ tx, className = "" }: { tx: Pick<Transaction, "kind" | "amount_cents">; className?: string }) {
  const income = tx.kind === "receita";
  return (
    <span className={`num whitespace-nowrap font-semibold ${income ? "text-income" : "text-fg"} ${className}`}>
      {income ? "+" : "-"} {money(tx.amount_cents)}
    </span>
  );
}

export function TransactionRow({ tx, anim = "" , index = 0 }: { tx: Transaction; anim?: string; index?: number }) {
  const { openEdit, accountById, categoryById } = useFinance();
  const cat = categoryById(tx.category_id);
  const acc = accountById(tx.account_id);
  const color = cat?.color ?? "#8b8b93";
  return (
    <button
      type="button"
      onClick={() => openEdit(tx)}
      style={{ "--i": index } as CSSProperties}
      className={`${anim} tile group flex w-full items-center gap-3.5 rounded-[22px] px-3.5 py-3 text-left transition-[background-color,transform] hover:bg-surface-2 active:scale-[0.99]`}
    >
      <span
        className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-[15px] font-semibold"
        style={{ background: `${color}2b`, color }}
        aria-hidden
      >
        {(cat?.name ?? tx.description).charAt(0).toUpperCase()}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[16px] font-medium text-fg">{tx.description}</span>
        <span className="block truncate text-[13px] text-muted">
          {[cat?.name ?? "Sem categoria", acc?.name, tx.installments ? `${tx.installment}/${tx.installments}` : null]
            .filter(Boolean)
            .join(" \u2022 ")}
        </span>
      </span>
      <Amount tx={tx} className="text-[16px]" />
    </button>
  );
}

export function TransactionList({ items }: { items: Transaction[] }) {
  // Na primeira exibição as linhas entram em sequência; depois, só o lançamento novo "cai" na lista.
  const seen = useRef<Set<string> | null>(null);
  const initial = seen.current === null;
  const known = seen.current ?? new Set<string>();
  const fresh = new Set(items.filter((t) => !known.has(t.id)).map((t) => t.id));
  seen.current = new Set([...known, ...items.map((t) => t.id)]);
  let n = 0;
  const days: { date: string; items: Transaction[] }[] = [];
  for (const t of items) {
    const last = days[days.length - 1];
    if (last && last.date === t.date) last.items.push(t);
    else days.push({ date: t.date, items: [t] });
  }
  return (
    <div className="flex flex-col gap-6">
      {days.map((d) => {
        const net = d.items.reduce((s, t) => s + (t.kind === "receita" ? t.amount_cents : -t.amount_cents), 0);
        return (
          <section key={d.date}>
            <header className="flex items-baseline justify-between px-2 pb-2">
              <h3 className="text-[13px] font-medium text-muted">{dayLabel(d.date)}</h3>
              {d.items.length > 1 && (
                <span className="num text-[13px] text-muted">
                  {net >= 0 ? "+" : "-"} {money(Math.abs(net))}
                </span>
              )}
            </header>
            <div className="flex flex-col gap-2.5">
              {d.items.map((t) => (
                <TransactionRow key={t.id} tx={t} anim={initial ? "rise" : fresh.has(t.id) ? "item-in" : ""} index={initial ? Math.min(n++, 8) : 0} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
