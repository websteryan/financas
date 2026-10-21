"use client";

import { useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { ArrowsLeftRight, CaretDown, CaretUp, SlidersHorizontal, CloudSlash, DotsSixVertical, DownloadSimple, PencilSimple, Plus, SignOut } from "@/components/icons";
import { AdjustSheet, TransferSheet } from "@/components/AccountActions";
import { PageHeader, Panel } from "@/components/PageHeader";
import { AccountGlyph, Button, CategoryGlyph, Field, IconButton, Segmented, Sheet, Skeleton, inputClass, showToast } from "@/components/ui";
import { CATEGORY_ICONS, iconKeyFor } from "@/lib/category-icons";
import { money, moneyPlain } from "@/lib/format";
import { THEMES, getTheme, setTheme, type Theme } from "@/lib/theme";
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
  const [adjustFor, setAdjustFor] = useState<Account | null>(null);
  const [transferFor, setTransferFor] = useState<Account | null>(null);
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
                      className="inline-flex h-11 items-center gap-2.5 rounded-ctl border border-line bg-surface pl-1.5 pr-4 text-sm text-fg transition-colors hover:bg-surface-2"
                    >
                      <CategoryGlyph category={c} size={32} />
                      {c.name}
                    </button>
                  ))}
              </div>
            </div>
          ))}
        </Panel>

        <Panel title="Aparência" className="lg:col-span-2">
          <ThemePanel />
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

      <AccountSheet
        draft={accDraft}
        onClose={() => setAccDraft(null)}
        onAdjust={(a) => {
          setAccDraft(null);
          setAdjustFor(a);
        }}
        onTransfer={(a) => {
          setAccDraft(null);
          setTransferFor(a);
        }}
      />
      <AdjustSheet account={adjustFor} onClose={() => setAdjustFor(null)} />
      <TransferSheet account={transferFor} onClose={() => setTransferFor(null)} />
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

function IconPicker({ category, value, onChange }: { category: { name: string; color: string }; value: string; onChange: (k: string) => void }) {
  return (
    <div className="grid grid-cols-6 gap-2 sm:grid-cols-8">
      {CATEGORY_ICONS.map(({ key, label, Icon }) => {
        const on = key === value;
        return (
          <button
            key={key}
            type="button"
            title={label}
            aria-label={label}
            aria-pressed={on}
            onClick={() => onChange(key)}
            className={`flex aspect-square items-center justify-center rounded-[12px] border transition-[background-color,border-color,transform] active:scale-90 ${on ? "border-accent-text bg-accent-soft text-fg" : "border-line text-muted hover:bg-surface-2 hover:text-fg"}`}
            style={on ? { color: category.color } : undefined}
          >
            <Icon size={20} weight={on ? "fill" : "regular"} />
          </button>
        );
      })}
    </div>
  );
}

function ThemePanel() {
  const [theme, set] = useState<Theme>("minimal");
  useLayoutEffect(() => set(getTheme()), []);
  return (
    <div className="grid grid-cols-2 gap-3">
      {THEMES.map((t) => {
        const on = theme === t.value;
        return (
          <button
            key={t.value}
            type="button"
            aria-pressed={on}
            onClick={() => {
              setTheme(t.value);
              set(t.value);
            }}
            className={`rounded-[16px] border p-3.5 text-left transition-colors ${on ? "border-accent-text bg-accent-soft" : "border-line hover:bg-surface-2"}`}
          >
            <span
              className="mb-3 flex h-14 items-end gap-1 rounded-[10px] p-2"
              style={{ background: t.value === "minimal" ? "#000" : "#07050c", border: t.value === "minimal" ? "1px solid rgb(255 255 255/.12)" : "1px solid rgb(190 170 255/.14)" }}
            >
              {[40, 70, 52, 90].map((h, i) => (
                <span key={i} className="flex-1" style={{ height: `${h}%`, borderRadius: t.value === "minimal" ? 3 : 99, background: t.value === "minimal" ? (i === 3 ? "#8467f0" : "#3a3a3d") : i === 3 ? "linear-gradient(#6b3de0,#4f27b5)" : "#2a1f4d" }} />
              ))}
            </span>
            <span className="block text-[15px] font-medium text-fg">{t.label}</span>
            <span className="block text-[12.5px] text-muted">{t.hint}</span>
          </button>
        );
      })}
    </div>
  );
}

function AccountSheet({ draft, onClose, onAdjust, onTransfer }: { draft: AccountDraft | null; onClose: () => void; onAdjust: (a: Account) => void; onTransfer: (a: Account) => void }) {
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
        {form.id && (
          <div className="grid grid-cols-2 gap-2">
            <Button className="h-11 text-[14px]" onClick={() => onTransfer(form as Account)}>
              <ArrowsLeftRight size={17} weight="bold" /> Transferir
            </Button>
            <Button className="h-11 text-[14px]" onClick={() => onAdjust(form as Account)}>
              <SlidersHorizontal size={17} weight="bold" /> Ajustar saldo
            </Button>
          </div>
        )}
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
        <Field label="Ícone">
          <IconPicker
            category={form}
            value={iconKeyFor(form)}
            onChange={(icon) => setForm({ ...form, icon })}
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
              value={moneyPlain(limit)}
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
        <div className="flex items-center gap-1.5">
          {f.accounts.length > 1 &&
            (editing ? (
              <Button variant="primary" className="h-10 px-4 text-sm" onClick={finish} disabled={saving}>
                {saving ? "Salvando..." : "Concluir"}
              </Button>
            ) : (
              <Button className="h-9 px-3 text-[13px]" onClick={start}>
                Reordenar
              </Button>
            ))}
          {!editing && (
            <Button className="h-9 px-3 text-[13px]" onClick={onNew}>
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
                            <span className={`num block text-[15px] font-medium ${f.balanceOf(a.id) < 0 ? "text-expense" : ""}`}>{money(f.balanceOf(a.id))}</span>
                            <span className="block text-[12px] text-muted">saldo</span>
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
