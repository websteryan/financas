"use client";

import { useEffect, useId, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from "react";
import { axisLabel, money } from "@/lib/format";

/* Gráficos em SVG próprio: leves, sem dependências e com as cores do tema. */

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    ro.observe(el);
    setWidth(Math.floor(el.getBoundingClientRect().width));
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

function niceMax(v: number): number {
  if (v <= 0) return 100;
  const exp = Math.pow(10, Math.floor(Math.log10(v)));
  const f = v / exp;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return nice * exp;
}

/** Retângulo com cantos arredondados só no topo (ponta do dado), ancorado na base. */
function topRoundedBar(x: number, y: number, w: number, h: number, r = 7): string {
  if (h <= 0) return "";
  const rr = Math.min(r, w / 2, h);
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`;
}

function Tooltip({ x, y, width, children }: { x: number; y: number; width: number; children: ReactNode }) {
  const w = 168;
  const left = Math.max(0, Math.min(width - w, x - w / 2));
  return (
    <div
      className="pointer-events-none absolute z-10 rounded-[16px] border border-line bg-sheet px-3.5 py-2.5 text-[13px] shadow-[0_12px_32px_rgb(0_0_0/0.5)]"
      style={{ left, top: Math.max(0, y), width: w }}
    >
      {children}
    </div>
  );
}

export function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted">
      {items.map((i) => (
        <span key={i.label} className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-[3px]" style={{ background: i.color }} />
          {i.label}
        </span>
      ))}
    </div>
  );
}

/* ----------------------------------------------- Receitas x gastos por mês */

export interface MonthDatum {
  key: string;
  label: string;
  income: number;
  expense: number;
  current?: boolean;
}

export function MonthlyBars({ data, height = 200 }: { data: MonthDatum[]; height?: number }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const padL = 40;
  const padB = 24;
  const padT = 8;
  const plotW = Math.max(0, width - padL);
  const plotH = height - padB - padT;
  const max = niceMax(Math.max(1, ...data.map((d) => Math.max(d.income, d.expense))));
  const ticks = [0, max / 2, max];
  const slot = data.length ? plotW / data.length : 0;
  const barW = Math.max(5, Math.min(26, (slot - 16) / 2));
  const y = (v: number) => padT + plotH - (v / max) * plotH;

  return (
    <div ref={ref} className="relative w-full select-none" style={{ height }} onPointerLeave={() => setHover(null)}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label="Receitas e gastos por mês">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={padL} x2={width} y1={y(t)} y2={y(t)} style={{ stroke: "var(--grid)" }} strokeWidth={1} />
              <text x={padL - 8} y={y(t)} dy="0.32em" textAnchor="end" className="num" style={{ fill: "var(--muted)", fontSize: 11 }}>
                {axisLabel(t)}
              </text>
            </g>
          ))}
          {data.map((d, i) => {
            const cx = padL + slot * i + slot / 2;
            const dim = hover !== null && hover !== i;
            return (
              <g key={d.key} style={{ opacity: dim ? 0.45 : 1, transition: "opacity 150ms" }}>
                <rect
                  x={cx - slot / 2 + 4}
                  y={padT}
                  width={Math.max(0, slot - 8)}
                  height={plotH}
                  rx={14}
                  style={{ fill: d.current ? "rgb(255 255 255 / 0.07)" : "rgb(255 255 255 / 0.035)" }}
                />
                <path className="grow-y" style={{ fill: "var(--chart-income)", "--i": i } as CSSProperties} d={topRoundedBar(cx - barW - 1, y(d.income), barW, plotH + padT - y(d.income))} />
                <path className="grow-y" style={{ fill: "var(--chart-expense)", "--i": i } as CSSProperties} d={topRoundedBar(cx + 1, y(d.expense), barW, plotH + padT - y(d.expense))} />
                <text
                  x={cx}
                  y={height - 6}
                  textAnchor="middle"
                  style={{ fill: d.current ? "var(--fg)" : "var(--muted)", fontSize: 12, fontWeight: d.current ? 600 : 400 }}
                >
                  {d.label}
                </text>
                <rect
                  x={padL + slot * i}
                  y={0}
                  width={slot}
                  height={height}
                  fill="transparent"
                  onPointerEnter={() => setHover(i)}
                  onPointerDown={() => setHover(i)}
                />
              </g>
            );
          })}
        </svg>
      )}
      {hover !== null && data[hover] && (
        <Tooltip x={padL + slot * hover + slot / 2} y={0} width={width}>
          <p className="mb-1 font-medium text-fg">{data[hover].label}</p>
          <Row color="var(--chart-income)" label="Receitas" value={money(data[hover].income)} />
          <Row color="var(--chart-expense)" label="Gastos" value={money(data[hover].expense)} />
          <div className="mt-1 border-t border-line pt-1">
            <Row label="Saldo" value={money(data[hover].income - data[hover].expense)} />
          </div>
        </Tooltip>
      )}
    </div>
  );
}

function Row({ color, label, value }: { color?: string; label: string; value: string }) {
  return (
    <p className="flex items-center justify-between gap-3 text-muted">
      <span className="inline-flex items-center gap-1.5">
        {color && <span className="size-2 rounded-[2px]" style={{ background: color }} />}
        {label}
      </span>
      <span className="num font-medium text-fg">{value}</span>
    </p>
  );
}

/* -------------------------------------------------- Saldo acumulado no mês */

export function BalanceLine({ values, labels, height = 180 }: { values: number[]; labels: string[]; height?: number }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const padL = 40;
  const padB = 22;
  const padT = 10;
  const plotW = Math.max(0, width - padL - 6);
  const plotH = height - padB - padT;
  const lo = Math.min(0, ...values);
  const hiRaw = Math.max(0, ...values);
  const low = lo < 0 ? -niceMax(-lo) : 0;
  const hi = hiRaw > 0 ? niceMax(hiRaw) : low < 0 ? 0 : 100;
  const span = hi - low || 1;
  const x = (i: number) => padL + (values.length > 1 ? (i / (values.length - 1)) * plotW : plotW / 2);
  const y = (v: number) => padT + ((hi - v) / span) * plotH;

  const line = values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
  const area = values.length ? `${line}L${x(values.length - 1)},${y(0)}L${x(0)},${y(0)}Z` : "";
  const ticks = Array.from(new Set([low, 0, hi])).filter((t) => t === 0 || Math.abs(y(t) - y(0)) >= 16);
  const step = Math.max(1, Math.ceil(values.length / 6));

  function onMove(e: PointerEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left - padL;
    if (values.length === 0) return;
    const i = Math.round((px / Math.max(1, plotW)) * (values.length - 1));
    setHover(Math.max(0, Math.min(values.length - 1, i)));
  }

  return (
    <div
      ref={ref}
      className="relative w-full touch-pan-y select-none"
      style={{ height }}
      onPointerMove={onMove}
      onPointerDown={onMove}
      onPointerLeave={() => setHover(null)}
    >
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label="Saldo acumulado ao longo do mês">
          <defs>
            <linearGradient id="bal-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" style={{ stopColor: "var(--accent)", stopOpacity: 0.35 }} />
              <stop offset="100%" style={{ stopColor: "var(--accent)", stopOpacity: 0 }} />
            </linearGradient>
          </defs>
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={padL}
                x2={width}
                y1={y(t)}
                y2={y(t)}
                style={{ stroke: t === 0 ? "var(--line)" : "var(--grid)" }}
                strokeWidth={1}
              />
              <text x={padL - 8} y={y(t)} dy="0.32em" textAnchor="end" className="num" style={{ fill: "var(--muted)", fontSize: 11 }}>
                {axisLabel(t)}
              </text>
            </g>
          ))}
          <path d={area} fill="url(#bal-fill)" />
          <path d={line} fill="none" style={{ stroke: "var(--accent-text)" }} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
          {labels.map((l, i) =>
            i % step === 0 || i === labels.length - 1 ? (
              <text key={i} x={x(i)} y={height - 5} textAnchor="middle" style={{ fill: "var(--muted)", fontSize: 11 }}>
                {l}
              </text>
            ) : null,
          )}
          {hover !== null && (
            <g>
              <line x1={x(hover)} x2={x(hover)} y1={padT} y2={padT + plotH} style={{ stroke: "var(--muted)" }} strokeDasharray="3 3" />
              <circle cx={x(hover)} cy={y(values[hover])} r={5} style={{ fill: "var(--accent-text)", stroke: "var(--sheet)" }} strokeWidth={2} />
            </g>
          )}
        </svg>
      )}
      {hover !== null && (
        <Tooltip x={x(hover)} y={0} width={width}>
          <Row label={`Dia ${labels[hover]}`} value={money(values[hover])} />
        </Tooltip>
      )}
    </div>
  );
}

/* ------------------------------------------------- Ranking (categorias, contas) */

export interface RankItem {
  id: string;
  label: string;
  color: string;
  value: number;
  icon?: ReactNode;
}

export function RankBars({ items, limit }: { items: RankItem[]; limit?: number }) {
  const sorted = [...items].sort((a, b) => b.value - a.value);
  const shown = limit ? sorted.slice(0, limit) : sorted;
  const total = items.reduce((s, i) => s + i.value, 0) || 1;
  const max = shown[0]?.value || 1;
  return (
    <ul className="flex flex-col gap-3.5">
      {shown.map((i) => (
        <li key={i.id} className="flex flex-col gap-1.5" title={`${i.label}: ${money(i.value)}`}>
          <div className="flex items-center justify-between gap-3 text-[14px]">
            <span className="flex min-w-0 items-center gap-2">
              {i.icon ?? <span className="size-2.5 shrink-0 rounded-[3px]" style={{ background: i.color }} />}
              <span className="truncate text-fg">{i.label}</span>
            </span>
            <span className="flex shrink-0 items-baseline gap-2">
              <span className="num text-[13px] text-muted">{Math.round((i.value / total) * 100)}%</span>
              <span className="num font-medium text-fg">{money(i.value)}</span>
            </span>
          </div>
          <div className="h-2 rounded-full bg-white/5">
            <div
              className="h-full rounded-full transition-[width] duration-500"
              style={{ width: `${Math.max(2, (i.value / max) * 100)}%`, background: i.color }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Barra única de composição (fatias separadas por 2px). */
export function CompositionBar({ items }: { items: RankItem[] }) {
  const sorted = [...items].filter((i) => i.value > 0).sort((a, b) => b.value - a.value);
  const total = sorted.reduce((s, i) => s + i.value, 0);
  if (!total) return null;
  return (
    <div className="flex h-3 w-full gap-[2px] overflow-hidden rounded-full" role="img" aria-label="Distribuição dos gastos por categoria">
      {sorted.map((i) => (
        <div key={i.id} title={`${i.label}: ${money(i.value)}`} style={{ flexGrow: i.value, flexBasis: 0, background: i.color, minWidth: 3 }} />
      ))}
    </div>
  );
}

/* ------------------------------------- Barras selecionáveis (Diário / Semanal / Mensal) */

export interface StatBarDatum {
  key: string;
  label: string;
  value: number;
}

export function StatBars({
  data,
  selected,
  onSelect,
  height = 190,
}: {
  data: StatBarDatum[];
  selected: string;
  onSelect: (key: string) => void;
  height?: number;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex w-full items-stretch gap-2.5 sm:gap-3.5" role="group" aria-label="Valores por período">
      {data.map((d) => {
        const on = d.key === selected;
        const h = d.value > 0 ? Math.max(14, (d.value / max) * 100) : 6;
        return (
          <button
            key={d.key}
            type="button"
            aria-pressed={on}
            aria-label={`${d.label}: ${money(d.value)}`}
            onClick={() => onSelect(d.key)}
            className="group flex min-w-0 flex-1 flex-col items-center gap-2.5"
          >
            <span className="flex w-full items-end" style={{ height }}>
              <span
                className={`w-full rounded-[18px] transition-[height,background] duration-500 ease-out ${
                  on ? "bg-brand glow" : "bg-gradient-to-b from-white/[0.14] to-white/[0.05] group-hover:from-white/[0.2]"
                }`}
                style={{ height: `${h}%` }}
              />
            </span>
            <span className={`text-[13px] ${on ? "font-medium text-fg" : "text-muted"}`}>{d.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ---------------------------------------------------------------- Rosca */

export interface DonutItem {
  id: string;
  label: string;
  value: number;
  color: string;
}

/** Rosca de composição. O total fica no centro; passar o dedo/mouse numa fatia mostra o valor dela. */
export function Donut({ items, size = 184, centerLabel }: { items: DonutItem[]; size?: number; centerLabel: string }) {
  const [hover, setHover] = useState<string | null>(null);
  const total = items.reduce((a, b) => a + b.value, 0);
  const r = 15.9155; // circunferência = 100, assim os valores viram porcentagem direta
  const gap = items.length > 1 ? 1.2 : 0;
  let acc = 0;
  const active = items.find((i) => i.id === hover);

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 42 42" width={size} height={size} role="img" aria-label="Gastos por categoria" className="-rotate-90">
        <circle cx="21" cy="21" r={r} fill="none" style={{ stroke: "var(--surface-2)" }} strokeWidth={5} />
        {total > 0 &&
          items.map((it, i) => {
            const pct = (it.value / total) * 100;
            const seg = Math.max(0, pct - gap);
            const start = acc;
            acc += pct;
            return (
              <circle
                key={it.id}
                className="donut-seg cursor-pointer"
                cx="21"
                cy="21"
                r={r}
                fill="none"
                stroke={it.color}
                strokeWidth={hover === it.id ? 6 : 5}
                strokeDasharray={`${seg} ${100 - seg}`}
                strokeDashoffset={-start}
                strokeLinecap="butt"
                style={{ "--i": i, opacity: hover && hover !== it.id ? 0.35 : 1, transition: "opacity 150ms, stroke-width 150ms" } as CSSProperties}
                onPointerEnter={() => setHover(it.id)}
                onPointerLeave={() => setHover(null)}
                onPointerDown={() => setHover(it.id)}
              />
            );
          })}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-[12px] text-muted">{active ? active.label : centerLabel}</span>
        <span className="num mt-0.5 max-w-[110px] text-[16px] font-semibold leading-tight">{money(active ? active.value : total)}</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------ Fluxo de caixa (barras altas) */

export interface CashDatum {
  key: string;
  label: string;
  value: number;
}

/** Barras em pílula sobre trilhos; a barra escolhida ganha degradê, linha tracejada e balão com o valor. */
export function CashflowBars({
  data,
  selected,
  onSelect,
  height = 210,
}: {
  data: CashDatum[];
  selected: string;
  onSelect: (key: string) => void;
  height?: number;
}) {
  const max = niceMax(Math.max(1, ...data.map((d) => d.value)));
  const ticks = [max, max / 2, 0];
  return (
    <div className="flex w-full gap-3" role="group" aria-label="Fluxo de caixa por período">
      <div className="flex shrink-0 flex-col justify-between pb-7 pt-1 text-[12px] text-muted num" style={{ height: height + 28 }} aria-hidden>
        {ticks.map((t) => (
          <span key={t} className="leading-none">
            {axisLabel(t)}
          </span>
        ))}
      </div>
      <div className="flex min-w-0 flex-1 items-stretch gap-2 sm:gap-3">
        {data.map((d, i) => {
          const on = d.key === selected;
          const h = d.value > 0 ? Math.max(12, (d.value / max) * 100) : 5;
          const edge = i === 0 ? "left-0" : i === data.length - 1 ? "right-0" : "left-1/2 -translate-x-1/2";
          return (
            <button
              key={d.key}
              type="button"
              aria-pressed={on}
              aria-label={`${d.label}: ${money(d.value)}`}
              onClick={() => onSelect(d.key)}
              className="group relative flex min-w-0 flex-1 flex-col items-center gap-2.5"
            >
              <span className="relative flex w-full items-end rounded-full bg-white/[0.045]" style={{ height }}>
                <span
                  className={`grow-y relative block w-full rounded-full transition-[height] duration-500 ease-out ${on ? "" : "bg-white/[0.12] group-hover:bg-white/[0.2]"}`}
                  style={
                    {
                      height: `${h}%`,
                      "--i": i,
                      background: on ? "linear-gradient(to bottom, var(--accent), rgb(155 114 255 / 0.18))" : undefined,
                    } as CSSProperties
                  }
                >
                  {on && (
                    <>
                      <span className="absolute left-1/2 top-2 size-1.5 -translate-x-1/2 rounded-full bg-white" />
                      <span className="absolute bottom-2 left-1/2 top-4 -translate-x-1/2 border-l border-dashed border-white/50" />
                    </>
                  )}
                </span>
                {on && (
                  <span
                    className={`pop num pointer-events-none absolute z-10 whitespace-nowrap rounded-full border border-accent/60 bg-sheet px-3 py-1 text-[12px] font-semibold ${edge}`}
                    style={{ bottom: `calc(${h}% + 8px)` }}
                  >
                    {money(d.value)}
                  </span>
                )}
              </span>
              <span className={`text-[12px] ${on ? "font-semibold text-fg" : "text-muted"}`}>{d.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ----------------------------------------------- Contas em bolhas ligadas */

export interface Bubble {
  id: string;
  label: string;
  value: number;
}

/** Até três contas como bolhas que se fundem; a de maior movimento fica no centro, destacada. */
export function AccountBubbles({ items, selected, onSelect }: { items: Bubble[]; selected?: string | null; onSelect?: (id: string | null) => void }) {
  const id = useId().replace(/:/g, "");
  const slots = items.length >= 3 ? [1, 0, 2] : items.length === 2 ? [1, 0] : [0];
  const pos = [
    { cx: 62, r: 56 },
    { cx: 165, r: 63 },
    { cx: 268, r: 56 },
  ];
  const placed = slots.map((src, slot) => ({ item: items[src], ...pos[slot], center: slot === 1 || items.length === 1 }));
  if (items.length === 1) placed[0] = { item: items[0], cx: 165, r: 63, center: true };
  return (
    <div className="relative w-full" style={{ aspectRatio: "330 / 126" }}>
      <svg viewBox="0 0 330 126" className="absolute inset-0 size-full" aria-hidden>
        <defs>
          <filter id={`${id}g`} x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="b" />
            <feColorMatrix in="b" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -10" />
          </filter>
          <radialGradient id={`${id}c`} cx="0.5" cy="0.9" r="0.9">
            <stop offset="0" stopColor="#d9c8ff" />
            <stop offset="1" stopColor="#9b72ff" />
          </radialGradient>
        </defs>
        <g filter={`url(#${id}g)`}>
          {placed.map((p) => (
            <circle key={p.item.id} cx={p.cx} cy={63} r={p.r} fill={p.center ? `url(#${id}c)` : "#26262c"} style={{ opacity: selected && selected !== p.item.id ? 0.4 : 1, transition: "opacity 250ms" }} />
          ))}
        </g>
        {selected &&
          placed
            .filter((p) => p.item.id === selected)
            .map((p) => <circle key="ring" cx={p.cx} cy={63} r={p.r - 2} fill="none" stroke="#fff" strokeOpacity={0.85} strokeWidth={2} />)}
      </svg>
      {placed.map((p) => {
        const on = selected === p.item.id;
        return (
          <button
            key={p.item.id}
            type="button"
            aria-pressed={on}
            aria-label={`${p.item.label}: ${money(p.item.value)}. Toque para ${on ? "ver todas as contas" : "filtrar por esta conta"}`}
            onClick={() => onSelect?.(on ? null : p.item.id)}
            className={`absolute top-1/2 h-[86%] w-[32%] -translate-x-1/2 -translate-y-1/2 rounded-full transition-transform duration-200 active:scale-95 ${p.center ? "text-[#0b0816]" : "text-fg"}`}
            style={{ left: `${(p.cx / 330) * 100}%` }}
          >
            <span className="pop flex flex-col items-center text-center">
              <span className="num max-w-full whitespace-nowrap text-[13px] font-semibold min-[400px]:text-[14px] sm:text-[17px]">{money(p.item.value)}</span>
              <span className={`max-w-full truncate text-[12px] ${p.center ? "opacity-70" : "text-muted"}`}>{p.item.label}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
