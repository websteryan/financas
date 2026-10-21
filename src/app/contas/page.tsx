"use client";

import { useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { CaretDown, CaretUp, CloudSlash, DotsSixVertical, DownloadSimple, PencilSimple, Plus, SignOut } from "@/components/icons";
import { PageHeader, Panel } from "@/components/PageHeader";
import { AccountGlyph, Button, Field, IconButton, Segmented, Sheet, Skeleton, inputClass, showToast } from "@/components/ui";
import { money } from "@/lib/format";
import { repo } from "@/lib/repo";
import { useFinance } from "@/lib/store";
import { isCloud } from "@/lib/supabase/config";
import { PAYMENT_LABEL, PALETTE, methodOf, type Account, type Category, type Kind } from "@/lib/types";

type AccountDraft = Omit<Account, "id"> & { id?: string };
type CategoryDraft = Omit<Category, "id"> & { id?: string };

export default function ContasPage() {
  const f = useFinance();
  const [accDraft, setAccDraft] = useState<AccountDraft | null>(null);
  const [catDraft, setCatDraft] = useState<CategoryDraft | null>(null);
  const [exporting, setExporting] = useState(false);

  const countBy = new Map<string, number>();
  for (const t of f.monthTx) countBy.set(t.account_id, (countBy.get(t.account_id) ?? 0) + 1);
  const spentBy = new Map<string, number>();
  for (const t of f.monthTx) if (t.kind === "despesa") spentBy.set(t.account_id, (spentBy.get(t.account_id) ?? 0) + t.amount_cents);

  async function exportCsv() {
    setExporting(true);
    try {
      const all = await repo.listAllTransactions();
      const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
      const lines = [
        ["Data", "Tipo", "Descrição", "Categoria", "Conta", "Forma", "Parcela", "Valor"].join(";"),
        ...all.map((t) =>
          [
            t.date.split("-").reverse().join("/"),
            t.kind === "despesa" ? "Gasto" : "Receita",
            esc(t.description),
            esc(f.categoryById(t.category_id)?.name ?? ""),
            esc(f.accountById(t.account_id)?.name ?? ""),
            t.kind === "despesa" ? PAYMENT_LABEL[methodOf(t, f.accountById(t.account_id))] : "",
            t.installments ? `${t.installment}/${t.installments}` : "",
            ((t.kind === "despesa" ? -1 : 1) * t.amount_cents / 100).toFixed(2).replace(".", ","),
          ].join(";"),
        ),
      ];
      const blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "financas.csv";
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  async function signOut() {
    await repo.signOut();
    window.location.href = isCloud ? "/login" : "/";
  }

  return (
    <div className="fade-in">
      <PageHeader title="Contas" month={false} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">
        <AccountsPanel spentBy={spentBy} countBy={countBy} onEdit={setAccDraft} onNew={() => setAccDraft({ name: "", type: "debito", color: PALETTE[0] })} />

        <Panel
          title="Categorias"
          action={
            <Button className="h-10 px-4 text-sm" onClick={() => setCatDraft({ name: "", kind: "despesa", color: PALETTE[6] })}>
              <Plus size={16} weight="bold" /> Nova
            </Button>
          }
        >
          {(["despesa", "receita"] as Kind[]).map((k) => (
            <div key={k} className="mb-4 last:mb-0">
              <p className="mb-2 text-[13px] font-medium text-muted">{k === "despesa" ? "Gastos" : "Receitas"}</p>
              <div className="flex flex-wrap gap-2">
                {f.categories
                  .filter((c) => c.kind === k)
                  .map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCatDraft(c)}
                      className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-surface px-4 text-sm text-fg transition-colors hover:bg-surface-2"
                    >
                      <span className="size-2 rounded-full" style={{ background: c.color }} />
                      {c.name}
                    </button>
                  ))}
              </div>
            </div>
          ))}
        </Panel>

        <Panel title="Dados" className="lg:col-span-2">
          {!isCloud && (
            <div className="mb-5 flex gap-3 rounded-[20px] bg-accent-soft p-4 text-sm">
              <CloudSlash size={20} className="mt-0.5 shrink-0 text-accent-text" />
              <div>
                <p className="font-medium text-fg">Modo demonstração</p>
                <p className="mt-1 text-muted">
                  Os dados ficam só neste navegador. Para sincronizar iPhone e computador, configure as variáveis do Supabase
                  (veja o README do projeto).
                </p>
              </div>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Button onClick={exportCsv} disabled={exporting}>
              <DownloadSimple size={18} /> {exporting ? "Exportando..." : "Exportar planilha (CSV)"}
            </Button>
            <Button variant="ghost" onClick={signOut}>
              <SignOut size={18} /> {isCloud ? "Sair" : "Apagar dados de demonstração"}
            </Button>
          </div>
        </Panel>
      </div>

      <AccountSheet draft={accDraft} onClose={() => setAccDraft(null)} />
      <CategorySheet draft={catDraft} onClose={() => setCatDraft(null)} />
    </div>
  );
}

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2.5">
      {PALETTE.map((c) => (
        <button
          key={c}
          type="button"
          aria-label={`Cor ${c}`}
          aria-pressed={value === c}
          onClick={() => onChange(c)}
          className="size-8 rounded-full transition-transform active:scale-90"
          style={{ background: c, boxShadow: value === c ? `0 0 0 2px var(--sheet), 0 0 0 4px ${c}` : undefined }}
        />
      ))}
    </div>
  );
}

