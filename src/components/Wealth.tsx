"use client";

import { useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import { Bank, ChartLineUp, Plus, Target, Trash, WarningCircle } from "./icons";
import { BalanceLine } from "./charts/Charts";
import { Panel } from "./PageHeader";
import { BigMoney, Button, Chip, Empty, Field, Sheet, Skeleton, inputClass, showToast } from "./ui";
import { MONTHS_SHORT, currentYM, dayLabel, shortDate, money, monthEnd, moneyPlain, parseISO, shiftYM, todayISO, ymKey } from "@/lib/format";
import { useCountUp } from "@/lib/motion";
import { useFinance } from "@/lib/store";
import { PALETTE, type Goal } from "@/lib/types";

/* ------------------------------------------------------------- Patrimônio */

export function NetWorthView() {
  const f = useFinance();
  const invested = f.investments.reduce((s, i) => s + i.amount_cents, 0);
  const total = f.totalBalance + invested;
  const shown = useCountUp(total);

  const series = useMemo(() => {
    const now = currentYM();
    const keys = Object.keys(f.netByMonth).sort();
    const first = keys[0] ? { y: Number(keys[0].slice(0, 4)), m: Number(keys[0].slice(5, 7)) } : now;
    // até 12 meses, terminando no mês atual
    let start = shiftYM(now, -11);
    if (first.y * 12 + first.m > start.y * 12 + start.m) start = first;
    const months: { y: number; m: number }[] = [];
    for (let ym = start; ym.y * 12 + ym.m <= now.y * 12 + now.m; ym = shiftYM(ym, 1)) months.push(ym);
    const before = keys.filter((k) => k < ymKey(start)).reduce((s, k) => s + f.netByMonth[k], 0);
    let acc = before;
    return months.map((ym) => {
      acc += f.netByMonth[ymKey(ym)] ?? 0;
      const inv = f.investments.filter((i) => i.date <= monthEnd(ym)).reduce((s, i) => s + i.amount_cents, 0);
      return { label: MONTHS_SHORT[ym.m - 1], value: acc + inv };
    });
  }, [f.netByMonth, f.investments]);

  const first = series[0]?.value ?? 0;
  const diff = total - first;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-5 lg:gap-5">
      <section className="card rise flex flex-col p-5 sm:p-7 lg:col-span-3">
        <p className="text-[14px] font-medium text-muted">Patrimônio total</p>
        {f.loading ? (
          <Skeleton className="mt-2 h-12 w-56" />
        ) : (
          <BigMoney cents={shown} className="mt-1 block text-[44px] leading-none tracking-tight sm:text-[56px]" />
        )}
        {!f.loading && series.length > 1 && (
          <p className={`mt-3 inline-flex self-start rounded-ctl px-3 py-1 text-[13px] font-medium ${diff >= 0 ? "bg-accent-soft text-accent-text" : "bg-white/[0.06] text-expense"}`}>
            {diff >= 0 ? "+" : "-"} {money(Math.abs(diff))} em {series.length - 1} {series.length - 1 === 1 ? "mês" : "meses"}
          </p>
        )}
        <p className="mt-auto pt-5 text-[13px] text-muted">Saldo das contas somado ao que você registrou em investimentos.</p>
      </section>

      <Panel title="Composição" className="rise lg:col-span-2">
        <ul className="flex flex-col gap-4">
          <li className="flex items-center gap-3">
            <span className="cat-glyph inline-flex size-11 shrink-0 items-center justify-center" style={{ "--c": "#7545e8" } as CSSProperties}>
              <Bank size={20} weight="bold" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[16px] font-medium">Contas</span>
              <span className="block text-[13px] text-muted">{f.accounts.length} {f.accounts.length === 1 ? "conta" : "contas"}</span>
            </span>
            <span className="num whitespace-nowrap font-semibold">{money(f.totalBalance)}</span>
          </li>
          <li className="flex items-center gap-3">
            <span className="cat-glyph inline-flex size-11 shrink-0 items-center justify-center" style={{ "--c": "#3ccb8b" } as CSSProperties}>
              <ChartLineUp size={20} weight="bold" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[16px] font-medium">Investimentos</span>
              <span className="block text-[13px] text-muted">{f.investments.length} {f.investments.length === 1 ? "aplicação" : "aplicações"}</span>
            </span>
            <span className="num whitespace-nowrap font-semibold">{money(invested)}</span>
          </li>
        </ul>
      </Panel>

      <Panel title="Evolução" className="rise lg:col-span-5">
        {f.loading ? <Skeleton className="h-[180px]" /> : <BalanceLine values={series.map((s) => s.value)} labels={series.map((s) => s.label)} labelPrefix="" />}
      </Panel>
    </div>
  );
}

/* ------------------------------------------------------------------ Metas */

