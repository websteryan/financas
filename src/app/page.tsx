"use client";

import Link from "next/link";
import { ArrowRight } from "@/components/icons";
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

  return (
    <div className="fade-in">
      <DemoBanner />
      <PageHeader title="Resumo" />

      {f.error && <p className="mb-4 rounded-[12px] bg-expense/10 px-4 py-3 text-sm text-expense">{f.error}</p>}

      <section className="mb-8">
        <p className="text-[13px] font-medium text-muted">Saldo do mês</p>
        {f.loading ? (
          <Skeleton className="mt-2 h-12 w-56" />
        ) : (
          <p className={`num mt-1 text-[44px] font-semibold leading-none tracking-tight sm:text-[52px] ${t.balance < 0 ? "text-expense" : ""}`}>
            {t.balance < 0 ? "-" : ""}
            {money(Math.abs(t.balance))}
          </p>
        )}
        <div className="mt-5 flex flex-wrap gap-x-8 gap-y-3">
          <Stat label="Receitas" value={t.income} tone="income" loading={f.loading} />
          <Stat label="Gastos" value={t.expense} tone="expense" loading={f.loading} delta={delta} prevLabel={prev?.label} />
          <div className="hidden sm:block">
            <Stat label="Lançamentos" count={f.monthTx.length} loading={f.loading} />
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5 lg:gap-5">
        <Panel
          title="Últimos 6 meses"
          className="lg:col-span-3"
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

        <Panel
          title="Onde foi o dinheiro"
          className="lg:col-span-2"
          action={
            <Link href="/graficos" className="text-[13px] font-medium text-accent">
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

        <Panel
          title="Recentes"
          className="lg:col-span-5"
          action={
            f.monthTx.length > 0 && (
              <Link href="/lancamentos" className="inline-flex items-center gap-1 text-[13px] font-medium text-accent">
                Ver todos <ArrowRight size={14} weight="bold" />
              </Link>
            )
          }
        >
          {f.loading ? (
            <div className="flex flex-col gap-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : f.monthTx.length === 0 ? (
            <Empty
              title="Nada lançado neste mês"
              text="Registre um gasto ou uma receita para começar."
              action={
                <Button variant="primary" onClick={f.openNew}>
                  Novo lançamento
                </Button>
              }
            />
          ) : (
            <div className="-mx-2">
              <TransactionList items={f.monthTx.slice(0, 8)} />
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  count,
  tone,
  loading,
  delta,
  prevLabel,
}: {
  delta?: number | null;
  prevLabel?: string;
  label: string;
  value?: number;
  count?: number;
  tone?: "income" | "expense";
  loading: boolean;
}) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-[13px] text-muted">
        {tone && (
          <span
            className="size-2 rounded-[2px]"
            style={{ background: tone === "income" ? "var(--chart-income)" : "var(--chart-expense)" }}
          />
        )}
        {label}
      </p>
      {loading ? (
        <Skeleton className="mt-1 h-6 w-24" />
      ) : (
        <p className={`num mt-0.5 text-[19px] font-semibold ${tone === "income" ? "text-income" : ""}`}>
          {value !== undefined ? money(value) : count}
        </p>
      )}
      {!loading && delta != null && delta !== 0 && (
        <p className="mt-0.5 text-[12px] text-muted">
          <span className={delta > 0 ? "text-expense" : "text-income"}>
            {delta > 0 ? "▲" : "▼"} {Math.abs(delta)}%
          </span>{" "}
          vs {prevLabel}
        </p>
      )}
    </div>
  );
}
