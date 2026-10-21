"use client";

import { useState } from "react";
import { BalanceLine, CompositionBar, RankBars, StatBars } from "@/components/charts/Charts";
import { PageHeader, Panel } from "@/components/PageHeader";
import { AccountGlyph, Empty, Segmented, Skeleton } from "@/components/ui";
import { PAYMENT_LABEL, methodOf, type PaymentMethod } from "@/lib/types";
import { byAccount, byCategory, dailyBalance, monthlySeries, statBuckets, type StatMode } from "@/lib/derive";
import { currentYM, daysInMonth, money, parseISO, todayISO } from "@/lib/format";
import { totals, useFinance } from "@/lib/store";
import type { Kind } from "@/lib/types";

export default function GraficosPage() {
  const f = useFinance();
  const [kind, setKind] = useState<Kind>("despesa");
  const [mode, setMode] = useState<StatMode>("diario");
  const [pick, setPick] = useState<string | null>(null);

  const cats = byCategory(f.monthTx, f.categories, kind);
  const accs = byAccount(f.monthTx, f.accounts, kind).map((a) => ({
    ...a,
    icon: a.account ? <AccountGlyph color={a.account.color} size={24} /> : undefined,
  }));
  const byMethod = (Object.keys(PAYMENT_LABEL) as PaymentMethod[])
    .map((m) => ({
      id: m,
      label: PAYMENT_LABEL[m],
      color: { credito: "#7545e8", debito: "#3b82f6", pix: "#14b8a6", dinheiro: "#eab308" }[m],
      value: f.monthTx
        .filter((x) => x.kind === "despesa" && methodOf(x, f.accountById(x.account_id)) === m)
        .reduce((n, x) => n + x.amount_cents, 0),
    }))
    .filter((x) => x.value > 0)
    .sort((a, b) => b.value - a.value);
  const balance = dailyBalance(f.monthTx, f.month);
  const series = monthlySeries(f.windowTx, f.month);
  const t = totals(f.monthTx);

  const buckets = statBuckets(mode, kind, f.monthTx, f.windowTx, f.month);
  const lastWithValue = [...buckets].reverse().find((b) => b.value > 0);
  const current = buckets.find((b) => b.key === pick) ?? lastWithValue ?? buckets[buckets.length - 1];

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

      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center">
        <Segmented
          className="flex-1"
          value={mode}
          onChange={(m) => {
            setMode(m);
            setPick(null);
          }}
          options={[
            { value: "diario", label: "Diário" },
            { value: "semanal", label: "Semanal" },
            { value: "mensal", label: "Mensal" },
          ]}
        />
        <Segmented
          className="lg:w-72"
          value={kind}
          onChange={(k) => {
            setKind(k);
            setPick(null);
          }}
          options={[
            { value: "despesa", label: "Gastos" },
            { value: "receita", label: "Receitas" },
          ]}
        />
      </div>

      <Panel className="mb-4 lg:mb-5">
        {f.loading || !current ? (
          <Skeleton className="h-[280px]" />
        ) : (
          <>
            <div className="mb-6 text-center">
              <p className="num font-display text-[38px] font-semibold leading-tight">{money(current.value)}</p>
              <p className="mt-1 text-[14px] text-muted">{current.detail}</p>
            </div>
            <StatBars data={buckets} selected={current.key} onSelect={setPick} />
            <p className="mt-5 text-center text-[13px] text-muted">Toque em uma barra para ver os detalhes</p>
          </>
        )}
      </Panel>

      <div className="no-scrollbar -mx-4 mb-4 flex gap-3 overflow-x-auto px-4 sm:mx-0 sm:grid sm:grid-cols-3 sm:px-0 lg:mb-5">
        <Metric label="Gasto médio por dia" value={money(perDay)} loading={f.loading} />
        <Metric label="Média mensal de gastos (6 meses)" value={money(avg6)} loading={f.loading} />
        <Metric label="Maior gasto" value={biggest ? money(biggest.amount_cents) : "-"} hint={biggest?.description} loading={f.loading} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">
        <Panel title="Saldo ao longo do mês" className="lg:col-span-2">
          {f.loading ? <Skeleton className="h-[180px]" /> : <BalanceLine values={balance.values} labels={balance.labels} />}
        </Panel>

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

        {kind === "despesa" && (
          <Panel title="Por forma de pagamento">
            {f.loading ? <Skeleton className="h-40" /> : byMethod.length === 0 ? <Empty title="Sem gastos" text="Nenhum gasto neste mês." /> : <RankBars items={byMethod} />}
          </Panel>
        )}

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
    <div className="tile min-w-[210px] shrink-0 rounded-[22px] px-4 py-3.5 sm:min-w-0 sm:shrink">
      <p className="text-[13px] text-muted">{label}</p>
      {loading ? (
        <Skeleton className="mt-1.5 h-6 w-24" />
      ) : (
        <p className="num mt-1 truncate text-[20px] font-medium">
          {value}
          {hint && <span className="ml-2 text-[13px] font-normal text-muted">{hint}</span>}
        </p>
      )}
    </div>
  );
}
