"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowsClockwise, Minus, Plus, Trash } from "./icons";
import { AccountGlyph, Button, Chip, Field, MethodIcon, Segmented, Sheet, inputClass, showToast } from "./ui";
import { addMonthsISO, money, splitCents, todayISO, uid, moneyPlain } from "@/lib/format";
import { useFinance } from "@/lib/store";
import { PAYMENT_LABEL, methodOf, type Kind, type NewTransaction, type PaymentMethod, type Transaction } from "@/lib/types";

const LAST_ACCOUNT = "financas-ultima-conta";
const LAST_METHOD = "financas-ultima-forma";
const METHODS = Object.keys(PAYMENT_LABEL) as PaymentMethod[];

function yesterdayISO() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function TransactionSheet() {
  const { sheet, closeSheet, accounts, categories, windowTx, addTransactions, updateTransaction, deleteTransaction, deleteGroup, saveRule, recurringError } =
    useFinance();
  const editing = sheet.open ? sheet.tx : null;

  const [kind, setKind] = useState<Kind>("despesa");
  const [cents, setCents] = useState(0);
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string>("");
  const [method, setMethod] = useState<PaymentMethod>("debito");
  const [date, setDate] = useState(todayISO());
  const [parcelas, setParcelas] = useState(1);
  const [repeat, setRepeat] = useState(false);
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
    setRepeat(false);
    if (tx) {
      setKind(tx.kind);
      setCents(tx.amount_cents);
      setDescription(tx.description);
      setCategoryId(tx.category_id);
      setAccountId(tx.account_id);
      setMethod(methodOf(tx, accountsRef.current.find((a) => a.id === tx.account_id)));
      setDate(tx.date);
      setParcelas(1);
    } else {
      let last = "";
      let lastMethod: PaymentMethod = "debito";
      try {
        last = localStorage.getItem(LAST_ACCOUNT) ?? "";
        const m = localStorage.getItem(LAST_METHOD) as PaymentMethod | null;
        if (m && METHODS.includes(m)) lastMethod = m;
      } catch {
        /* ignora */
      }
      setKind(sheet.kind ?? "despesa");
      setMethod(lastMethod);
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
  const canSplit = !editing && kind === "despesa" && method === "credito";
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
      if (kind === "despesa") localStorage.setItem(LAST_METHOD, method);
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
          method: kind === "despesa" ? method : null,
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
          method: kind === "despesa" ? method : null,
          group_id: group,
          installment: n > 1 ? i + 1 : null,
          installments: n > 1 ? n : null,
        }));
        await addTransactions(rows);
        if (repeat && n === 1 && !recurringError) {
          const [y, m, d] = date.split("-").map(Number);
          const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
          try {
            await saveRule({ description: desc, kind, amount_cents: cents, day: d, account_id: accountId, category_id: categoryId, method: kind === "despesa" ? method : null, start_ym: next, last_ym: null, active: true });
          } catch {
            showToast("Lançado, mas não foi possível criar a recorrência.");
          }
        }
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

  if (editing?.special) return <SpecialSheet tx={editing} onClose={closeSheet} />;

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
            value={moneyPlain(cents)}
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

        <Field label={kind === "despesa" ? "Conta" : "Recebido em"}>
          <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
            {accounts.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setAccountId(a.id)}
                aria-pressed={accountId === a.id}
                className={`flex h-12 shrink-0 items-center gap-2.5 rounded-ctl border pl-2 pr-4 text-sm transition-colors ${
                  accountId === a.id ? "border-accent/70 bg-accent-soft text-fg" : "border-line bg-surface text-muted hover:text-fg"
                }`}
              >
                <AccountGlyph color={a.color} size={30} />
                <span className="whitespace-nowrap font-medium">{a.name}</span>
              </button>
            ))}
          </div>
        </Field>

        {kind === "despesa" && (
          <Field label="Forma de pagamento">
            <div className="flex flex-wrap gap-2">
              {METHODS.map((m) => (
                <Chip key={m} active={method === m} onClick={() => setMethod(m)}>
                  <MethodIcon method={m} size={16} />
                  {PAYMENT_LABEL[m]}
                </Chip>
              ))}
            </div>
          </Field>
        )}

        {canSplit && (
          <Field label="Parcelas">
            <div className="flex items-center justify-between rounded-ctl border border-line bg-surface px-2 py-1.5">
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

        {!editing && parcelas === 1 && !recurringError && (
          <button
            type="button"
            role="switch"
            aria-checked={repeat}
            onClick={() => setRepeat(!repeat)}
            className="tile flex w-full items-center gap-3 rounded-field px-4 py-3 text-left"
          >
            <ArrowsClockwise size={20} className="shrink-0 text-muted" />
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-medium">Repetir todo mês</span>
              <span className="block text-[13px] text-muted">Aparece em "A confirmar" no dia {date.split("-")[2]}.</span>
            </span>
            <span className={`relative h-6 w-10 shrink-0 rounded-full transition-colors ${repeat ? "bg-accent" : "bg-surface-3"}`}>
              <span className={`absolute top-0.5 size-5 rounded-full bg-white transition-[left] ${repeat ? "left-[18px]" : "left-0.5"}`} />
            </span>
          </button>
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

/** Ajuste de saldo e transferência não se editam: só se vê o que foi e, se preciso, se exclui. */
function SpecialSheet({ tx, onClose }: { tx: Transaction; onClose: () => void }) {
  const { accountById, deleteGroup, deleteTransaction } = useFinance();
  const [busy, setBusy] = useState(false);
  const acc = accountById(tx.account_id);
  async function remove() {
    setBusy(true);
    try {
      if (tx.special === "transferencia" && tx.group_id) await deleteGroup(tx.group_id);
      else await deleteTransaction(tx.id);
      onClose();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Não foi possível excluir.");
    }
    setBusy(false);
  }
  return (
    <Sheet
      open
      onClose={onClose}
      title={tx.special === "transferencia" ? "Transferência" : "Ajuste de saldo"}
      footer={
        <Button variant="danger" onClick={remove} disabled={busy}>
          <Trash size={18} weight="bold" /> {tx.special === "transferencia" ? "Excluir transferência" : "Excluir ajuste"}
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="num text-[34px] font-semibold tracking-tight">
          {tx.kind === "receita" ? "+" : "-"} {money(tx.amount_cents)}
        </p>
        <div className="card divide-y divide-line">
          <Row label="Descrição" value={tx.description} />
          <Row label="Conta" value={acc?.name ?? "Conta removida"} />
          <Row label="Data" value={tx.date.split("-").reverse().join("/")} />
        </div>
        <p className="text-[13px] text-muted">
          {tx.special === "transferencia"
            ? "Mover dinheiro entre suas contas não conta como gasto nem receita. Excluir remove os dois lados da transferência."
            : "Ajustes corrigem o saldo da conta e não contam como gasto nem receita."}
        </p>
      </div>
    </Sheet>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3 text-[15px]">
      <span className="text-muted">{label}</span>
      <span className="min-w-0 truncate text-right font-medium">{value}</span>
    </div>
  );
}
