"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowDownLeft, ArrowRight, ArrowUpRight, ChartPieSlice, Wallet } from "@/components/icons";
import { CompositionBar, Legend, MonthlyBars, RankBars } from "@/components/charts/Charts";
import { DemoBanner } from "@/components/DemoBanner";
import { PageHeader, Panel } from "@/components/PageHeader";
import { TransactionList } from "@/components/TransactionList";
import { Button, Empty, Skeleton } from "@/components/ui";
import { byCategory, monthlySeries } from "@/lib/derive";
import { money } from "@/lib/format";
import { totals, useFinance } from "@/lib/store";

export default function ResumoPage() {
  const f = useFinance();
  const t = totals(f.monthTx);
  const cats = byCategory(f.monthTx, f.categories, "despesa");
  const series = monthlySeries(f.windowTx, f.month);
  const prev = series[series.length - 2];
  const delta = prev && prev.expense > 0 ? Math.round(((t.expense - prev.expense) / prev.expense) * 100) : null;

  const sixMonths = (
    <Panel
      title="Últimos 6 meses"
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
  );

  return (
    <div className="fade-in">
      <DemoBanner />
      <PageHeader title="Resumo" />

      {f.error && <p className="mb-4 rounded-[16px] bg-expense/10 px-4 py-3 text-sm text-expense">{f.error}</p>}

      <div className="mb-9 grid grid-cols-1 gap-8 lg:mb-10 lg:grid-cols-5 lg:items-start lg:gap-6">
        <div className="lg:col-span-3">
        <section className="mb-7">
          <p className="text-[15px] text-muted">Saldo do mês</p>
          {f.loading ? (
            <Skeleton className="mt-2 h-14 w-64" />
          ) : (
            <p className={`num mt-1 text-[52px] font-semibold leading-none tracking-tight sm:text-[64px] ${t.balance < 0 ? "text-expense" : ""}`}>
              {t.balance < 0 ? "-" : ""}
              {money(Math.abs(t.balance))}
            </p>
          )}
          {!f.loading && delta != null && delta !== 0 && (
            <p className="mt-3 flex items-center gap-2 text-[13px] text-muted">
              <span className={`rounded-full px-2 py-0.5 font-medium ${delta > 0 ? "bg-expense/10 text-expense" : "bg-income/10 text-income"}`}>
                {delta > 0 ? "▲" : "▼"} {Math.abs(delta)}%
              </span>
              gastos vs {prev?.label}
            </p>
          )}

          <div className="mt-6 grid max-w-[460px] grid-cols-2 gap-3">
            <Stat label="Receitas" value={t.income} tone="income" loading={f.loading} />
            <Stat label="Gastos" value={t.expense} tone="expense" loading={f.loading} />
          </div>
        </section>

        <nav aria-label="Ações rápidas" className="mb-0 grid max-w-[460px] grid-cols-4 gap-3">
          <Action label="Gasto" onClick={() => f.openNew("despesa")} icon={<ArrowUpRight size={22} />} />
          <Action label="Receita" onClick={() => f.openNew("receita")} icon={<ArrowDownLeft size={22} />} />
          <Action label="Gráficos" href="/graficos" icon={<ChartPieSlice size={22} />} />
          <Action label="Contas" href="/contas" icon={<Wallet size={22} />} />
        </nav>
        </div>
        <div className="hidden lg:col-span-2 lg:block">
          {sixMonths}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-5 lg:gap-6">
        <section className="lg:col-span-3">
          <div className="mb-4 flex items-center justify-between px-1">
            <h2 className="text-[19px] font-medium">Últimos lançamentos</h2>
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

        <div className="flex flex-col gap-4 lg:col-span-2 lg:gap-5">
          <div className="lg:hidden">{sixMonths}</div>
          <Panel
            title="Onde foi o dinheiro"
            action={
              <Link href="/graficos" className="text-[14px] font-medium text-accent-text">
                Detalhes
              </Link>
            }
          >
            {f.loading ? (
              <Skeleton className="h-[200px]" />
            ) : cats.length === 0 ? (
              <Empty title="Sem gastos" text="Os gastos do mês aparecem aqui, separados por categoria." />
            ) : (
              <div className="flex flex-col gap-5">
                <CompositionBar items={cats} />
                <RankBars items={cats} limit={5} />
              </div>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}

function Action({ label, icon, href, onClick }: { label: string; icon: ReactNode; href?: string; onClick?: () => void }) {
  const cls = "flex flex-col items-center gap-2 text-[13px] text-fg/90";
  const tile =
    "tile flex h-16 w-full items-center justify-center rounded-[20px] text-accent-text transition-[transform,background-color] hover:bg-surface-2 active:scale-95";
  const inner = (
    <>
      <span className={tile}>{icon}</span>
      {label}
    </>
  );
  return href ? (
    <Link href={href} className={cls}>
      {inner}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}

function Stat({
  label,
  value,
  tone,
  loading,
}: {
  label: string;
  value: number;
  tone: "income" | "expense";
  loading: boolean;
}) {
  return (
    <div className="tile rounded-[22px] px-4 py-3.5">
      <p className="flex items-center gap-1.5 text-[13px] text-muted">
        <span className="size-2 rounded-full" style={{ background: tone === "income" ? "var(--chart-income)" : "var(--chart-expense)" }} />
        {label}
      </p>
      {loading ? (
        <Skeleton className="mt-1.5 h-6 w-24" />
      ) : (
        <p className={`num mt-1 text-[20px] font-medium ${tone === "income" ? "text-income" : ""}`}>{money(value)}</p>
      )}
    </div>
  );
}
