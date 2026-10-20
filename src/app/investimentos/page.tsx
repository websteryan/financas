"use client";

import { useState, type CSSProperties } from "react";
import { Plus, Trash, WarningCircle } from "@/components/icons";
import { Donut } from "@/components/charts/Charts";
import { PageHeader, Panel } from "@/components/PageHeader";
import { Button, Chip, Empty, Field, Sheet, Skeleton, inputClass, showToast } from "@/components/ui";
import { dayLabel, money, todayISO } from "@/lib/format";
import { useCountUp } from "@/lib/motion";
import { useFinance } from "@/lib/store";
import { INVESTMENT_TYPE_COLOR, INVESTMENT_TYPE_LABEL, type Investment, type InvestmentType } from "@/lib/types";

type Draft = { id?: string; name: string; type: InvestmentType; institution: string; cents: number; date: string };

const emptyDraft = (): Draft => ({ name: "", type: "renda_fixa", institution: "", cents: 0, date: todayISO() });

export default function InvestimentosPage() {
  const f = useFinance();
  const [draft, setDraft] = useState<Draft | null>(null);

  const list = f.investments;
  const total = list.reduce((s, i) => s + i.amount_cents, 0);
  const shown = useCountUp(total);

  const byType = (Object.keys(INVESTMENT_TYPE_LABEL) as InvestmentType[])
    .map((t) => ({
      id: t,
      label: INVESTMENT_TYPE_LABEL[t],
      color: INVESTMENT_TYPE_COLOR[t],
      value: list.filter((i) => i.type === t).reduce((s, i) => s + i.amount_cents, 0),
    }))
    .filter((x) => x.value > 0)
    .sort((a, b) => b.value - a.value);

  return (
    <div className="fade-in">
      <PageHeader title="Investimentos" month={false}>
        <Button variant="primary" className="h-11 px-4 text-sm" onClick={() => setDraft(emptyDraft())}>
          <Plus size={16} weight="bold" /> Novo
        </Button>
      </PageHeader>

      {f.investmentsError ? (
        <div className="card flex gap-3 p-5 text-sm">
          <WarningCircle size={22} className="mt-0.5 shrink-0 text-expense" />
          <div>
            <p className="font-medium">Não foi possível carregar os investimentos</p>
            <p className="mt-1 text-muted">A tabela de investimentos ainda precisa ser criada no Supabase. Detalhe: {f.investmentsError}</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5 lg:gap-5">
          <section className="bg-brand rise flex flex-col rounded-[28px] p-5 sm:p-7 lg:col-span-3">
            <p className="text-[14px] font-medium opacity-70">Total investido</p>
            {f.loading ? (
              <Skeleton className="mt-2 h-12 w-56 bg-black/15" />
            ) : (
              <p className="num font-display mt-1 text-[44px] font-semibold leading-none tracking-tight sm:text-[56px]">{money(shown)}</p>
            )}
            <p className="mt-3 inline-flex rounded-full bg-black/15 px-3 py-1 text-[13px] font-medium">
              {list.length} {list.length === 1 ? "aplicação" : "aplicações"} em {byType.length} {byType.length === 1 ? "tipo" : "tipos"}
            </p>
            <p className="mt-auto pt-5 text-[13px] opacity-70">Registro do que você aplicou. Valores não são atualizados pelo mercado.</p>
          </section>

          <Panel title="Distribuição" className="rise lg:col-span-2">
            {f.loading ? (
              <Skeleton className="h-[200px]" />
            ) : byType.length === 0 ? (
              <Empty title="Nada por aqui" text="Registre sua primeira aplicação para ver a distribuição." />
            ) : (
              <div className="flex flex-col items-center gap-5 sm:flex-row lg:flex-col 2xl:flex-row">
                <Donut items={byType} centerLabel="Investido" />
                <ul className="flex w-full min-w-0 flex-1 flex-col gap-2.5">
                  {byType.map((c) => (
                    <li key={c.id} className="flex items-center gap-2.5 text-[14px]">
                      <span className="size-2.5 shrink-0 rounded-full" style={{ background: c.color }} />
                      <span className="min-w-0 flex-1 truncate">{c.label}</span>
                      <span className="num text-muted">{Math.round((c.value / total) * 100)}%</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Panel>
        </div>
      )}

      {!f.investmentsError && (
        <section className="mt-8">
          <h2 className="mb-4 px-1 text-[19px] font-semibold">Minhas aplicações</h2>
          {f.loading ? (
            <div className="flex flex-col gap-2.5">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-[68px] rounded-[22px]" />
              ))}
            </div>
          ) : list.length === 0 ? (
            <div className="card">
              <Empty
                title="Nenhuma aplicação"
                text="Anote onde você investiu e quanto, para ter tudo num lugar só."
                action={
                  <Button variant="primary" onClick={() => setDraft(emptyDraft())}>
                    Registrar investimento
                  </Button>
                }
              />
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {list.map((i, n) => (
                <InvestmentRow key={i.id} inv={i} index={Math.min(n, 8)} onClick={() => setDraft({ id: i.id, name: i.name, type: i.type, institution: i.institution, cents: i.amount_cents, date: i.date })} />
              ))}
            </div>
          )}
        </section>
      )}

      <InvestmentSheet draft={draft} onClose={() => setDraft(null)} />
    </div>
  );
}

function InvestmentRow({ inv, index, onClick }: { inv: Investment; index: number; onClick: () => void }) {
  const color = INVESTMENT_TYPE_COLOR[inv.type];
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ "--i": index } as CSSProperties}
      className="rise tile flex w-full items-center gap-3.5 rounded-[22px] px-3.5 py-3 text-left transition-[background-color,transform] hover:bg-surface-3 active:scale-[0.99]"
    >
      <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-[15px] font-semibold" style={{ background: `${color}2b`, color }} aria-hidden>
        {inv.name.charAt(0).toUpperCase()}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[16px] font-medium">{inv.name}</span>
        <span className="block truncate text-[13px] text-muted">
          {[INVESTMENT_TYPE_LABEL[inv.type], inv.institution, dayLabel(inv.date)].filter(Boolean).join(" • ")}
        </span>
      </span>
      <span className="num whitespace-nowrap text-[16px] font-semibold">{money(inv.amount_cents)}</span>
    </button>
  );
}

