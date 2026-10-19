"use client";

import { useState } from "react";
import { CloudSlash, DownloadSimple, PencilSimple, Plus, SignOut } from "@/components/icons";
import { PageHeader, Panel } from "@/components/PageHeader";
import { AccountGlyph, Button, Field, Segmented, Sheet, Skeleton, inputClass } from "@/components/ui";
import { money } from "@/lib/format";
import { repo } from "@/lib/repo";
import { useFinance } from "@/lib/store";
import { isCloud } from "@/lib/supabase/config";
import { ACCOUNT_TYPE_LABEL, PALETTE, type Account, type AccountType, type Category, type Kind } from "@/lib/types";

type AccountDraft = Omit<Account, "id"> & { id?: string };
type CategoryDraft = Omit<Category, "id"> & { id?: string };

export default function ContasPage() {
  const f = useFinance();
  const [accDraft, setAccDraft] = useState<AccountDraft | null>(null);
  const [catDraft, setCatDraft] = useState<CategoryDraft | null>(null);
  const [exporting, setExporting] = useState(false);

  const spentBy = new Map<string, number>();
  for (const t of f.monthTx) if (t.kind === "despesa") spentBy.set(t.account_id, (spentBy.get(t.account_id) ?? 0) + t.amount_cents);

  async function exportCsv() {
    setExporting(true);
    try {
      const all = await repo.listAllTransactions();
      const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
      const lines = [
        ["Data", "Tipo", "Descrição", "Categoria", "Conta", "Parcela", "Valor"].join(";"),
        ...all.map((t) =>
          [
            t.date.split("-").reverse().join("/"),
            t.kind === "despesa" ? "Gasto" : "Receita",
            esc(t.description),
            esc(f.categoryById(t.category_id)?.name ?? ""),
            esc(f.accountById(t.account_id)?.name ?? ""),
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
        <Panel
          title="Suas contas"
          action={
            <Button className="h-10 px-4 text-sm" onClick={() => setAccDraft({ name: "", type: "credito", color: PALETTE[0] })}>
              <Plus size={16} weight="bold" /> Nova
            </Button>
          }
        >
          {f.loading ? (
            <div className="flex flex-col gap-3">
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
          ) : f.accounts.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">Crie uma conta para começar a lançar.</p>
          ) : (
            <ul className="-mx-2 flex flex-col">
              {f.accounts.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => setAccDraft(a)}
                    className="flex w-full items-center gap-3 rounded-[20px] px-2 py-2.5 text-left transition-colors hover:bg-surface-2"
                  >
                    <AccountGlyph type={a.type} color={a.color} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-medium">{a.name}</span>
                      <span className="block text-[13px] text-muted">{ACCOUNT_TYPE_LABEL[a.type]}</span>
                    </span>
                    <span className="text-right">
                      <span className="num block text-[15px] font-medium">{money(spentBy.get(a.id) ?? 0)}</span>
                      <span className="block text-[12px] text-muted">gasto no mês</span>
                    </span>
                    <PencilSimple size={16} className="ml-1 text-muted" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>

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
        <Field label="Tipo">
          <Segmented<AccountType>
            value={form.type}
            onChange={(type) => setForm({ ...form, type })}
            options={(Object.keys(ACCOUNT_TYPE_LABEL) as AccountType[]).map((v) => ({ value: v, label: ACCOUNT_TYPE_LABEL[v] }))}
          />
        </Field>
        <Field label="Cor">
          <ColorPicker value={form.color} onChange={(color) => setForm({ ...form, color })} />
        </Field>
        <div className="flex items-center gap-3 rounded-[20px] bg-surface-2 p-3">
          <AccountGlyph type={form.type} color={form.color} />
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
  const [prev, setPrev] = useState(draft);
  if (draft !== prev) {
    setPrev(draft);
    setForm(draft);
  }
  if (!form) return null;

  async function save() {
    if (!form || !form.name.trim()) return;
    setBusy(true);
    await f.saveCategory({ ...form, name: form.name.trim() });
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
        <button type="submit" hidden />
      </form>
    </Sheet>
  );
}
