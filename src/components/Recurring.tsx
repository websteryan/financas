"use client";

import { useState } from "react";
import { Check, Plus } from "./icons";
import { AccountGlyph, Button, CategoryGlyph, Chip, Field, Segmented, Sheet, inputClass, showToast } from "./ui";
import { dayLabel, money, moneyPlain } from "@/lib/format";
import { nextDue, type PendingItem } from "@/lib/recurring";
import { useFinance } from "@/lib/store";
import { PAYMENT_LABEL, type Kind, type NewRecurringRule, type PaymentMethod, type RecurringRule } from "@/lib/types";

const pad = (n: number) => String(n).padStart(2, "0");
const thisYm = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
};
const METHODS = Object.keys(PAYMENT_LABEL) as PaymentMethod[];

/* ----------------------------------------------------------- A confirmar (Resumo) */

export function PendingBlock() {
  const f = useFinance();
  const [open, setOpen] = useState<PendingItem | null>(null);
  if (f.loading || f.pending.length === 0) return null;

  async function quick(p: PendingItem) {
    try {
      await f.confirmPending(p, p.rule.amount_cents);
      showToast(`${p.rule.description} confirmado`);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Não foi possível confirmar.");
    }
  }

  return (
    <section className="rise mb-6 lg:mb-8">
      <div className="mb-2 flex items-center justify-between px-1">
        <h2 className="text-[13px] font-medium text-muted">A confirmar</h2>
        <span className="num rounded-full bg-accent-soft px-2 py-0.5 text-[12px] font-medium text-accent-text">{f.pending.length}</span>
      </div>
      <div className="card divide-y divide-line overflow-hidden">
        {f.pending.map((p) => {
          const r = p.rule;
          const cat = f.categoryById(r.category_id);
          return (
            <div key={`${r.id}-${p.ym}`} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-2">
              <button type="button" onClick={() => setOpen(p)} className="flex min-w-0 flex-1 items-center gap-3.5 text-left">
                <CategoryGlyph category={cat} size={44} fallback={r.description} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[16px] font-medium">{r.description}</span>
                  <span className={`block truncate text-[13px] ${p.overdue ? "text-warn" : "text-muted"}`}>
                    {p.overdue ? `Atrasado, venceu ${dayLabel(p.due).toLowerCase()}` : "Vence hoje"} {"•"} {f.accountById(r.account_id)?.name}
                  </span>
                </span>
                <span className={`num whitespace-nowrap text-[16px] font-semibold ${r.kind === "receita" ? "text-income" : ""}`}>
                  {r.kind === "receita" ? "+" : "-"} {money(r.amount_cents)}
                </span>
              </button>
              <button
                type="button"
                aria-label={`Confirmar ${r.description}`}
                onClick={() => void quick(p)}
                className="bg-brand inline-flex size-10 shrink-0 items-center justify-center rounded-ctl transition-[transform,filter] hover:brightness-110 active:scale-90"
              >
                <Check size={18} weight="bold" />
              </button>
            </div>
          );
        })}
      </div>
      <PendingSheet item={open} onClose={() => setOpen(null)} />
    </section>
  );
}

function PendingSheet({ item, onClose }: { item: PendingItem | null; onClose: () => void }) {
  const f = useFinance();
  const [cents, setCents] = useState(0);
  const [prev, setPrev] = useState<PendingItem | null>(null);
  const [busy, setBusy] = useState(false);
  if (item !== prev) {
    setPrev(item);
    if (item) setCents(item.rule.amount_cents);
  }
  if (!item) return null;
  const r = item.rule;

  async function confirm() {
    if (!item || cents <= 0) return;
    setBusy(true);
    try {
      await f.confirmPending(item, cents);
      showToast(`${r.description} confirmado`);
      onClose();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Não foi possível confirmar.");
    }
    setBusy(false);
  }
  async function skip() {
    if (!item) return;
    setBusy(true);
    try {
      await f.skipPending(item);
      showToast("Pulado neste mês");
      onClose();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Não foi possível pular.");
    }
    setBusy(false);
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={r.description}
      footer={
        <div className="flex gap-2">
          <Button variant="ghost" onClick={skip} disabled={busy}>
            Pular este mês
          </Button>
          <Button variant="primary" className="flex-1" onClick={confirm} disabled={busy || cents <= 0}>
            Confirmar
          </Button>
        </div>
      }
    >
      <form
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          void confirm();
        }}
      >
        <p className="text-[14px] text-muted">
          {r.kind === "receita" ? "Receita" : "Gasto"} fixo de {dayLabel(item.due).toLowerCase()} em {f.accountById(r.account_id)?.name}. Ajuste o valor se mudou este mês.
        </p>
        <Field label="Valor" htmlFor="valor-pend">
          <input
            id="valor-pend"
            inputMode="numeric"
            autoComplete="off"
            className={`${inputClass} num text-[20px] font-semibold`}
            value={moneyPlain(cents)}
            onChange={(e) => setCents(Number(e.target.value.replace(/\D/g, "").slice(0, 11) || "0"))}
          />
        </Field>
        <button type="submit" hidden />
      </form>
    </Sheet>
  );
}

