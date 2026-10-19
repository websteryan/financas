"use client";

import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";
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
function topRoundedBar(x: number, y: number, w: number, h: number, r = 4): string {
  if (h <= 0) return "";
  const rr = Math.min(r, w / 2, h);
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`;
}

function Tooltip({ x, y, width, children }: { x: number; y: number; width: number; children: ReactNode }) {
  const w = 168;
  const left = Math.max(0, Math.min(width - w, x - w / 2));
  return (
    <div
      className="pointer-events-none absolute z-10 rounded-[12px] border border-line bg-surface px-3 py-2 text-[13px] shadow-[0_8px_24px_hsl(var(--shadow)/0.18)]"
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
  const barW = Math.max(4, Math.min(22, (slot - 14) / 2));
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
                <path d={topRoundedBar(cx - barW - 1, y(d.income), barW, plotH + padT - y(d.income))} style={{ fill: "var(--chart-income)" }} />
                <path d={topRoundedBar(cx + 1, y(d.expense), barW, plotH + padT - y(d.expense))} style={{ fill: "var(--chart-expense)" }} />
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
              <stop offset="0%" style={{ stopColor: "var(--accent)", stopOpacity: 0.18 }} />
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
          <path d={line} fill="none" style={{ stroke: "var(--accent)" }} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
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
              <circle cx={x(hover)} cy={y(values[hover])} r={5} style={{ fill: "var(--accent)", stroke: "var(--surface)" }} strokeWidth={2} />
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
          <div className="h-1.5">
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
