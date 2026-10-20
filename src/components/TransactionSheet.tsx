"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Minus, Plus, Trash } from "./icons";
import { AccountGlyph, Button, Chip, Field, Segmented, Sheet, inputClass, showToast } from "./ui";
import { addMonthsISO, money, splitCents, todayISO, uid } from "@/lib/format";
import { useFinance } from "@/lib/store";
import type { Kind, NewTransaction } from "@/lib/types";

const LAST_ACCOUNT = "financas-ultima-conta";

function yesterdayISO() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function TransactionSheet() {
  const { sheet, closeSheet, accounts, categories, windowTx, addTransactions, updateTransaction, deleteTransaction, deleteGroup } =
    useFinance();
  const editing = sheet.open ? sheet.tx : null;

  const [kind, setKind] = useState<Kind>("despesa");
  const [cents, setCents] = useState(0);
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string>("");
  const [date, setDate] = useState(todayISO());
  const [parcelas, setParcelas] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const amountRef = useRef<HTMLInputElement>(null);
  const accountsRef = useRef(accounts);
  accountsRef.current = accounts;

  // Preenche o formulário sempre que o painel abre
  useEffect(() => {
    if (!sheet.open) return;
    const tx = sheet.tx;
    setError(null);
    setSaving(false);
    setConfirmDelete(false);
    if (tx) {
      setKind(tx.kind);
      setCents(tx.amount_cents);
      setDescription(tx.description);
      setCategoryId(tx.category_id);
      setAccountId(tx.account_id);
      setDate(tx.date);
      setParcelas(1);
    } else {
      let last = "";
      try {
        last = localStorage.getItem(LAST_ACCOUNT) ?? "";
      } catch {
        /* ignora */
      }
      setKind(sheet.kind ?? "despesa");
      setCents(0);
      setDescription("");
      setCategoryId(null);
      const list = accountsRef.current;
      setAccountId(list.some((a) => a.id === last) ? last : (list[0]?.id ?? ""));
      setDate(todayISO());
      setParcelas(1);
      requestAnimationFrame(() => amountRef.current?.focus());
    }
  }, [sheet]);

  const kindCategories = useMemo(() => categories.filter((c) => c.kind === kind), [categories, kind]);
  const account = accounts.find((a) => a.id === accountId);
  const canSplit = !editing && kind === "despesa" && account?.type === "credito";
  const n = canSplit ? parcelas : 1;
  const parts = useMemo(() => splitCents(cents, n), [cents, n]);

  function changeKind(k: Kind) {
    setKind(k);
    setCategoryId(null);
  }

  async function save() {
    if (cents <= 0) return setError("Informe um valor maior que zero.");
    if (!accountId) return setError("Escolha uma conta. Você pode criar uma em Contas.");
    setError(null);
    setSaving(true);
    const cat = categories.find((c) => c.id === categoryId);
    const desc = description.trim() || cat?.name || (kind === "despesa" ? "Gasto" : "Receita");
    try {
      localStorage.setItem(LAST_ACCOUNT, accountId);
    } catch {
      /* ignora */
    }
    try {
      if (editing) {
        await updateTransaction(editing.id, {
          kind,
          amount_cents: cents,
          description: desc,
          category_id: categoryId,
          account_id: accountId,
          date,
        });
      } else {
        const group = n > 1 ? uid() : null;
        const rows: NewTransaction[] = parts.map((p, i) => ({
          kind,
          amount_cents: p,
          description: desc,
          date: addMonthsISO(date, i),
          account_id: accountId,
          category_id: categoryId,
          group_id: group,
          installment: n > 1 ? i + 1 : null,
          installments: n > 1 ? n : null,
        }));
        await addTransactions(rows);
      }
      showToast(editing ? "Alterações salvas" : kind === "despesa" ? "Gasto adicionado" : "Receita adicionada");
      closeSheet();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível salvar.");
      setSaving(false);
    }
  }

  async function remove(all: boolean) {
    if (!editing) return;
    const gone = all && editing.group_id ? windowTx.filter((t) => t.group_id === editing.group_id) : [editing];
    const rows: NewTransaction[] = gone.map(({ id: _id, created_at: _c, ...r }) => r);
    closeSheet();
    try {
      if (all && editing.group_id) await deleteGroup(editing.group_id);
      else await deleteTransaction(editing.id);
      showToast(all ? "Parcelas excluídas" : "Lançamento excluído", {
        label: "Desfazer",
        onClick: () => void addTransactions(rows),
      });
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Não foi possível excluir.");
    }
  }

  const title = editing ? "Editar lançamento" : "Novo lançamento";
  const saveLabel = editing ? "Salvar" : kind === "despesa" ? "Adicionar gasto" : "Adicionar receita";

  return (
    <Sheet
      open={sheet.open}
      onClose={closeSheet}
      title={title}
      footer={
        <div className="flex flex-col gap-3">
          {error && (
            <p role="alert" className="text-sm text-expense">
              {error}
            </p>
          )}
          {editing && confirmDelete ? (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-muted">Excluir este lançamento?</p>
              <div className="flex gap-2">
                <Button variant="secondary" className="flex-1" onClick={() => setConfirmDelete(false)} disabled={saving}>
                  Cancelar
                </Button>
                <Button variant="danger" className="flex-1" onClick={() => remove(false)} disabled={saving}>
                  {editing.group_id ? "Só esta parcela" : "Excluir"}
                </Button>
              </div>
              {editing.group_id && (
                <Button variant="danger" onClick={() => remove(true)} disabled={saving}>
                  Excluir todas as {editing.installments} parcelas
                </Button>
              )}
            </div>
          ) : (
            <div className="flex gap-2">
              {editing && (
                <Button variant="danger" aria-label="Excluir" className="w-12 px-0" onClick={() => setConfirmDelete(true)}>
                  <Trash size={18} weight="bold" />
                </Button>
              )}
              <Button variant="primary" className="flex-1" onClick={save} disabled={saving}>
                {saving ? "Salvando..." : saveLabel}
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
        <Segmented
          value={kind}
          onChange={changeKind}
          options={[
            { value: "despesa", label: "Gasto" },
            { value: "receita", label: "Receita" },
          ]}
        />

        <div className="flex flex-col items-center gap-1 py-2">
          <label htmlFor="valor" className="text-[13px] font-medium text-muted">
            Valor
          </label>
          <input
            id="valor"
            ref={amountRef}
            inputMode="numeric"
            autoComplete="off"
            value={money(cents)}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, "").slice(0, 11);
              setCents(Number(digits || "0"));
            }}
            onFocus={(e) => {
              const el = e.currentTarget;
              requestAnimationFrame(() => el.setSelectionRange(el.value.length, el.value.length));
            }}
            className={`num font-display w-full bg-transparent text-center text-[44px] font-semibold leading-tight outline-none focus-visible:outline-none ${
              kind === "despesa" ? "text-fg" : "text-income"
            }`}
          />
          {editing?.installments && (
            <p className="text-[13px] text-muted">
              Parcela {editing.installment} de {editing.installments}
            </p>
          )}
        </div>

        <Field label="Descrição" htmlFor="descricao">
          <input
            id="descricao"
            className={inputClass}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={kind === "despesa" ? "Ex.: Mercado do mês" : "Ex.: Salário"}
            autoComplete="off"
            enterKeyHint="done"
          />
        </Field>

        <Field label="Categoria">
          <div className="flex flex-wrap gap-2">
            {kindCategories.map((c) => (
              <Chip key={c.id} active={categoryId === c.id} color={c.color} onClick={() => setCategoryId(categoryId === c.id ? null : c.id)}>
                {c.name}
              </Chip>
            ))}
            {kindCategories.length === 0 && <p className="text-sm text-muted">Crie categorias em Contas.</p>}
          </div>
        </Field>

        <Field label={kind === "despesa" ? "Pago com" : "Recebido em"}>
          <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
            {accounts.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setAccountId(a.id)}
                aria-pressed={accountId === a.id}
                className={`flex h-12 shrink-0 items-center gap-2.5 rounded-full border pl-2 pr-4 text-sm transition-colors ${
                  accountId === a.id ? "border-accent/70 bg-accent-soft text-fg" : "border-line bg-surface text-muted hover:text-fg"
                }`}
              >
                <AccountGlyph type={a.type} color={a.color} size={30} />
                <span className="whitespace-nowrap font-medium">{a.name}</span>
              </button>
            ))}
          </div>
        </Field>

        {canSplit && (
          <Field label="Parcelas">
            <div className="flex items-center justify-between rounded-full border border-line bg-surface px-2 py-1.5">
              <button
                type="button"
                aria-label="Menos parcelas"
                onClick={() => setParcelas((p) => Math.max(1, p - 1))}
                className="inline-flex size-9 items-center justify-center rounded-full text-muted hover:bg-surface-2 hover:text-fg disabled:opacity-40"
                disabled={parcelas <= 1}
              >
                <Minus size={16} weight="bold" />
              </button>
              <div className="text-center">
                <p className="num text-[15px] font-semibold">{parcelas === 1 ? "À vista" : `${parcelas}x de ${money(parts[0] ?? 0)}`}</p>
                {parcelas > 1 && <p className="text-xs text-muted">uma por mês a partir da data</p>}
              </div>
              <button
                type="button"
                aria-label="Mais parcelas"
                onClick={() => setParcelas((p) => Math.min(48, p + 1))}
                className="inline-flex size-9 items-center justify-center rounded-full text-muted hover:bg-surface-2 hover:text-fg"
              >
                <Plus size={16} weight="bold" />
              </button>
            </div>
          </Field>
        )}

        <Field label="Data" htmlFor="data">
          <div className="flex items-center gap-2">
            <input
              id="data"
              type="date"
              className={`${inputClass} flex-1`}
              value={date}
              onChange={(e) => e.target.value && setDate(e.target.value)}
            />
            <Chip active={date === todayISO()} onClick={() => setDate(todayISO())}>
              Hoje
            </Chip>
            <Chip active={date === yesterdayISO()} onClick={() => setDate(yesterdayISO())}>
              Ontem
            </Chip>
          </div>
        </Field>
        <button type="submit" hidden />
      </form>
    </Sheet>
  );
}