function monthsUntil(deadline: string): number {
  const t = parseISO(todayISO());
  const d = parseISO(deadline);
  return (d.y - t.y) * 12 + (d.m - t.m);
}

function useGoalStats() {
  const f = useFinance();
  return (g: Goal) => {
    const saved = f.goalDeposits.filter((d) => d.goal_id === g.id).reduce((s, d) => s + d.amount_cents, 0);
    const pct = g.target_cents > 0 ? Math.round((saved / g.target_cents) * 100) : 0;
    const remaining = Math.max(0, g.target_cents - saved);
    let perMonth: number | null = null;
    let late = false;
    if (g.deadline && remaining > 0) {
      const left = monthsUntil(g.deadline);
      if (left < 0) late = true;
      else perMonth = Math.ceil(remaining / Math.max(1, left));
    }
    return { saved, pct, remaining, perMonth, late };
  };
}

export function GoalsView() {
  const f = useFinance();
  const stats = useGoalStats();
  const [form, setForm] = useState<{ goal?: Goal } | null>(null);
  const [detail, setDetail] = useState<string | null>(null);

  const budgetRows = f.budgets
    .map((b) => {
      const c = f.categoryById(b.category_id);
      const spent = f.monthTx.filter((x) => x.kind === "despesa" && x.category_id === b.category_id).reduce((n, x) => n + x.amount_cents, 0);
      return { id: b.id, name: c?.name ?? "Categoria", color: c?.color ?? "#8b8b93", limit: b.limit_cents, spent, pct: Math.round((spent / b.limit_cents) * 100) };
    })
    .sort((a, b) => b.pct - a.pct);

  if (f.goalsError) {
    return (
      <div className="card flex gap-3 p-5 text-sm">
        <WarningCircle size={22} className="mt-0.5 shrink-0 text-expense" />
        <div className="min-w-0">
          <p className="font-medium">Não foi possível carregar as metas</p>
          <p className="mt-1 break-words text-muted">As tabelas de metas ainda precisam ser criadas no Supabase (rode o SQL novo). Detalhe: {f.goalsError}</p>
        </div>
      </div>
    );
  }

  const open = f.goals.find((g) => g.id === detail) ?? null;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3 px-1">
        <h2 className="text-[19px] font-semibold">Metas de economia</h2>
        <Button variant="primary" className="h-11 px-4 text-sm" onClick={() => setForm({})}>
          <Plus size={16} weight="bold" /> Nova meta
        </Button>
      </div>

      {f.loading ? (
        <Skeleton className="h-[120px]" />
      ) : f.goals.length === 0 ? (
        <div className="card">
          <Empty
            title="Nenhuma meta ainda"
            text="Defina um valor para guardar, como uma viagem ou uma reserva, e acompanhe o progresso."
            action={
              <Button variant="primary" onClick={() => setForm({})}>
                Criar meta
              </Button>
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">
          {f.goals.map((g, n) => {
            const s = stats(g);
            const done = s.pct >= 100;
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => setDetail(g.id)}
                style={{ "--i": Math.min(n, 8) } as CSSProperties}
                className="card rise flex w-full flex-col gap-3 p-5 text-left transition-colors hover:bg-surface-2 active:bg-surface-2"
              >
                <span className="flex items-center gap-3">
                  <span className="cat-glyph inline-flex size-11 shrink-0 items-center justify-center" style={{ "--c": g.color } as CSSProperties}>
                    <Target size={20} weight="bold" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[16px] font-medium">{g.name}</span>
                    <span className="block truncate text-[13px] text-muted">
                      {g.deadline ? `até ${shortDate(g.deadline)}` : "Sem prazo"}
                    </span>
                  </span>
                  <span className={`num text-[15px] font-semibold ${done ? "text-income" : ""}`}>{s.pct}%</span>
                </span>
                <span className="h-2.5 overflow-hidden rounded-full bg-white/[0.07]" role="progressbar" aria-valuenow={Math.min(100, s.pct)} aria-valuemin={0} aria-valuemax={100} aria-label={`${g.name}: ${s.pct}%`}>
                  <span className="grow-x block h-full rounded-full" style={{ width: `${Math.min(100, Math.max(0, s.pct))}%`, background: done ? "var(--income)" : g.color }} />
                </span>
                <span className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-[13px] text-muted">
                  <span className="num">
                    {money(s.saved)} de {money(g.target_cents)}
                  </span>
                  <span className={s.late ? "text-expense" : ""}>
                    {done ? "Meta concluída" : s.late ? "Prazo vencido" : s.perMonth !== null ? `${money(s.perMonth)} por mês` : `Faltam ${money(s.remaining)}`}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}

      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between gap-3 px-1">
          <h2 className="text-[19px] font-semibold">Limites por categoria</h2>
          <Link href="/contas" className="text-[14px] font-medium text-accent-text">
            Editar
          </Link>
        </div>
        {f.loading ? (
          <Skeleton className="h-[120px]" />
        ) : budgetRows.length === 0 ? (
          <div className="card">
            <Empty title="Sem limites" text="Em Contas, abra uma categoria de gasto e defina o limite mensal." />
          </div>
        ) : (
          <div className="card p-5 sm:p-6">
            <ul className="grid grid-cols-1 gap-x-8 gap-y-5 lg:grid-cols-2">
              {budgetRows.map((r) => (
                <li key={r.id}>
                  <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-[14px]">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="size-2.5 shrink-0 rounded-full" style={{ background: r.color }} />
                      <span className="truncate font-medium">{r.name}</span>
                    </span>
                    <span className={`num ${r.pct >= 100 ? "text-expense" : "text-muted"}`}>
                      {money(r.spent)} de {money(r.limit)}
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-white/[0.07]" role="progressbar" aria-valuenow={Math.min(100, r.pct)} aria-valuemin={0} aria-valuemax={100} aria-label={`${r.name}: ${r.pct}% do limite`}>
                    <div className="grow-x h-full rounded-full" style={{ width: `${Math.min(100, r.pct)}%`, background: r.pct >= 100 ? "var(--expense)" : r.pct >= 80 ? "var(--warn)" : "var(--accent)" }} />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <GoalFormSheet state={form} onClose={() => setForm(null)} />
      <GoalDetailSheet goal={open} onClose={() => setDetail(null)} onEdit={(g) => { setDetail(null); setForm({ goal: g }); }} />
    </div>
  );
}

function GoalFormSheet({ state, onClose }: { state: { goal?: Goal } | null; onClose: () => void }) {
  const f = useFinance();
  const [prev, setPrev] = useState(state);
  const [name, setName] = useState("");
  const [cents, setCents] = useState(0);
  const [deadline, setDeadline] = useState("");
  const [color, setColor] = useState(PALETTE[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (state !== prev) {
    setPrev(state);
    const g = state?.goal;
    setName(g?.name ?? "");
    setCents(g?.target_cents ?? 0);
    setDeadline(g?.deadline ?? "");
    setColor(g?.color ?? PALETTE[0]);
    setBusy(false);
    setError(null);
  }
  if (!state) return null;
  const g = state.goal;

  async function save() {
    if (!name.trim()) return setError("Dê um nome à meta.");
    if (cents <= 0) return setError("Informe o valor da meta.");
    setBusy(true);
    try {
      await f.saveGoal({ id: g?.id, name: name.trim(), target_cents: cents, deadline: deadline || null, color });
      showToast(g ? "Meta atualizada" : "Meta criada");
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível salvar.");
      setBusy(false);
    }
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={g ? "Editar meta" : "Nova meta"}
      footer={
        <div className="flex flex-col gap-3">
          {error && <p role="alert" className="text-sm text-expense">{error}</p>}
          <Button variant="primary" onClick={save} disabled={busy}>
            {busy ? "Salvando..." : g ? "Salvar" : "Criar meta"}
          </Button>
        </div>
      }
    >
      <form className="flex flex-col gap-5" onSubmit={(e) => { e.preventDefault(); void save(); }}>
        <div className="flex flex-col items-center gap-1 py-2">
          <label htmlFor="meta-valor" className="text-[13px] font-medium text-muted">Valor da meta</label>
          <input
            id="meta-valor"
            inputMode="numeric"
            autoComplete="off"
            value={moneyPlain(cents)}
            onChange={(e) => setCents(Number(e.target.value.replace(/\D/g, "").slice(0, 11) || "0"))}
            className="num font-display w-full bg-transparent text-center text-[44px] font-semibold leading-tight outline-none"
          />
        </div>
        <Field label="Nome" htmlFor="meta-nome">
          <input id="meta-nome" className={inputClass} value={name} placeholder="Ex.: Viagem, Reserva de emergência" onChange={(e) => setName(e.target.value)} autoComplete="off" />
        </Field>
        <Field label="Prazo (opcional)" htmlFor="meta-prazo">
          <div className="flex items-center gap-2">
            <input id="meta-prazo" type="date" className={`${inputClass} min-w-0 flex-1`} value={deadline} min={todayISO()} onChange={(e) => setDeadline(e.target.value)} />
            {deadline && (
              <Button type="button" className="h-12 shrink-0 px-4 text-sm" onClick={() => setDeadline("")}>
                Limpar
              </Button>
            )}
          </div>
        </Field>
        <Field label="Cor">
          <div className="flex flex-wrap gap-2">
            {PALETTE.map((c) => (
              <Chip key={c} active={color === c} color={c} onClick={() => setColor(c)}>
                {" "}
              </Chip>
            ))}
          </div>
        </Field>
        <button type="submit" hidden />
      </form>
    </Sheet>
  );
}

function GoalDetailSheet({ goal, onClose, onEdit }: { goal: Goal | null; onClose: () => void; onEdit: (g: Goal) => void }) {
  const f = useFinance();
  const stats = useGoalStats();
  const [cents, setCents] = useState(0);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prev, setPrev] = useState<string | null>(null);
  if ((goal?.id ?? null) !== prev) {
    setPrev(goal?.id ?? null);
    setCents(0);
    setConfirm(false);
    setError(null);
    setBusy(false);
  }
  if (!goal) return null;
  const g = goal;
  const s = stats(g);
  const deposits = f.goalDeposits.filter((d) => d.goal_id === g.id).sort((a, b) => b.date.localeCompare(a.date));

  async function add(sign: 1 | -1) {
    if (cents <= 0) return setError("Informe um valor.");
    if (sign < 0 && cents > s.saved) return setError("Você não tem tudo isso guardado nesta meta.");
    setBusy(true);
    try {
      await f.addGoalDeposit({ goal_id: g.id, amount_cents: sign * cents, date: todayISO() });
      showToast(sign > 0 ? "Valor guardado" : "Retirada registrada");
      setCents(0);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível salvar.");
    }
    setBusy(false);
  }
  async function removeGoal() {
    onClose();
    try {
      await f.deleteGoal(g.id);
      showToast("Meta excluída");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Não foi possível excluir.");
    }
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={g.name}
      footer={
        confirm ? (
          <div className="flex gap-2">
            <Button className="flex-1" onClick={() => setConfirm(false)}>Cancelar</Button>
            <Button variant="danger" className="flex-1" onClick={removeGoal}>Excluir meta</Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button variant="danger" aria-label="Excluir meta" className="w-12 px-0" onClick={() => setConfirm(true)}>
              <Trash size={18} weight="bold" />
            </Button>
            <Button className="flex-1" onClick={() => onEdit(g)}>Editar meta</Button>
          </div>
        )
      }
    >
      <div className="flex flex-col gap-5">
        <div>
          <BigMoney cents={s.saved} className="text-[36px] leading-none" />
          <p className="mt-2 text-[14px] text-muted">
            de {money(g.target_cents)} ({s.pct}%){g.deadline ? ` até ${shortDate(g.deadline)}` : ""}
          </p>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/[0.07]">
            <div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.max(0, s.pct))}%`, background: s.pct >= 100 ? "var(--income)" : g.color }} />
          </div>
          <p className={`mt-3 text-[14px] ${s.late ? "text-expense" : "text-muted"}`}>
            {s.pct >= 100 ? "Meta concluída." : s.late ? `Prazo vencido. Faltam ${money(s.remaining)}.` : s.perMonth !== null ? `Guarde ${money(s.perMonth)} por mês para chegar a tempo.` : `Faltam ${money(s.remaining)}.`}
          </p>
        </div>

        <Field label="Guardar ou retirar" htmlFor="aporte">
          <input
            id="aporte"
            inputMode="numeric"
            autoComplete="off"
            className={`${inputClass} num`}
            value={moneyPlain(cents)}
            onChange={(e) => setCents(Number(e.target.value.replace(/\D/g, "").slice(0, 11) || "0"))}
          />
        </Field>
        {error && <p role="alert" className="-mt-2 text-sm text-expense">{error}</p>}
        <div className="grid grid-cols-2 gap-2">
          <Button variant="primary" onClick={() => add(1)} disabled={busy}>Guardar</Button>
          <Button onClick={() => add(-1)} disabled={busy}>Retirar</Button>
        </div>
        <p className="-mt-2 text-[13px] text-muted">Os aportes são só um registro da meta e não mexem no saldo das contas.</p>

        {deposits.length > 0 && (
          <div>
            <h3 className="mb-2 text-[14px] font-medium text-muted">Histórico</h3>
            <ul className="divide-y divide-line">
              {deposits.map((d) => (
                <li key={d.id} className="flex items-center gap-3 py-2.5 text-[15px]">
                  <span className="min-w-0 flex-1 truncate text-muted">{dayLabel(d.date)}</span>
                  <span className={`num whitespace-nowrap font-medium ${d.amount_cents < 0 ? "text-expense" : "text-income"}`}>
                    {d.amount_cents < 0 ? "-" : "+"} {money(Math.abs(d.amount_cents))}
                  </span>
                  <button
                    type="button"
                    aria-label="Apagar aporte"
                    className="inline-flex size-9 shrink-0 items-center justify-center rounded-ctl text-muted hover:text-fg"
                    onClick={() => void f.deleteGoalDeposit(d.id)}
                  >
                    <Trash size={16} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Sheet>
  );
}
