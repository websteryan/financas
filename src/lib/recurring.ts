import { daysInMonth, todayISO } from "./format";
import type { RecurringRule } from "./types";

export interface PendingItem {
  rule: RecurringRule;
  /** Mês do vencimento, "YYYY-MM". */
  ym: string;
  /** Data do vencimento (dia ajustado ao tamanho do mês). */
  due: string;
  overdue: boolean;
}

const pad = (n: number) => String(n).padStart(2, "0");
const keyOf = (y: number, m: number) => `${y}-${pad(m)}`; // m: 1-12

function nextKey(k: string): string {
  const [y, m] = k.split("-").map(Number);
  return m === 12 ? keyOf(y + 1, 1) : keyOf(y, m + 1);
}

export function dueDate(ym: string, day: number): string {
  const [y, m] = ym.split("-").map(Number);
  return `${ym}-${pad(Math.min(day, daysInMonth(y, m - 1)))}`;
}

/** Vencimentos que já chegaram e ainda não foram confirmados nem pulados (até 12 meses para trás). */
export function pendingOf(rules: RecurringRule[], today = todayISO()): PendingItem[] {
  const out: PendingItem[] = [];
  const nowKey = today.slice(0, 7);
  for (const rule of rules) {
    if (!rule.active) continue;
    let k = rule.last_ym ? nextKey(rule.last_ym) : rule.start_ym;
    if (k < rule.start_ym) k = rule.start_ym;
    let guard = 0;
    while (k <= nowKey && guard++ < 12) {
      const due = dueDate(k, rule.day);
      if (due <= today) out.push({ rule, ym: k, due, overdue: due < today });
      k = nextKey(k);
    }
  }
  return out.sort((a, b) => a.due.localeCompare(b.due));
}

/** Próximo vencimento ainda não resolvido (para mostrar na lista de regras). */
export function nextDue(rule: RecurringRule): string {
  let k = rule.last_ym ? nextKey(rule.last_ym) : rule.start_ym;
  if (k < rule.start_ym) k = rule.start_ym;
  return dueDate(k, rule.day);
}

export interface Forecast {
  /** Vencimentos que ainda vão cair até o fim do mês (inclui os já vencidos e não confirmados). */
  items: PendingItem[];
  /** Efeito líquido desses vencimentos no saldo (receitas menos gastos). */
  net: number;
}

/** Previsão até o fim do mês atual: pendentes de hoje para trás e recorrentes que vencem nos próximos dias. */
export function forecastOf(rules: RecurringRule[], today = todayISO()): Forecast {
  const nowKey = today.slice(0, 7);
  const items = pendingOf(rules, today);
  for (const rule of rules) {
    if (!rule.active || rule.start_ym > nowKey || (rule.last_ym && rule.last_ym >= nowKey)) continue;
    const due = dueDate(nowKey, rule.day);
    if (due > today) items.push({ rule, ym: nowKey, due, overdue: false });
  }
  items.sort((a, b) => a.due.localeCompare(b.due));
  const net = items.reduce((s, p) => s + (p.rule.kind === "receita" ? p.rule.amount_cents : -p.rule.amount_cents), 0);
  return { items, net };
}