/* ----------------------------------------------------------- Regras (Contas) */

type Draft = Omit<NewRecurringRule, "amount_cents"> & { id?: string; cents: number };

const emptyDraft = (accountId: string): Draft => ({
  description: "",
  kind: "despesa",
  cents: 0,
  day: new Date().getDate(),
  account_id: accountId,
  category_id: null,
  method: "debito",
  start_ym: thisYm(),
  last_ym: null,
  active: true,
});

export function RecurringPanel() {
  const f = useFinance();
  const [draft, setDraft] = useState<Draft | null>(null);
  if (f.recurringError) return null;

  return (
    <>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-[13px] text-muted">Salário, aluguel e assinaturas que se repetem todo mês.</p>
        <Button className="h-9 shrink-0 px-3 text-[13px]" onClick={() => setDraft(emptyDraft(f.accounts[0]?.id ?? ""))} disabled={f.accounts.length === 0}>
          <Plus size={16} weight="bold" /> Nova
        </Button>
      </div>
      {f.rules.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted">Nenhuma recorrência. Crie uma aqui ou marque "Repetir todo mês" ao lançar.</p>
      ) : (
        <ul className="-mx-2 flex flex-col">
          {f.rules.map((r) => {
            const cat = f.categoryById(r.category_id);
            return (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => setDraft({ ...r, cents: r.amount_cents })}
                  className="flex w-full items-center gap-3 rounded-[16px] px-2 py-2.5 text-left transition-colors hover:bg-surface-2"
                >
                  <CategoryGlyph category={cat} size={40} fallback={r.description} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-medium">{r.description}</span>
                    <span className="block truncate text-[13px] text-muted">
                      {r.active ? `Todo dia ${r.day} • próximo ${dayLabel(nextDue(r)).toLowerCase()}` : "Pausada"}
                    </span>
                  </span>
                  <span className={`num text-[15px] font-medium ${r.kind === "receita" ? "text-income" : ""} ${r.active ? "" : "opacity-50"}`}>
                    {r.kind === "receita" ? "+" : "-"} {money(r.amount_cents)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <RuleSheet draft={draft} onClose={() => setDraft(null)} />
    </>
  );
}

function RuleSheet({ draft, onClose }: { draft: Draft | null; onClose: () => void }) {
  const f = useFinance();
  const [form, setForm] = useState<Draft | null>(draft);
  const [prev, setPrev] = useState<Draft | null>(draft);
  const [busy, setBusy] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (draft !== prev) {
    setPrev(draft);
    setForm(draft);
    setConfirmDel(false);
    setError(null);
  }
  if (!form) return null;
  const set = (patch: Partial<Draft>) => setForm({ ...form, ...patch });

  async function save() {
    if (!form) return;
    if (!form.description.trim()) return setError("Dê um nome para a recorrência.");
    if (form.cents <= 0) return setError("Informe o valor.");
    setBusy(true);
    try {
      const { cents, ...rest } = form;
      await f.saveRule({ ...rest, description: rest.description.trim(), amount_cents: cents, method: rest.kind === "despesa" ? rest.method : null });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível salvar.");
    }
    setBusy(false);
  }
  async function remove() {
    if (!form?.id) return;
    setBusy(true);
    try {
      await f.deleteRule(form.id);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível excluir.");
    }
    setBusy(false);
  }

  const cats = f.categories.filter((c) => c.kind === form.kind);

  return (
    <Sheet
      open={Boolean(draft)}
      onClose={onClose}
      title={form.id ? "Editar recorrência" : "Nova recorrência"}
      footer={
        <div className="flex flex-col gap-2">
          {error && (
            <p role="alert" className="text-sm text-expense">
              {error}
            </p>
          )}
          {confirmDel ? (
            <div className="flex gap-2">
              <Button className="flex-1" onClick={() => setConfirmDel(false)} disabled={busy}>
                Cancelar
              </Button>
              <Button variant="danger" className="flex-1" onClick={remove} disabled={busy}>
                Excluir recorrência
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              {form.id && (
                <Button variant="danger" onClick={() => setConfirmDel(true)} disabled={busy}>
                  Excluir
                </Button>
              )}
              <Button variant="primary" className="flex-1" onClick={save} disabled={busy}>
                {busy ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          )}
        </div>
      }
    >
      <form
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <Segmented<Kind>
          value={form.kind}
          onChange={(kind) => set({ kind, category_id: null })}
          options={[
            { value: "despesa", label: "Gasto" },
            { value: "receita", label: "Receita" },
          ]}
        />
        <Field label="Nome" htmlFor="rec-nome">
          <input id="rec-nome" className={inputClass} value={form.description} placeholder="Ex.: Aluguel, Salário, Internet" onChange={(e) => set({ description: e.target.value })} />
        </Field>
        <Field label="Valor" htmlFor="rec-valor">
          <input
            id="rec-valor"
            inputMode="numeric"
            autoComplete="off"
            className={`${inputClass} num text-[20px] font-semibold`}
            value={moneyPlain(form.cents)}
            onChange={(e) => set({ cents: Number(e.target.value.replace(/\D/g, "").slice(0, 11) || "0") })}
          />
        </Field>
        <Field label="Dia do mês" htmlFor="rec-dia" hint="Em meses mais curtos vale o último dia.">
          <input
            id="rec-dia"
            type="number"
            min={1}
            max={31}
            inputMode="numeric"
            className={inputClass}
            value={form.day}
            onChange={(e) => set({ day: Math.min(31, Math.max(1, Number(e.target.value) || 1)) })}
          />
        </Field>
        <Field label="Categoria">
          <div className="flex flex-wrap gap-2">
            {cats.map((c) => (
              <Chip key={c.id} active={form.category_id === c.id} color={c.color} onClick={() => set({ category_id: form.category_id === c.id ? null : c.id })}>
                {c.name}
              </Chip>
            ))}
          </div>
        </Field>
        <Field label="Conta">
          <div className="flex flex-wrap gap-2">
            {f.accounts.map((a) => (
              <button
                key={a.id}
                type="button"
                aria-pressed={form.account_id === a.id}
                onClick={() => set({ account_id: a.id })}
                className={`flex h-12 items-center gap-2.5 rounded-ctl border pl-2 pr-4 text-sm transition-colors ${
                  form.account_id === a.id ? "border-accent-text bg-accent-soft text-fg" : "border-line bg-surface text-muted hover:text-fg"
                }`}
              >
                <AccountGlyph color={a.color} size={30} />
                {a.name}
              </button>
            ))}
          </div>
        </Field>
        {form.kind === "despesa" && (
          <Field label="Forma de pagamento">
            <div className="flex flex-wrap gap-2">
              {METHODS.map((m) => (
                <Chip key={m} active={form.method === m} onClick={() => set({ method: m })}>
                  {PAYMENT_LABEL[m]}
                </Chip>
              ))}
            </div>
          </Field>
        )}
        {form.id && (
          <Field label="Situação">
            <Segmented<"ativa" | "pausada">
              value={form.active ? "ativa" : "pausada"}
              onChange={(v) => set({ active: v === "ativa" })}
              options={[
                { value: "ativa", label: "Ativa" },
                { value: "pausada", label: "Pausada" },
              ]}
            />
          </Field>
        )}
        <button type="submit" hidden />
      </form>
    </Sheet>
  );
}
