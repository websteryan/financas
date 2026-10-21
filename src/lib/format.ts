const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const brlCompact = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 1,
});

let hidden = false;
/** Modo "ocultar valores": todo dinheiro mostrado vira bolinhas (campos de digitação usam moneyPlain). */
export function setHiddenValues(v: boolean) {
  hidden = v;
}
export function valuesHidden(): boolean {
  return hidden;
}

export function moneyPlain(cents: number): string {
  return brl.format(cents / 100);
}

export function money(cents: number): string {
  return hidden ? "R$ \u2022\u2022\u2022\u2022" : brl.format(cents / 100);
}

export function moneyCompact(cents: number): string {
  if (hidden) return "\u2022\u2022\u2022\u2022";
  if (Math.abs(cents) < 100000) return brl.format(Math.round(cents / 100));
  return brlCompact.format(cents / 100);
}

export interface YM {
  y: number;
  m: number; // 0-11
}

export const MONTHS = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];
export const MONTHS_SHORT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const WEEKDAYS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

const pad = (n: number) => String(n).padStart(2, "0");

export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function currentYM(): YM {
  const d = new Date();
  return { y: d.getFullYear(), m: d.getMonth() };
}

export function parseISO(iso: string): { y: number; m: number; d: number } {
  const [y, m, d] = iso.split("-").map(Number);
  return { y, m: m - 1, d };
}

export function daysInMonth(y: number, m: number): number {
  return new Date(y, m + 1, 0).getDate();
}

export function shiftYM(ym: YM, delta: number): YM {
  const total = ym.y * 12 + ym.m + delta;
  return { y: Math.floor(total / 12), m: ((total % 12) + 12) % 12 };
}

export function ymKey(ym: YM): string {
  return `${ym.y}-${pad(ym.m + 1)}`;
}

export function monthStart(ym: YM): string {
  return `${ym.y}-${pad(ym.m + 1)}-01`;
}

export function monthEnd(ym: YM): string {
  return `${ym.y}-${pad(ym.m + 1)}-${pad(daysInMonth(ym.y, ym.m))}`;
}

/** Soma meses a uma data ISO, ajustando o dia para o último dia do mês quando necessário. */
export function addMonthsISO(iso: string, delta: number): string {
  const { y, m, d } = parseISO(iso);
  const t = shiftYM({ y, m }, delta);
  const day = Math.min(d, daysInMonth(t.y, t.m));
  return `${t.y}-${pad(t.m + 1)}-${pad(day)}`;
}

export function monthLabel(ym: YM): string {
  const now = currentYM();
  const name = MONTHS[ym.m];
  return ym.y === now.y ? cap(name) : `${cap(name)} ${ym.y}`;
}

export function dayLabel(iso: string): string {
  const today = todayISO();
  if (iso === today) return "Hoje";
  const { y, m, d } = parseISO(iso);
  const yest = new Date();
  yest.setDate(yest.getDate() - 1);
  if (y === yest.getFullYear() && m === yest.getMonth() && d === yest.getDate()) return "Ontem";
  const wd = WEEKDAYS[new Date(y, m, d).getDay()];
  return `${cap(wd)}, ${d} de ${MONTHS[m]}`;
}

export function shortDate(iso: string): string {
  const { m, d } = parseISO(iso);
  return `${d} ${MONTHS_SHORT[m]}`;
}

export function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Divide um total em N parcelas inteiras; os centavos que sobram vão para as primeiras. */
export function splitCents(total: number, n: number): number[] {
  const base = Math.floor(total / n);
  const rest = total - base * n;
  return Array.from({ length: n }, (_, i) => base + (i < rest ? 1 : 0));
}

export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/** Rótulo curto para eixos de gráfico: "0", "500", "5 mil", "1,2 mi". */
export function axisLabel(cents: number): string {
  const v = cents / 100;
  const a = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  const fmt = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
  if (a >= 1e6) return `${sign}${fmt(a / 1e6)} mi`;
  if (a >= 1e3) return `${sign}${fmt(a / 1e3)} mil`;
  return `${sign}${fmt(a)}`;
}
