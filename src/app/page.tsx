"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowDownLeft, ArrowRight, ArrowUpRight, CaretDown } from "@/components/icons";
import { AccountBubbles, CashflowBars, Donut, RankBars, type CashDatum } from "@/components/charts/Charts";
import { DemoBanner } from "@/components/DemoBanner";
import { Panel } from "@/components/PageHeader";
import { TransactionList } from "@/components/TransactionList";
import { BigMoney, Button, Empty, MonthPicker, Segmented, Skeleton } from "@/components/ui";
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
  const t = totals(f.monthTx);
  const cats = byCategory(f.monthTx, f.categories, "despesa").sort((a, b) => b.value - a.value);
  const series = monthlySeries(f.windowTx, f.month);
  const prev = series[series.length - 2];
  const delta = prev && prev.expense > 0 ? Math.round(((t.expense - prev.expense) / prev.expense) * 100) : null;

  const [mode, setMode] = useState<StatMode>("semanal");
  const [tab, setTab] = useState<"receita" | "despesa" | "economia">("despesa");
  const [pick, setPick] = useState<string | null>(null);

  const balance = useCountUp(t.balance);

  const bubbles = f.accounts
    .map((a) => {
      const own = f.monthTx.filter((x) => x.account_id === a.id);
      const tt = totals(own);
      return { id: a.id, label: a.name, value: tt.balance, weight: tt.income + tt.expense };
    })
    .sort((x, y) => y.weight - x.weight)
    .slice(0, 3);

  const buckets: CashDatum[] = (() => {
    if (tab === "economia") {
      const inc = statBuckets(mode, "receita", f.monthTx, f.windowTx, f.month);
      const exp = statBuckets(mode, "despesa", f.monthTx, f.windowTx, f.month);
      return inc.map((b, i) => ({ key: b.key, label: b.label, value: Math.max(0, b.value - (exp[i]?.value ?? 0)) }));
    }
    return statBuckets(mode, tab, f.monthTx, f.windowTx, f.month).map((b) => ({ key: b.key, label: b.label, value: b.value }));
  })();
  const flowTotal = buckets.reduce((s, b) => s + b.value, 0);
  const current = buckets.find((b) => b.key === pick) ?? [...buckets].reverse().find((b) => b.value > 0) ?? buckets[buckets.length - 1];

  const donutItems = cats.length > 5 ? [...cats.slice(0, 4), { id: "outras", label: "Demais", color: "#6b6b78", value: cats.slice(4).reduce((a, c) => a + c.value, 0) }] : cats;

  return (
    <div className="fade-in">
      <DemoBanner />
      <header className="mb-5 flex items-center gap-3 lg:mb-7">
        <Logo size={40} className="lg:hidden" />
        <div>
          <p className="text-[14px] text-muted">{greeting()}</p>
          <h1 className="text-[26px] font-semibold leading-tight tracking-tight lg:text-[34px]">Olá, bem-vindo</h1>
        </div>
      </header>

      {f.error && <p className="mb-4 rounded-[16px] bg-expense/10 px-4 py-3 text-sm text-expense">{f.error}</p>}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5 lg:gap-5">
        {/* Saldo + contas */}
        <section className="card rise p-5 sm:p-6 lg:col-span-3">
          <div className="flex items-start justify-between gap-3">
            <p className="whitespace-nowrap pt-2 text-[16px] font-medium">Saldo do mês</p>
            <MonthPicker value={f.month} onChange={f.setMonth} />
          </div>
          {f.loading ? (
            <Skeleton className="mt-3 h-11 w-56" />
          ) : (
            <p className={`mt-3 text-[40px] leading-none tracking-tight sm:text-[48px] ${balance < 0 ? "text-expense" : ""}`}>
              <BigMoney cents={balance} />
            </p>
          )}
          {!f.loading && delta != null && delta !== 0 && (
            <p className="mt-2.5 text-[13px] text-muted">
              <span className={delta > 0 ? "text-expense" : "text-income"}>
                {delta > 0 ? "▲" : "▼"} {Math.abs(delta)}%
              </span>{" "}
              em gastos vs {prev?.label}
            </p>
          )}

          <div className="mt-5">
            {f.loading ? <Skeleton className="h-[120px] rounded-[40px]" /> : bubbles.length > 0 ? <AccountBubbles items={bubbles} /> : null}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => f.openNew("receita")}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-line text-[15px] font-medium transition-[transform,background-color] hover:bg-surface-2 active:scale-[0.97]"
            >
              <ArrowDownLeft size={18} weight="bold" /> Nova receita
            </button>
            <button
              type="button"
              onClick={() => f.openNew("despesa")}
              className="tile inline-flex h-12 items-center justify-center gap-2 rounded-full text-[15px] font-medium transition-[transform,background-color] hover:bg-white/10 active:scale-[0.97]"
            >
              <ArrowUpRight size={18} weight="bold" /> Novo gasto
            </button>
          </div>
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
            <label className="tile relative inline-flex h-10 items-center rounded-full pl-4 pr-9 text-[14px] font-medium">
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

      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between px-1">
          <h2 className="text-[19px] font-semibold">Últimos lançamentos</h2>
          {f.monthTx.length > 0 && (
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
        ) : f.monthTx.length === 0 ? (
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
          <TransactionList items={f.monthTx.slice(0, 6)} />
        )}
      </section>
    </div>
  );
}