function AccountSheet({ draft, onClose }: { draft: AccountDraft | null; onClose: () => void }) {
  const f = useFinance();
  const [form, setForm] = useState<AccountDraft | null>(draft);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [prev, setPrev] = useState(draft);
  if (draft !== prev) {
    setPrev(draft);
    setForm(draft);
    setConfirm(false);
  }
  if (!form) return null;

  async function save() {
    if (!form || !form.name.trim()) return;
    setBusy(true);
    await f.saveAccount({ ...form, name: form.name.trim() });
    setBusy(false);
    onClose();
  }
  async function remove() {
    if (!form?.id) return;
    setBusy(true);
    await f.deleteAccount(form.id);
    setBusy(false);
    onClose();
  }

  return (
    <Sheet
      open={Boolean(draft)}
      onClose={onClose}
      title={form.id ? "Editar conta" : "Nova conta"}
      footer={
        confirm ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted">Isso apaga a conta e todos os lançamentos dela.</p>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={() => setConfirm(false)}>
                Cancelar
              </Button>
              <Button variant="danger" className="flex-1" onClick={remove} disabled={busy}>
                Excluir conta
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            {form.id && (
              <Button variant="danger" onClick={() => setConfirm(true)}>
                Excluir
              </Button>
            )}
            <Button variant="primary" className="flex-1" onClick={save} disabled={busy || !form.name.trim()}>
              Salvar
            </Button>
          </div>
        )
      }
    >
      <form
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <Field label="Nome" htmlFor="conta-nome">
          <input
            id="conta-nome"
            className={inputClass}
            value={form.name}
            placeholder="Ex.: Nubank, Itaú, Carteira"
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </Field>
        <Field label="Cor">
          <ColorPicker value={form.color} onChange={(color) => setForm({ ...form, color })} />
        </Field>
        <div className="flex items-center gap-3 rounded-[20px] bg-surface-2 p-3">
          <AccountGlyph color={form.color} />
          <span className="text-[15px] font-medium">{form.name || "Nome da conta"}</span>
        </div>
        <button type="submit" hidden />
      </form>
    </Sheet>
  );
}

