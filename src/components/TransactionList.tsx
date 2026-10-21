"use client";

import { useRef, type CSSProperties, type PointerEvent as RPointerEvent } from "react";
import { PencilSimple, Trash } from "./icons";
import { CategoryGlyph, showToast } from "./ui";
import { dayLabel, money } from "@/lib/format";
import { useFinance } from "@/lib/store";
import { PAYMENT_LABEL, methodOf, type Transaction } from "@/lib/types";

export function Amount({ tx, className = "" }: { tx: Pick<Transaction, "kind" | "amount_cents">; className?: string }) {
  const income = tx.kind === "receita";
  return (
    <span className={`num whitespace-nowrap font-semibold ${income ? "text-income" : "text-fg"} ${className}`}>
      {income ? "+" : "-"} {money(tx.amount_cents)}
    </span>
  );
}

export function TransactionRow({ tx, anim = "" , index = 0 }: { tx: Transaction; anim?: string; index?: number }) {
  const { openEdit, accountById, categoryById, removing, deleteTransaction, addTransactions } = useFinance();
  const btn = useRef<HTMLButtonElement>(null);
  const bg = useRef<HTMLDivElement>(null);
  const swipe = useRef<{ x: number; y: number; dx: number; lock: boolean | null } | null>(null);
  const moved = useRef(false);

  function onDown(e: RPointerEvent) {
    if (e.pointerType === "mouse") return;
    swipe.current = { x: e.clientX, y: e.clientY, dx: 0, lock: null };
    moved.current = false;
  }
  function onMove(e: RPointerEvent) {
    const sw = swipe.current;
    if (!sw || !btn.current) return;
    const dx = e.clientX - sw.x;
    const dy = e.clientY - sw.y;
    if (sw.lock === null && Math.abs(dx) + Math.abs(dy) > 8) sw.lock = Math.abs(dx) > Math.abs(dy) * 1.4;
    if (!sw.lock) return;
    moved.current = true;
    sw.dx = Math.max(-140, Math.min(140, dx));
    btn.current.style.transition = "none";
    btn.current.style.transform = `translateX(${sw.dx}px)`;
    if (bg.current) bg.current.dataset.side = sw.dx < 0 ? "del" : "edit";
    if (bg.current) bg.current.style.opacity = String(Math.min(1, Math.abs(sw.dx) / 60));
  }
  function onUp() {
    const sw = swipe.current;
    swipe.current = null;
    if (!sw || !btn.current) return;
    btn.current.style.transition = "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)";
    btn.current.style.transform = "";
    if (bg.current) bg.current.style.opacity = "0";
    if (sw.dx <= -96) {
      const { id: _i, created_at: _c, ...row } = tx;
      void deleteTransaction(tx.id).then(() =>
        showToast("Lançamento excluído", { label: "Desfazer", onClick: () => void addTransactions([row]) }),
      );
    } else if (sw.dx >= 96) openEdit(tx);
    window.setTimeout(() => (moved.current = false), 50);
  }
  const leaving = removing.has(tx.id);
  const cat = categoryById(tx.category_id);
  const acc = accountById(tx.account_id);
  return (
    <div className={`grid transition-[grid-template-rows] duration-300 ease-[var(--ease-out)] ${leaving ? "grid-rows-[0fr]" : "grid-rows-[1fr]"}`}>
    <div className="min-h-0 overflow-hidden">
    <div className="pb-2.5">
    <div className="relative">
    <div
      ref={bg}
      aria-hidden
      style={{ opacity: 0 }}
      className="group/bg pointer-events-none absolute inset-0 flex items-center justify-between rounded-[22px] bg-accent-soft px-6 text-accent-text data-[side=del]:bg-expense/15 data-[side=del]:text-expense lg:hidden"
    >
      <PencilSimple size={20} weight="bold" className="opacity-0 group-data-[side=edit]/bg:opacity-100" />
      <Trash size={20} weight="bold" className="opacity-0 group-data-[side=del]/bg:opacity-100" />
    </div>
    <button
      ref={btn}
      type="button"
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onClick={() => !moved.current && openEdit(tx)}
      style={{ "--i": index } as CSSProperties}
      className={`${leaving ? "item-out" : anim} tile group relative flex w-full touch-pan-y items-center gap-3.5 rounded-[22px] px-3.5 py-3 text-left transition-[background-color,transform] hover:bg-surface-3 active:scale-[0.99]`}
    >
      <CategoryGlyph category={cat} size={44} fallback={tx.description} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[16px] font-medium text-fg">{tx.description}</span>
        <span className="block truncate text-[13px] text-muted">
          {[
            cat?.name ?? "Sem categoria",
            acc?.name,
            tx.kind === "despesa" ? PAYMENT_LABEL[methodOf(tx, acc)] : null,
            tx.installments ? `${tx.installment}/${tx.installments}` : null,
          ]
            .filter(Boolean)
            .join(" \u2022 ")}
        </span>
      </span>
      <Amount tx={tx} className="text-[16px]" />
    </button>
    </div>
    </div>
    </div>
    </div>
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
            <div className="flex flex-col">
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