function InvestmentSheet({ draft, onClose }: { draft: Draft | null; onClose: () => void }) {
  const f = useFinance();
  const [form, setForm] = useState<Draft | null>(draft);
  const [prev, setPrev] = useState(draft);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (draft !== prev) {
    setPrev(draft);
    setForm(draft);
    setConfirm(false);
    setError(null);
    setBusy(false);
  }
  if (!form) return null;

  async function save() {
    if (!form) return;
    if (!form.name.trim()) return setError("Dê um nome ao investimento.");
    if (form.cents <= 0) return setError("Informe um valor maior que zero.");
    setBusy(true);
    try {
      await f.saveInvestment({ id: form.id, name: form.name.trim(), type: form.type, institution: form.institution.trim(), amount_cents: form.cents, date: form.date });
      showToast(form.id ? "Alterações salvas" : "Investimento registrado");
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível salvar.");
      setBusy(false);
    }
  }
  async function remove() {
    if (!form?.id) return;
    const back = { name: form.name, type: form.type, institution: form.institution, amount_cents: form.cents, date: form.date };
    onClose();
    try {
      await f.deleteInvestment(form.id);
      showToast("Investimento excluído", { label: "Desfazer", onClick: () => void f.saveInvestment(back) });
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Não foi possível excluir.");
    }
  }

  return (
    <Sheet
      open={Boolean(draft)}
      onClose={onClose}
      title={form.id ? "Editar investimento" : "Novo investimento"}
      footer={
        <div className="flex flex-col gap-3">
          {error && (
            <p role="alert" className="text-sm text-expense">
              {error}
            </p>
          )}
          {confirm ? (
            <div className="flex gap-2">
              <Button className="flex-1" onClick={() => setConfirm(false)} disabled={busy}>
                Cancelar
              </Button>
              <Button variant="danger" className="flex-1" onClick={remove} disabled={busy}>
                Excluir
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              {form.id && (
                <Button variant="danger" aria-label="Excluir" className="w-12 px-0" onClick={() => setConfirm(true)}>
                  <Trash size={18} weight="bold" />
                </Button>
              )}
              <Button variant="primary" className="flex-1" onClick={save} disabled={busy}>
                {busy ? "Salvando..." : form.id ? "Salvar" : "Registrar"}
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
        <div className="flex flex-col items-center gap-1 py-2">
          <label htmlFor="inv-valor" className="text-[13px] font-medium text-muted">
            Valor investido
          </label>
          <input
            id="inv-valor"
            inputMode="numeric"
            autoComplete="off"
            value={money(form.cents)}
            onChange={(e) => setForm({ ...form, cents: Number(e.target.value.replace(/\D/g, "").slice(0, 11) || "0") })}
            className="num font-display w-full bg-transparent text-center text-[44px] font-semibold leading-tight outline-none"
          />
        </div>
        <Field label="Nome" htmlFor="inv-nome">
          <input id="inv-nome" className={inputClass} value={form.name} placeholder="Ex.: Tesouro Selic, PETR4" onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="off" />
        </Field>
        <Field label="Tipo">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(INVESTMENT_TYPE_LABEL) as InvestmentType[]).map((t) => (
              <Chip key={t} active={form.type === t} color={INVESTMENT_TYPE_COLOR[t]} onClick={() => setForm({ ...form, type: t })}>
                {INVESTMENT_TYPE_LABEL[t]}
              </Chip>
            ))}
          </div>
        </Field>
        <Field label="Onde (corretora ou banco)" htmlFor="inv-inst">
          <input id="inv-inst" className={inputClass} value={form.institution} placeholder="Ex.: XP, Nubank, Tesouro Direto" onChange={(e) => setForm({ ...form, institution: e.target.value })} autoComplete="off" />
        </Field>
        <Field label="Data" htmlFor="inv-data">
          <input id="inv-data" type="date" className={inputClass} value={form.date} onChange={(e) => e.target.value && setForm({ ...form, date: e.target.value })} />
        </Field>
        <button type="submit" hidden />
      </form>
    </Sheet>
  );
}
