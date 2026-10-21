"use client";

import { useCallback, useEffect, useRef, useState, type ButtonHTMLAttributes, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { Bank, Check, CaretLeft, CaretRight, CreditCard, Money, PixLogo, X } from "./icons";
import { currentYM, money, monthLabel, shiftYM, valuesHidden, type YM } from "@/lib/format";
import { categoryIcon } from "@/lib/category-icons";
import type { PaymentMethod } from "@/lib/types";

/*
 * Sistema de forma: cartões 24px, blocos internos 18px, controles em pílula
 * (botões, chips, abas); campos 16px.
 */

type Variant = "primary" | "secondary" | "ghost" | "danger";

const variants: Record<Variant, string> = {
  primary: "bg-brand font-semibold hover:brightness-110",
  secondary: "tile text-fg hover:bg-surface-3",
  ghost: "text-muted hover:text-fg hover:bg-surface-2",
  danger: "bg-expense/10 text-expense hover:bg-expense/15",
};

export function Button({
  variant = "secondary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  // Sem tailwind-merge: altura, padding e tamanho de texto padrão só valem se o chamador não passar os seus.
  const base = [/(^|\s)h-/.test(className) ? "" : "h-12", /(^|\s)px-/.test(className) ? "" : "px-5", /(^|\s)text-(\[|sm|xs|base|lg)/.test(className) ? "" : "text-[15px]"].join(" ");
  return (
    <button
      {...props}
      className={`${base} inline-flex max-w-full items-center justify-center gap-2 whitespace-nowrap rounded-ctl font-medium transition-[transform,background-color,filter] duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 ${variants[variant]} ${className}`}
    />
  );
}

export function IconButton({
  label,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      aria-label={label}
      title={label}
      {...props}
      className={`tile inline-flex size-10 shrink-0 items-center justify-center rounded-ctl text-fg/85 transition-[transform,background-color,color] duration-150 hover:bg-surface-3 hover:text-fg active:scale-95 ${className}`}
    />
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className = "",
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  className?: string;
}) {
  const idx = Math.max(0, options.findIndex((o) => o.value === value));
  return (
    <div role="tablist" className={`tile relative grid rounded-ctl p-1 ${className}`} style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      <span
        aria-hidden
        className="bg-brand absolute inset-y-1 left-1 rounded-ctl transition-transform duration-[380ms] ease-[var(--ease-out)] motion-reduce:transition-none"
        style={{ width: `calc((100% - 0.5rem) / ${options.length})`, transform: `translateX(${idx * 100}%)` }}
      />
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          type="button"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={`relative z-10 h-11 min-w-0 truncate whitespace-nowrap rounded-ctl px-3 text-[15px] transition-colors duration-200 ${
            value === o.value ? "font-semibold text-accent-fg" : "font-medium text-muted hover:text-fg"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Field({ label, htmlFor, children, hint }: { label: string; htmlFor?: string; children: ReactNode; hint?: string }) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={htmlFor} className="text-[13px] font-medium text-muted">
        {label}
      </label>
      {children}
      {hint && <p className="text-[13px] text-muted">{hint}</p>}
    </div>
  );
}

export const inputClass =
  "h-12 w-full rounded-field border border-line bg-surface-2 px-4 text-fg placeholder:text-muted/70 outline-none transition-colors focus:border-accent";

export function Chip({
  active,
  color,
  children,
  onClick,
}: {
  active: boolean;
  color?: string;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-ctl border px-4 text-sm transition-colors ${
        active ? "border-accent/70 bg-accent-soft text-fg" : "border-line bg-surface text-muted hover:text-fg"
      }`}
    >
      {color && <span className="size-2 rounded-full" style={{ background: color }} />}
      {children}
    </button>
  );
}

/** Ícone de uma conta (instituição). A forma de pagamento é por lançamento: veja MethodIcon. */
export function AccountGlyph({ color, size = 36 }: { color: string; size?: number }) {
  const Icon = Bank;
  return (
    <span className="acc-glyph inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size, "--c": color } as CSSProperties}>
      <Icon size={Math.round(size * 0.5)} weight="bold" />
    </span>
  );
}

/** Ícone da categoria. Moderno: tingido com a cor da categoria. Minimal: monocromático (a cor fica nos gráficos). */
export function CategoryGlyph({ category, size = 44, fallback }: { category?: { name: string; color: string; icon?: string | null } | null; size?: number; fallback?: string }) {
  const color = category?.color ?? "#8b8b93";
  const Icon = category ? categoryIcon(category) : categoryIcon({ name: fallback ?? "" });
  return (
    <span
      className="cat-glyph inline-flex shrink-0 items-center justify-center"
      style={{ width: size, height: size, "--c": color } as CSSProperties}
      aria-hidden
    >
      <Icon size={Math.round(size * 0.46)} weight="bold" />
    </span>
  );
}

export function MonthPicker({ value, onChange }: { value: YM; onChange: (m: YM) => void }) {
  const now = currentYM();
  const isNow = value.y === now.y && value.m === now.m;
  return (
    <div className="tile flex items-center rounded-ctl p-1">
      <IconButton label="Mês anterior" onClick={() => onChange(shiftYM(value, -1))} className="size-9 border-0 bg-none shadow-none">
        <CaretLeft size={16} weight="bold" />
      </IconButton>
      <button
        type="button"
        onClick={() => onChange(now)}
        disabled={isNow}
        className="min-w-[5.5rem] rounded-ctl px-2 py-1.5 min-[380px]:min-w-[6.5rem] text-center text-[15px] font-semibold text-fg disabled:cursor-default"
        title={isNow ? undefined : "Voltar para o mês atual"}
      >
        {monthLabel(value)}
      </button>
      <IconButton label="Próximo mês" onClick={() => onChange(shiftYM(value, 1))} className="size-9 border-0 bg-none shadow-none">
        <CaretRight size={16} weight="bold" />
      </IconButton>
    </div>
  );
}

export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const drag = useRef<{ y: number; t: number; dy: number } | null>(null);
  const [closing, setClosing] = useState(false);

  // Fecha com saída animada (desliza para baixo no celular, esmaece no computador)
  const requestClose = useCallback(() => {
    if (closing) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return onClose();
    setClosing(true);
    window.setTimeout(() => {
      setClosing(false);
      onClose();
    }, 220);
  }, [closing, onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && requestClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, requestClose]);

  function down(e: ReactPointerEvent) {
    if ((e.target as HTMLElement).closest("button")) return;
    drag.current = { y: e.clientY, t: performance.now(), dy: 0 };
    e.currentTarget.setPointerCapture(e.pointerId);
    if (panel.current) panel.current.style.transition = "none";
  }
  function move(e: ReactPointerEvent) {
    const d = drag.current;
    if (!d || !panel.current) return;
    d.dy = Math.max(0, e.clientY - d.y);
    panel.current.style.transform = `translateY(${d.dy}px)`;
  }
  function up() {
    const d = drag.current;
    drag.current = null;
    const el = panel.current;
    if (!d || !el) return;
    const v = d.dy / Math.max(1, performance.now() - d.t); // px/ms
    el.style.transition = "transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)";
    if (d.dy > 120 || v > 0.6) {
      el.style.transform = "translateY(100%)";
      window.setTimeout(onClose, 260);
    } else {
      el.style.transform = "";
    }
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={title}>
      <button aria-label="Fechar" className={`${closing ? "sheet-backdrop-out" : "sheet-backdrop"} absolute inset-0 bg-black/70 backdrop-blur-[4px]`} onClick={requestClose} />
      <div
        ref={panel}
        className={`${closing ? "sheet-panel-out" : "sheet-panel"} relative flex max-h-[92dvh] w-full flex-col rounded-t-sheet border border-line bg-sheet shadow-[0_-12px_60px_rgb(0_0_0/0.5)] sm:max-w-[460px] sm:rounded-sheet`}
      >
        <div className="touch-none sm:touch-auto" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
          <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-white/20 sm:hidden" />
          <div className="flex items-center justify-between px-5 pb-2 pt-3">
            <h2 className="text-[17px] font-semibold">{title}</h2>
            <IconButton label="Fechar" onClick={requestClose} className="-mr-2">
              <X size={18} weight="bold" />
            </IconButton>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-4">{children}</div>
        {footer && <div className="border-t border-line px-5 pb-safe pt-3 sm:pb-0"><div className="pb-4">{footer}</div></div>}
      </div>
    </div>
  );
}

export function Empty({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
      <p className="text-[15px] font-semibold">{title}</p>
      <p className="max-w-[32ch] text-sm text-muted">{text}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

/** Aviso rápido no rodapé. `showToast("texto")` ou com ação (ex.: Desfazer). */
export interface ToastAction {
  label: string;
  onClick: () => void;
}
export function showToast(message: string, action?: ToastAction) {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("app-toast", { detail: { message, action } }));
}

export function Toaster() {
  const [msg, setMsg] = useState<{ id: number; text: string; action?: ToastAction } | null>(null);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const on = (e: Event) => {
      const d = (e as CustomEvent).detail as { message: string; action?: ToastAction };
      setMsg({ id: Date.now(), text: d.message, action: d.action });
      clearTimeout(timer);
      timer = setTimeout(() => setMsg(null), d.action ? 6000 : 2400);
    };
    window.addEventListener("app-toast", on);
    return () => {
      window.removeEventListener("app-toast", on);
      clearTimeout(timer);
    };
  }, []);
  if (!msg) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(7.5rem+env(safe-area-inset-bottom))] z-50 flex justify-center px-4 lg:bottom-8">
      <p
        key={msg.id}
        role="status"
        className="toast glass pointer-events-auto flex items-center gap-2.5 rounded-ctl py-2.5 pl-2.5 pr-5 text-sm font-medium text-fg shadow-[0_8px_30px_rgb(0_0_0/0.5)]"
      >
        <span className="pop bg-brand inline-flex size-6 items-center justify-center rounded-full">
          <Check size={14} weight="bold" />
        </span>
        {msg.text}
        {msg.action && (
          <button
            type="button"
            className="-mr-2 ml-1 rounded-ctl px-3 py-1 font-semibold text-accent-text hover:bg-white/10"
            onClick={() => {
              msg.action?.onClick();
              setMsg(null);
            }}
          >
            {msg.action.label}
          </button>
        )}
      </p>
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton rounded-[16px] ${className}`} />;
}

/** Valor grande: símbolo e centavos mais discretos, reais em destaque. */
export function BigMoney({ cents, className = "" }: { cents: number; className?: string }) {
  if (valuesHidden()) return <span className={`num font-display font-bold ${className}`}>{"R$ \u2022\u2022\u2022\u2022"}</span>;
  const txt = money(Math.abs(cents)); // "R$ 4.685,88"
  const cut = txt.lastIndexOf(",");
  const sym = txt.slice(0, txt.search(/\d/));
  const whole = txt.slice(sym.length, cut);
  const dec = txt.slice(cut);
  return (
    <span className={`num font-display ${className}`}>
      {cents < 0 && "-"}
      <span className="font-medium text-muted">{sym}</span>
      <span className="font-bold">{whole}</span>
      <span className="font-medium text-muted">{dec}</span>
    </span>
  );
}

export function MethodIcon({ method, size = 18 }: { method: PaymentMethod; size?: number }) {
  const Icon = method === "credito" ? CreditCard : method === "pix" ? PixLogo : method === "dinheiro" ? Money : Bank;
  return <Icon size={size} weight="bold" />;
}
