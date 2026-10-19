import { currentYM, daysInMonth, MONTHS_SHORT, parseISO, shiftYM, todayISO, ymKey, type YM } from "./format";
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
