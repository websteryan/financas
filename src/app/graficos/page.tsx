"use client";

import { useState } from "react";
import { BalanceLine, CompositionBar, Legend, MonthlyBars, RankBars } from "@/components/charts/Charts";
import { PageHeader, Panel } from "@/components/PageHeader";
import { AccountGlyph, Empty, Segmented, Skeleton } from "@/components/ui";
import { byAccount, byCategory, dailyBalance, monthlySeries } from "@/lib/derive";
import { currentYM, daysInMonth, money, parseISO, todayISO } from "@/lib/format";
import { totals, useFinance } from "@/lib/store";
import type { Kind } from "@/lib/types";

export default function GraficosPage() {
  const f = useFinance();
  const [kind, setKind] = useState<Kind>("despesa");

  const cats = byCategory(f.monthTx, f.categories, kind);
  const accs = byAccount(f.monthTx, f.accounts, kind).map((a) => ({
    ...a,
    icon: a.account ? <AccountGlyph type={a.account.type} color={a.account.color} size={22} /> : undefined,
  }));
  const balance = dailyBalance(f.monthTx, f.month);
  const series = monthlySeries(f.windowTx, f.month);
  const t = totals(f.monthTx);

  const now = currentYM();
  const isNow = now.y === f.month.y && now.m === f.month.m;
  const elapsed = isNow ? parseISO(todayISO()).d : daysInMonth(f.month.y, f.month.m);
  const perDay = Math.round(t.expense / Math.max(1, elapsed));
  const biggest = f.monthTx.filter((x) => x.kind === "despesa").sort((a, b) => b.amount_cents - a.amount_cents)[0];
  const avg6 = Math.round(series.reduce((s, d) => s + d.expense, 0) / series.length);

  const label = kind === "despesa" ? "gastos" : "receitas";

  return (
    <div className="fade-in">
      <PageHeader title="Gráficos" />

      <div className="mb-6 flex flex-wrap gap-x-8 gap-y-3">
        <Metric label="Gasto médio por dia" value={money(perDay)} loading={f.loading} />
        <Metric label="Média mensal de gastos (6 meses)" value={money(avg6)} loading={f.loading} />
        <Metric label="Maior gasto" value={biggest ? money(biggest.amount_cents) : "-"} hint={biggest?.description} loading={f.loading} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">
        <Panel title="Saldo ao longo do mês" className="lg:col-span-2">
          {f.loading ? <Skeleton className="h-[180px]" /> : <BalanceLine values={balance.values} labels={balance.labels} />}
        </Panel>

        <Panel
          title="Receitas e gastos"
          className="lg:col-span-2"
          action={
            <Legend
              items={[
                { label: "Receitas", color: "var(--chart-income)" },
                { label: "Gastos", color: "var(--chart-expense)" },
              ]}
            />
          }
        >
          {f.loading ? <Skeleton className="h-[220px]" /> : <MonthlyBars data={series} height={220} />}
        </Panel>

        <div className="lg:col-span-2">
          <Segmented
            className="sm:w-72"
            value={kind}
            onChange={setKind}
            options={[
              { value: "despesa", label: "Gastos" },
              { value: "receita", label: "Receitas" },
            ]}
          />
        </div>

        <Panel title="Por categoria">
          {f.loading ? (
            <Skeleton className="h-48" />
          ) : cats.length === 0 ? (
            <Empty title={`Sem ${label}`} text={`Nenhum lançamento de ${label} neste mês.`} />
          ) : (
            <div className="flex flex-col gap-5">
              <CompositionBar items={cats} />
              <RankBars items={cats} />
            </div>
          )}
        </Panel>

        <Panel title="Por conta">
          {f.loading ? (
            <Skeleton className="h-48" />
          ) : accs.length === 0 ? (
            <Empty title={`Sem ${label}`} text={`Nenhum lançamento de ${label} neste mês.`} />
          ) : (
            <RankBars items={accs} />
          )}
        </Panel>
      </div>
    </div>
  );
}

function Metric({ label, value, hint, loading }: { label: string; value: string; hint?: string; loading: boolean }) {
  return (
    <div className="min-w-0">
      <p className="text-[13px] text-muted">{label}</p>
      {loading ? (
        <Skeleton className="mt-1 h-6 w-24" />
      ) : (
        <p className="num mt-0.5 text-[19px] font-semibold">
          {value}
          {hint && <span className="ml-2 text-[13px] font-normal text-muted">{hint}</span>}
        </p>
      )}
    </div>
  );
}