function CategorySheet({ draft, onClose }: { draft: CategoryDraft | null; onClose: () => void }) {
  const f = useFinance();
  const [form, setForm] = useState<CategoryDraft | null>(draft);
  const [busy, setBusy] = useState(false);
  const [limit, setLimit] = useState(0);
  const [prev, setPrev] = useState(draft);
  if (draft !== prev) {
    setPrev(draft);
    setForm(draft);
    setLimit(f.budgets.find((b) => b.category_id === draft?.id)?.limit_cents ?? 0);
  }
  const canBudget = Boolean(form?.id) && form?.kind === "despesa" && !f.budgetsError;
  if (!form) return null;

  async function save() {
    if (!form || !form.name.trim()) return;
    setBusy(true);
    await f.saveCategory({ ...form, name: form.name.trim() });
    if (canBudget && form.id) {
      if (limit > 0) await f.saveBudget({ category_id: form.id, limit_cents: limit });
      else if (f.budgets.some((b) => b.category_id === form.id)) await f.deleteBudget(form.id);
    }
    setBusy(false);
    onClose();
  }
  async function remove() {
    if (!form?.id) return;
    setBusy(true);
    await f.deleteCategory(form.id);
    setBusy(false);
    onClose();
  }

  return (
    <Sheet
      open={Boolean(draft)}
      onClose={onClose}
      title={form.id ? "Editar categoria" : "Nova categoria"}
      footer={
        <div className="flex gap-2">
          {form.id && (
            <Button variant="danger" onClick={remove} disabled={busy}>
              Excluir
            </Button>
          )}
          <Button variant="primary" className="flex-1" onClick={save} disabled={busy || !form.name.trim()}>
            Salvar
          </Button>
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
        <Field label="Nome" htmlFor="cat-nome">
          <input
            id="cat-nome"
            className={inputClass}
            value={form.name}
            placeholder="Ex.: Pets, Viagens"
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </Field>
        <Field label="Tipo">
          <Segmented<Kind>
            value={form.kind}
            onChange={(kind) => setForm({ ...form, kind })}
            options={[
              { value: "despesa", label: "Gasto" },
              { value: "receita", label: "Receita" },
            ]}
          />
        </Field>
        <Field label="Cor">
          <ColorPicker value={form.color} onChange={(color) => setForm({ ...form, color })} />
        </Field>
        {canBudget && (
          <Field label="Limite mensal (opcional)" htmlFor="cat-limite" hint="Mostra no Resumo quanto do limite já foi usado. Deixe zerado para não usar.">
            <input
              id="cat-limite"
              inputMode="numeric"
              autoComplete="off"
              className={`${inputClass} num`}
              value={money(limit)}
              onChange={(e) => setLimit(Number(e.target.value.replace(/\D/g, "").slice(0, 10) || "0"))}
            />
          </Field>
        )}
        <button type="submit" hidden />
      </form>
    </Sheet>
  );
}

function AccountsPanel({ spentBy, countBy, onEdit, onNew }: { spentBy: Map<string, number>; countBy: Map<string, number>; onEdit: (a: Account) => void; onNew: () => void }) {
  const f = useFinance();
  const [editing, setEditing] = useState(false);
  const [order, setOrder] = useState<string[]>([]);
  const [dragId, setDragId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const items = useRef(new Map<string, HTMLLIElement>());
  const tops = useRef(new Map<string, number>());

  const byId = new Map(f.accounts.map((a) => [a.id, a]));
  const ids = editing ? order.filter((id) => byId.has(id)) : f.accounts.map((a) => a.id);
  const list = ids.map((id) => byId.get(id)!).filter(Boolean);

  // FLIP: quando a ordem muda, as linhas deslizam da posição antiga para a nova
  useLayoutEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    items.current.forEach((el, id) => {
      const top = el.getBoundingClientRect().top;
      const prev = tops.current.get(id);
      if (!reduce && prev !== undefined && Math.abs(prev - top) > 1 && id !== dragId) {
        el.style.transition = "none";
        el.style.transform = `translateY(${prev - top}px)`;
        void el.offsetHeight;
        el.style.transition = "transform 280ms cubic-bezier(0.16, 1, 0.3, 1)";
        el.style.transform = "";
      }
      tops.current.set(id, top);
    });
  });

  function start() {
    setOrder(f.accounts.map((a) => a.id));
    tops.current.clear();
    setEditing(true);
  }
  async function finish() {
    const changed = order.join() !== f.accounts.map((a) => a.id).join();
    if (changed) {
      setSaving(true);
      try {
        await f.reorderAccounts(order);
        showToast("Ordem salva");
      } catch (e) {
        showToast(e instanceof Error ? e.message : "Não foi possível salvar a ordem.");
      }
      setSaving(false);
    }
    setEditing(false);
  }
  function move(id: string, to: number) {
    setOrder((o) => {
      const from = o.indexOf(id);
      if (from < 0 || to < 0 || to >= o.length || from === to) return o;
      const next = [...o];
      next.splice(from, 1);
      next.splice(to, 0, id);
      return next;
    });
  }
  function dragMove(e: ReactPointerEvent) {
    if (!dragId) return;
    // posição alvo = quantas outras linhas têm o centro acima do ponteiro
    let target = 0;
    for (const id of order) {
      if (id === dragId) continue;
      const el = items.current.get(id);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (e.clientY > r.top + r.height / 2) target++;
    }
    move(dragId, target);
  }

  return (
    <Panel
      title="Suas contas"
      action={
        <div className="flex items-center gap-2">
          {f.accounts.length > 1 &&
            (editing ? (
              <Button variant="primary" className="h-10 px-4 text-sm" onClick={finish} disabled={saving}>
                {saving ? "Salvando..." : "Concluir"}
              </Button>
            ) : (
              <Button className="h-10 px-3.5 text-sm" onClick={start}>
                Reordenar
              </Button>
            ))}
          {!editing && (
            <Button className="h-10 px-3.5 text-sm" onClick={onNew}>
              <Plus size={16} weight="bold" /> Nova
            </Button>
          )}
        </div>
      }
    >
      {f.loading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </div>
      ) : list.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">Crie uma conta para começar a lançar.</p>
      ) : (
        <>
          {editing && <p className="mb-2 text-[13px] text-muted">Arraste pela alça ou use as setas. Toque em Concluir para salvar.</p>}
          <ul className="-mx-2 flex flex-col">
            {list.map((a, i) => {
              const dragging = dragId === a.id;
              return (
                <li
                  key={a.id}
                  ref={(el) => {
                    if (el) items.current.set(a.id, el);
                    else items.current.delete(a.id);
                  }}
                  className={`relative rounded-[20px] transition-[background-color,box-shadow] duration-200 ${dragging ? "z-10 bg-surface-3 shadow-[0_12px_32px_rgb(0_0_0/0.5)]" : ""}`}
                >
                  <div className="flex w-full items-center gap-3 rounded-[20px] px-2 py-2.5">
                    {editing && (
                      <span
                        role="button"
                        aria-label={`Arrastar ${a.name}`}
                        className="-ml-1 inline-flex size-9 shrink-0 cursor-grab touch-none items-center justify-center rounded-full text-muted active:cursor-grabbing"
                        onPointerDown={(e) => {
                          e.currentTarget.setPointerCapture(e.pointerId);
                          setDragId(a.id);
                        }}
                        onPointerMove={dragMove}
                        onPointerUp={() => setDragId(null)}
                        onPointerCancel={() => setDragId(null)}
                      >
                        <DotsSixVertical size={20} weight="bold" />
                      </span>
                    )}
                    <button
                      type="button"
                      disabled={editing}
                      onClick={() => onEdit(a)}
                      className={`flex min-w-0 flex-1 items-center gap-3 rounded-[16px] text-left transition-colors ${editing ? "" : "hover:bg-surface-2"}`}
                    >
                      <AccountGlyph color={a.color} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-medium">{a.name}</span>
                        <span className="block truncate text-[13px] text-muted">{countBy.get(a.id) ?? 0} {(countBy.get(a.id) ?? 0) === 1 ? "lançamento" : "lançamentos"}</span>
                      </span>
                      {!editing && (
                        <>
                          <span className="text-right">
                            <span className="num block text-[15px] font-medium">{money(spentBy.get(a.id) ?? 0)}</span>
                            <span className="block text-[12px] text-muted">gasto no mês</span>
                          </span>
                          <PencilSimple size={16} className="ml-1 text-muted" />
                        </>
                      )}
                    </button>
                    {editing && (
                      <span className="flex shrink-0 gap-1">
                        <IconButton label={`Subir ${a.name}`} className="size-9" disabled={i === 0} onClick={() => move(a.id, i - 1)}>
                          <CaretUp size={16} weight="bold" />
                        </IconButton>
                        <IconButton label={`Descer ${a.name}`} className="size-9" disabled={i === list.length - 1} onClick={() => move(a.id, i + 1)}>
                          <CaretDown size={16} weight="bold" />
                        </IconButton>
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </Panel>
  );
}
