"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowDownLeft, ArrowRight, ArrowUpRight, CaretDown, Check, Eye, EyeSlash, X } from "@/components/icons";
import { CashflowBars, Donut, RankBars, type CashDatum } from "@/components/charts/Charts";
import { DemoBanner } from "@/components/DemoBanner";
import { Panel } from "@/components/PageHeader";
import { TransactionList } from "@/components/TransactionList";
import { AccountGlyph, BigMoney, Button, IconButton, Empty, MonthPicker, Segmented, Skeleton } from "@/components/ui";
import { NewButton } from "@/components/PageHeader";
import { Logo } from "@/components/Logo";
import { byCategory, monthlySeries, statBuckets, type StatMode } from "@/lib/derive";
import { money } from "@/lib/format";
import { useCountUp } from "@/lib/motion";
import { totals, useFinance } from "@/lib/store";

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
}

export default function ResumoPage() {
  const f = useFinance();
  const [accFilter, setAccFilter] = useState<string | null>(null);
  const mtx = accFilter ? f.monthTx.filter((x) => x.account_id === accFilter) : f.monthTx;
  const wtx = accFilter ? f.windowTx.filter((x) => x.account_id === accFilter) : f.windowTx;
  const t = totals(mtx);
  const cats = byCategory(mtx, f.categories, "despesa").sort((a, b) => b.value - a.value);
  const series = monthlySeries(wtx, f.month);
  const prev = series[series.length - 2];
  const delta = prev && prev.expense > 0 ? Math.round(((t.expense - prev.expense) / prev.expense) * 100) : null;

  const [mode, setMode] = useState<StatMode>("semanal");
  const [tab, setTab] = useState<"receita" | "despesa" | "economia">("despesa");
  const [pick, setPick] = useState<string | null>(null);

  const balance = useCountUp(t.balance);
  const total = useCountUp(f.totalBalance);

  const accRows = f.accounts.map((a) => ({ id: a.id, name: a.name, color: a.color, balance: f.balanceOf(a.id) }));

  const buckets: CashDatum[] = (() => {
    if (tab === "economia") {
      const inc = statBuckets(mode, "receita", mtx, wtx, f.month);
      const exp = statBuckets(mode, "despesa", mtx, wtx, f.month);
      return inc.map((b, i) => ({ key: b.key, label: b.label, value: Math.max(0, b.value - (exp[i]?.value ?? 0)) }));
    }
    return statBuckets(mode, tab, mtx, wtx, f.month).map((b) => ({ key: b.key, label: b.label, value: b.value }));
  })();
  const flowTotal = buckets.reduce((s, b) => s + b.value, 0);
  const current = buckets.find((b) => b.key === pick) ?? [...buckets].reverse().find((b) => b.value > 0) ?? buckets[buckets.length - 1];

  const budgetRows = f.budgets
    .map((b) => {
      const c = f.categoryById(b.category_id);
      const spent = mtx.filter((x) => x.kind === "despesa" && x.category_id === b.category_id).reduce((n, x) => n + x.amount_cents, 0);
      return { id: b.id, name: c?.name ?? "Categoria", color: c?.color ?? "#8b8b93", limit: b.limit_cents, spent, pct: Math.round((spent / b.limit_cents) * 100) };
    })
    .sort((a, b) => b.pct - a.pct);

  const donutItems = cats.length > 5 ? [...cats.slice(0, 4), { id: "outras", label: "Demais", color: "#5d5675", value: cats.slice(4).reduce((a, c) => a + c.value, 0) }] : cats;

  return (
    <div className="fade-in">
      <DemoBanner />
      <header className="mb-6 flex items-center gap-3 lg:mb-8">
        <Logo size={36} className="lg:hidden" />
        <div className="min-w-0 flex-1">
          <p className="text-[14px] text-muted">{greeting()}</p>
          <h1 className="text-[26px] font-semibold leading-tight tracking-tight lg:text-[34px]">Olá, bem-vindo</h1>
        </div>
        <NewButton />
      </header>

      {f.error && <p className="mb-4 rounded-[16px] bg-expense/10 px-4 py-3 text-sm text-expense">{f.error}</p>}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5 lg:gap-5">
        {/* Saldo + contas */}
        <section className="rise lg:col-span-3">
          <div className="flex items-center justify-between gap-3">
            <p className="whitespace-nowrap text-[15px] font-medium text-muted">Saldo total</p>
            <IconButton label={f.hidden ? "Mostrar valores" : "Ocultar valores"} onClick={f.toggleHidden} className="size-9">
              {f.hidden ? <EyeSlash size={17} /> : <Eye size={17} />}
            </IconButton>
          </div>
          {f.loading ? (
            <Skeleton className="mt-3 h-12 w-56" />
          ) : (
            <p className={`mt-2 text-[44px] leading-none tracking-tight sm:text-[56px] ${total < 0 ? "text-expense" : ""}`}>
              <BigMoney cents={total} />
            </p>
          )}

          <div className="card mt-5 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="whitespace-nowrap text-[14px] font-medium text-muted">Resultado do mês</p>
              <MonthPicker value={f.month} onChange={f.setMonth} />
            </div>
            {f.loading ? (
              <Skeleton className="mt-3 h-8 w-40" />
            ) : (
              <p className={`num mt-2 text-[26px] font-semibold leading-none tracking-tight ${balance < 0 ? "text-expense" : ""}`}>
                {balance > 0 ? "+ " : ""}
                {money(balance)}
              </p>
            )}
            <div className="mt-3 flex gap-5 text-[13px] text-muted">
              <span>
                Receitas <span className="num text-income">{money(t.income)}</span>
              </span>
              <span>
                Gastos <span className="num text-fg">{money(t.expense)}</span>
              </span>
            </div>
            {!f.loading && delta != null && delta !== 0 && (
              <p className="mt-2 text-[13px] text-muted">
                <span className={delta > 0 ? "text-expense" : "text-income"}>
                  {delta > 0 ? "\u25B2" : "\u25BC"} {Math.abs(delta)}%
                </span>{" "}
                em gastos vs {prev?.label}
              </p>
            )}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => f.openNew("receita")}
              className="tile inline-flex h-11 items-center justify-center gap-2 rounded-ctl text-[15px] font-medium transition-[transform,background-color] hover:bg-surface-3 active:scale-[0.97]"
            >
              <ArrowDownLeft size={18} weight="bold" /> Nova receita
            </button>
            <button
              type="button"
              onClick={() => f.openNew("despesa")}
              className="bg-brand inline-flex h-11 items-center justify-center gap-2 rounded-ctl text-[15px] font-medium transition-[transform,filter] hover:brightness-110 active:scale-[0.97]"
            >
              <ArrowUpRight size={18} weight="bold" /> Novo gasto
            </button>
          </div>

          <div className="mb-2 mt-7 flex items-center justify-between px-1">
            <h2 className="text-[13px] font-medium text-muted">Contas</h2>
            {accFilter && (
              <button type="button" onClick={() => setAccFilter(null)} className="pop inline-flex items-center gap-1 text-[13px] font-medium text-accent-text">
                Limpar filtro <X size={12} weight="bold" />
              </button>
            )}
          </div>
          {f.loading ? (
            <Skeleton className="h-[132px] rounded-[16px]" />
          ) : accRows.length === 0 ? null : (
            <div className="card divide-y divide-line overflow-hidden">
              {accRows.map((a) => {
                const on = accFilter === a.id;
                return (
                  <button
                    key={a.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setAccFilter(on ? null : a.id)}
                    className={`flex w-full items-center gap-3.5 px-4 py-3 text-left transition-colors hover:bg-surface-2 ${on ? "bg-surface-2" : ""}`}
                  >
                    <AccountGlyph color={a.color} size={40} />
                    <span className="min-w-0 flex-1 truncate text-[16px] font-medium">{a.name}</span>
                    <span className={`num text-[16px] font-semibold ${a.balance < 0 ? "text-expense" : ""}`}>{money(a.balance)}</span>
                    <Check size={16} weight="bold" className={`shrink-0 text-accent-text transition-opacity ${on ? "opacity-100" : "opacity-0"}`} />
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Rosca de gastos */}
        <Panel title="Gastos por categoria" className="rise lg:col-span-2" >
          {f.loading ? (
            <Skeleton className="h-[200px]" />
          ) : cats.length === 0 ? (
            <Empty title="Sem gastos" text="Os gastos do mês aparecem aqui, separados por categoria." />
          ) : (
            <div className="flex flex-col items-center gap-5 sm:flex-row lg:flex-col 2xl:flex-row">
              <Donut items={donutItems} centerLabel="Total gasto" />
              <ul className="flex w-full min-w-0 flex-1 flex-col gap-2.5">
                {donutItems.map((c) => (
                  <li key={c.id} className="flex items-center gap-2.5 text-[14px]">
                    <span className="size-2.5 shrink-0 rounded-full" style={{ background: c.color }} />
                    <span className="min-w-0 flex-1 truncate">{c.label}</span>
                    <span className="num text-muted">{t.expense > 0 ? Math.round((c.value / t.expense) * 100) : 0}%</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Panel>

        {/* Fluxo de caixa */}
        <section className="card rise p-5 sm:p-6 lg:col-span-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[17px] font-medium">Fluxo de caixa</h2>
            <label className="tile relative inline-flex h-10 items-center rounded-ctl pl-4 pr-9 text-[14px] font-medium">
              <span className="sr-only">Período</span>
              <select
                value={mode}
                onChange={(e) => {
                  setMode(e.target.value as StatMode);
                  setPick(null);
                }}
                className="cursor-pointer appearance-none bg-transparent pr-1 outline-none"
              >
                <option value="diario">Diário</option>
                <option value="semanal">Semanal</option>
                <option value="mensal">Mensal</option>
              </select>
              <CaretDown size={14} weight="bold" className="pointer-events-none absolute right-3.5 text-muted" />
            </label>
          </div>
          <p className="mt-3 text-[34px] leading-none tracking-tight">{f.loading ? <Skeleton className="h-9 w-48" /> : <BigMoney cents={flowTotal} />}</p>
          <Segmented
            className="mt-4"
            value={tab}
            onChange={(k) => {
              setTab(k);
              setPick(null);
            }}
            options={[
              { value: "receita", label: "Receitas" },
              { value: "despesa", label: "Gastos" },
              { value: "economia", label: "Economia" },
            ]}
          />
          <div className="mt-6">
            {f.loading ? <Skeleton className="h-[238px]" /> : <CashflowBars data={buckets} selected={current?.key ?? ""} onSelect={setPick} />}
          </div>
        </section>

        {/* Ranking */}
        <Panel
          title="Onde foi o dinheiro"
          className="rise lg:col-span-2"
          action={
            <Link href="/graficos" className="text-[14px] font-medium text-accent-text">
              Detalhes
            </Link>
          }
        >
          {f.loading ? <Skeleton className="h-[200px]" /> : cats.length === 0 ? <Empty title="Sem gastos" text="Nada por aqui ainda." /> : <RankBars items={cats} limit={5} />}
        </Panel>
      </div>

      {!f.loading && budgetRows.length > 0 && (
        <Panel title="Orçamento do mês" className="rise mt-4 lg:mt-5" action={<Link href="/contas" className="text-[14px] font-medium text-accent-text">Editar</Link>}>
          <ul className="grid grid-cols-1 gap-x-8 gap-y-5 lg:grid-cols-2">
            {budgetRows.map((r) => (
              <li key={r.id}>
                <div className="mb-2 flex items-baseline justify-between gap-3 text-[14px]">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="size-2.5 shrink-0 rounded-full" style={{ background: r.color }} />
                    <span className="truncate font-medium">{r.name}</span>
                  </span>
                  <span className={`num shrink-0 ${r.pct >= 100 ? "text-expense" : "text-muted"}`}>
                    {money(r.spent)} de {money(r.limit)}
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-white/[0.07]" role="progressbar" aria-valuenow={Math.min(100, r.pct)} aria-valuemin={0} aria-valuemax={100} aria-label={`${r.name}: ${r.pct}% do limite`}>
                  <div
                    className="grow-x h-full rounded-full"
                    style={{ width: `${Math.min(100, r.pct)}%`, background: r.pct >= 100 ? "var(--expense)" : r.pct >= 80 ? "var(--warn)" : "var(--accent)" }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between px-1">
          <h2 className="text-[19px] font-semibold">Últimos lançamentos</h2>
          {mtx.length > 0 && (
            <Link href="/lancamentos" className="inline-flex items-center gap-1 text-[14px] font-medium text-accent-text">
              Ver todos <ArrowRight size={14} weight="bold" />
            </Link>
          )}
        </div>
        {f.loading ? (
          <div className="flex flex-col gap-2.5">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-[68px] rounded-[22px]" />
            ))}
          </div>
        ) : mtx.length === 0 ? (
          <div className="card">
            <Empty
              title="Nada lançado neste mês"
              text="Registre um gasto ou uma receita para começar."
              action={
                <Button variant="primary" onClick={() => f.openNew()}>
                  Novo lançamento
                </Button>
              }
            />
          </div>
        ) : (
          <TransactionList items={mtx.slice(0, 6)} />
        )}
      </section>
    </div>
  );
}
