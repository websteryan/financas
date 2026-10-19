"use client";

import { useEffect, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Bank, CaretLeft, CaretRight, CreditCard, Money, PixLogo, X } from "./icons";
import { currentYM, monthLabel, shiftYM, type YM } from "@/lib/format";
import type { AccountType } from "@/lib/types";

/*
 * Sistema de forma: cartões 20px, controles (botões, campos, chips) 12px,
 * botões só de ícone são circulares.
 */

type Variant = "primary" | "secondary" | "ghost" | "danger";

const variants: Record<Variant, string> = {
  primary: "bg-brand glow hover:brightness-110",
  secondary: "tile text-fg hover:bg-surface-2",
  ghost: "text-muted hover:text-fg hover:bg-surface-2",
  danger: "bg-expense/10 text-expense hover:bg-expense/15",
};

export function Button({
  variant = "secondary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      {...props}
      className={`inline-flex h-12 items-center justify-center gap-2 whitespace-nowrap rounded-full px-5 text-[15px] font-medium transition-[transform,background-color,filter] duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 ${variants[variant]} ${className}`}
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
      className={`tile inline-flex size-10 shrink-0 items-center justify-center rounded-full text-fg/85 transition-[transform,background-color,color] duration-150 hover:bg-surface-2 hover:text-fg active:scale-95 ${className}`}
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
  return (
    <div role="tablist" className={`flex gap-2 ${className}`}>
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          type="button"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={`h-11 flex-1 whitespace-nowrap rounded-full px-4 text-[15px] font-medium transition-all duration-200 ${
            value === o.value ? "bg-brand glow" : "tile text-muted hover:text-fg"
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
  "h-12 w-full rounded-[16px] border border-line bg-surface-2 px-4 text-fg placeholder:text-muted/70 outline-none transition-colors focus:border-accent";

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
      className={`inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-4 text-sm transition-colors ${
        active ? "border-accent/70 bg-accent-soft text-fg" : "border-line bg-surface text-muted hover:text-fg"
      }`}
    >
      {color && <span className="size-2 rounded-full" style={{ background: color }} />}
      {children}
    </button>
  );
}

export function AccountGlyph({ type, color, size = 36 }: { type: AccountType; color: string; size?: number }) {
  const Icon = type === "credito" ? CreditCard : type === "pix" ? PixLogo : type === "dinheiro" ? Money : Bank;
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full"
      style={{ width: size, height: size, background: `${color}1f`, color }}
    >
      <Icon size={Math.round(size * 0.5)} weight="bold" />
    </span>
  );
}

export function MonthPicker({ value, onChange }: { value: YM; onChange: (m: YM) => void }) {
  const now = currentYM();
  const isNow = value.y === now.y && value.m === now.m;
  return (
    <div className="tile flex items-center rounded-full p-1">
      <IconButton label="Mês anterior" onClick={() => onChange(shiftYM(value, -1))} className="size-9 border-0 bg-none shadow-none">
        <CaretLeft size={16} weight="bold" />
      </IconButton>
      <button
        type="button"
        onClick={() => onChange(now)}
        disabled={isNow}
        className="min-w-[6.5rem] rounded-full px-2 py-1.5 text-center text-[15px] font-semibold text-fg disabled:cursor-default"
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
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={title}>
      <button aria-label="Fechar" className="sheet-backdrop absolute inset-0 bg-[#04030a]/70 backdrop-blur-[6px]" onClick={onClose} />
      <div className="sheet-panel relative flex max-h-[92dvh] w-full flex-col rounded-t-[32px] border border-line bg-sheet shadow-[0_-12px_80px_rgb(112_62_255/0.25)] sm:max-w-[460px] sm:rounded-[32px]">
        <div className="flex items-center justify-between px-5 pb-2 pt-4">
          <h2 className="text-[17px] font-semibold">{title}</h2>
          <IconButton label="Fechar" onClick={onClose} className="-mr-2">
            <X size={18} weight="bold" />
          </IconButton>
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

/** Aviso rápido no rodapé. Dispare com `showToast("texto")`. */
export function showToast(message: string) {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("app-toast", { detail: message }));
}

export function Toaster() {
  const [msg, setMsg] = useState<{ id: number; text: string } | null>(null);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const on = (e: Event) => {
      setMsg({ id: Date.now(), text: String((e as CustomEvent).detail) });
      clearTimeout(timer);
      timer = setTimeout(() => setMsg(null), 2400);
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
        className="toast glass rounded-full px-5 py-3 text-sm font-medium text-fg shadow-[0_8px_30px_hsl(var(--shadow)/0.5)]"
      >
        {msg.text}
      </p>
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-[16px] bg-surface-2 ${className}`} />;
}
