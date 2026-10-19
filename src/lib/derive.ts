import { cap, currentYM, dayLabel, daysInMonth, MONTHS, MONTHS_SHORT, parseISO, shiftYM, todayISO, ymKey, type YM } from "./format";
import { WINDOW_MONTHS, groupSum, totals } from "./store";
import type { Account, Category, Kind, Transaction } from "./types";
import type { MonthDatum, RankItem } from "@/components/charts/Charts";

export function monthlySeries(windowTx: Transaction[], month: YM): MonthDatum[] {
  return Array.from({ length: WINDOW_MONTHS }, (_, k) => {
    const ym = shiftYM(month, k - (WINDOW_MONTHS - 1));
    const key = ymKey(ym);
    const t = totals(windowTx.filter((x) => x.date.startsWith(key)));
    return { key, label: MONTHS_SHORT[ym.m], income: t.income, expense: t.expense, current: k === WINDOW_MONTHS - 1 };
  });
}

/** Saldo acumulado dia a dia; no mês corrente para em hoje. */
export function dailyBalance(monthTx: Transaction[], month: YM): { values: number[]; labels: string[] } {
  const now = currentYM();
  const isNow = now.y === month.y && now.m === month.m;
  const last = isNow ? parseISO(todayISO()).d : daysInMonth(month.y, month.m);
  const perDay = new Array<number>(last).fill(0);
  for (const t of monthTx) {
    const d = parseISO(t.date).d;
    if (d <= last) perDay[d - 1] += t.kind === "receita" ? t.amount_cents : -t.amount_cents;
  }
  let acc = 0;
  const values = perDay.map((v) => (acc += v));
  return { values, labels: values.map((_, i) => String(i + 1)) };
}

export function byCategory(monthTx: Transaction[], categories: Category[], kind: Kind): RankItem[] {
  const sums = groupSum(
    monthTx.filter((t) => t.kind === kind),
    (t) => t.category_id ?? "none",
  );
  return [...sums.entries()].map(([id, value]) => {
    const c = categories.find((x) => x.id === id);
    return { id, value, label: c?.name ?? "Sem categoria", color: c?.color ?? "#8b8b93" };
  });
}

export function byAccount(monthTx: Transaction[], accounts: Account[], kind: Kind): (RankItem & { account?: Account })[] {
  const sums = groupSum(
    monthTx.filter((t) => t.kind === kind),
    (t) => t.account_id,
  );
  return [...sums.entries()].map(([id, value]) => {
    const a = accounts.find((x) => x.id === id);
    return { id, value, label: a?.name ?? "Conta removida", color: a?.color ?? "#8b8b93", account: a };
  });
}

/* ------------------------------------------------ Estatísticas (diário/semanal/mensal) */

export type StatMode = "diario" | "semanal" | "mensal";

export interface StatBucket {
  key: string;
  label: string;
  detail: string;
  value: number;
}

const WEEKDAY_SHORT = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

export function statBuckets(mode: StatMode, kind: Kind, monthTx: Transaction[], windowTx: Transaction[], month: YM): StatBucket[] {
  const sum = (list: Transaction[]) => list.filter((t) => t.kind === kind).reduce((s, t) => s + t.amount_cents, 0);

  if (mode === "mensal") {
    return Array.from({ length: WINDOW_MONTHS }, (_, k) => {
      const ym = shiftYM(month, k - (WINDOW_MONTHS - 1));
      const key = ymKey(ym);
      return {
        key,
        label: MONTHS_SHORT[ym.m],
        detail: `${cap(MONTHS[ym.m])} de ${ym.y}`,
        value: sum(windowTx.filter((t) => t.date.startsWith(key))),
      };
    });
  }

  const now = currentYM();
  const isNow = now.y === month.y && now.m === month.m;
  const dim = daysInMonth(month.y, month.m);
  const lastDay = isNow ? parseISO(todayISO()).d : dim;
  const prefix = ymKey(month);

  if (mode === "diario") {
    const first = Math.max(1, lastDay - 6);
    return Array.from({ length: lastDay - first + 1 }, (_, i) => {
      const d = first + i;
      const iso = `${prefix}-${String(d).padStart(2, "0")}`;
      return {
        key: iso,
        label: WEEKDAY_SHORT[new Date(month.y, month.m, d).getDay()],
        detail: dayLabel(iso),
        value: sum(monthTx.filter((t) => t.date === iso)),
      };
    });
  }

  const ranges: [number, number][] = [];
  for (let a = 1; a <= dim; a += 7) ranges.push([a, Math.min(a + 6, dim)]);
  return ranges.map(([a, b], i) => ({
    key: `${prefix}-w${i}`,
    label: `S${i + 1}`,
    detail: `${a} a ${b} de ${MONTHS[month.m]}`,
    value: sum(monthTx.filter((t) => {
      const d = parseISO(t.date).d;
      return d >= a && d <= b;
    })),
  }));
}
