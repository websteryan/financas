"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { ArrowDownLeft, ArrowRight, ArrowUpRight } from "@/components/icons";
import { Donut, Legend, MonthlyBars, RankBars } from "@/components/charts/Charts";
import { DemoBanner } from "@/components/DemoBanner";
import { PageHeader, Panel } from "@/components/PageHeader";
import { TransactionList } from "@/components/TransactionList";
import { Button, Empty, Skeleton } from "@/components/ui";
import { byCategory, monthlySeries } from "@/lib/derive";
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
  const saved = t.income > 0 ? Math.round(((t.income - t.expense) / t.income) * 100) : null;

  const balance = useCountUp(t.balance);
  const income = useCountUp(t.income);
  const expense = useCountUp(t.expense);

  const donutItems = cats.length > 5 ? [...cats.slice(0, 4), { id: "outras", label: "Demais", color: "#6b6b78", value: cats.slice(4).reduce((a, c) => a + c.value, 0) }] : cats;

  return (
    <div className="fade-in">
      <DemoBanner />
      <PageHeader title="Resumo" subtitle={`${greeting()}!`} />

      {f.error && <p className="mb-4 rounded-[16px] bg-expense/10 px-4 py-3 text-sm text-expense">{f.error}</p>}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5 lg:gap-5">
        {/* Saldo */}
        <section className="bg-brand rise rounded-[28px] p-5 sm:p-7 lg:col-span-3" style={{ "--i": 0 } as CSSProperties}>
          <p className="text-[14px] font-medium opacity-70">Saldo do mês</p>
          {f.loading ? (
            <Skeleton className="mt-2 h-12 w-56 bg-black/15" />
          ) : (
            <p className="num mt-1 text-[44px] font-semibold leading-none tracking-tight sm:text-[56px]">
              {balance < 0 ? "-" : ""}
              {money(Math.abs(balance))}
            </p>
          )}
          {!f.loading && delta != null && delta !== 0 && (
            <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-black/15 px-3 py-1 text-[13px] font-medium">
              {delta > 0 ? "▲" : "▼"} {Math.abs(delta)}% em gastos vs {prev?.label}
            </p>
          )}

          <div className="mt-6 grid grid-cols-3 gap-2.5">
            <Pill label="Receitas" value={money(income)} />
            <Pill label="Gastos" value={money(expense)} />
            <Pill label="Economia" value={saved == null ? "-" : `${saved}%`} />
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => f.openNew("despesa")}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#0b0816] text-[15px] font-semibold text-fg transition-transform active:scale-[0.97]"
            >
              <ArrowUpRight size={18} weight="bold" /> Gasto
            </button>
            <button
              type="button"
              onClick={() => f.openNew("receita")}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-black/25 text-[15px] font-semibold transition-transform active:scale-[0.97]"
            >
              <ArrowDownLeft size={18} weight="bold" /> Receita
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
        <Panel
          title="Fluxo dos últimos 6 meses"
          className="rise lg:col-span-3"
          action={
            <Legend
              items={[
                { label: "Receitas", color: "var(--chart-income)" },
                { label: "Gastos", color: "var(--chart-expense)" },
              ]}
            />
          }
        >
          {f.loading ? <Skeleton className="h-[200px]" /> : <MonthlyBars data={series} />}
        </Panel>

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

function Pill({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-[18px] bg-black/15 px-2.5 py-2.5 sm:px-3">
      <p className="text-[12px] font-medium opacity-70">{label}</p>
      <p className="num mt-0.5 whitespace-nowrap text-[13px] font-semibold sm:text-[15px]">{value}</p>
    </div>
  );
}
