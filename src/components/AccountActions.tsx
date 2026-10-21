"use client";

import { useState } from "react";
import { Button, Chip, Field, Sheet, AccountGlyph, inputClass, showToast } from "./ui";
import { money, moneyPlain, todayISO } from "@/lib/format";
import { useFinance } from "@/lib/store";
import type { Account } from "@/lib/types";

function signedMoneyInput(cents: number) {
  return `${cents < 0 ? "-" : ""}${moneyPlain(Math.abs(cents))}`;
}

/** Ajuste de saldo: informe o saldo real e o app lança só a diferença (não conta como gasto nem receita). */
export function AdjustSheet({ account, onClose }: { account: Account | null; onClose: () => void }) {
  const f = useFinance();
  const [target, setTarget] = useState(0);
  const [prev, setPrev] = useState<Account | null>(null);
  const [busy, setBusy] = useState(false);
  if (account !== prev) {
    setPrev(account);
    if (account) setTarget(f.balanceOf(account.id));
  }
  if (!account) return null;
  const current = f.balanceOf(account.id);
  const diff = target - current;

  async function save() {
    if (!account) return;
    setBusy(true);
    try {
      await f.adjustBalance(account.id, target);
      showToast(diff === 0 ? "Saldo já estava correto" : "Saldo ajustado");
      onClose();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Não foi possível ajustar.");
    }
    setBusy(false);
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={`Ajustar saldo`}
      footer={
        <Button variant="primary" className="w-full" onClick={save} disabled={busy}>
          {busy ? "Salvando..." : "Salvar ajuste"}
        </Button>
      }
    >
      <form
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <div className="flex items-center gap-3">
          <AccountGlyph color={account.color} size={40} />
          <div className="min-w-0">
            <p className="truncate text-[16px] font-medium">{account.name}</p>
            <p className="text-[13px] text-muted">
              Saldo no app: <span className="num">{money(current)}</span>
            </p>
          </div>
        </div>
        <Field label="Saldo real da conta" htmlFor="saldo-real" hint="Digite quanto a conta tem de verdade agora. Use o sinal de menos para saldo negativo.">
          <input
            id="saldo-real"
            inputMode="numeric"
            autoComplete="off"
            className={`${inputClass} num text-[20px] font-semibold`}
            value={signedMoneyInput(target)}
            onChange={(e) => {
              const neg = e.target.value.includes("-");
              const n = Number(e.target.value.replace(/\D/g, "").slice(0, 11) || "0");
              setTarget(neg ? -n : n);
            }}
          />
        </Field>
        <div className="flex flex-wrap gap-2">
          <Chip active={target === 0} onClick={() => setTarget(0)}>
            Zerar saldo
          </Chip>
        </div>
        <p className="text-[13px] text-muted">
          {diff === 0 ? "Nenhuma diferença: nada será lançado." : `Será lançado um ajuste de ${diff > 0 ? "+" : "-"} ${money(Math.abs(diff))}.`}
        </p>
        <button type="submit" hidden />
      </form>
    </Sheet>
  );
}

/** Transferência entre contas: sai de uma e entra na outra, sem contar como gasto nem receita. */
export function TransferSheet({ account, onClose }: { account: Account | null; onClose: () => void }) {
  const f = useFinance();
  const [toId, setToId] = useState<string | null>(null);
  const [cents, setCents] = useState(0);
  const [date, setDate] = useState(todayISO());
  const [prev, setPrev] = useState<Account | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (account !== prev) {
    setPrev(account);
    setToId(null);
    setCents(0);
    setDate(todayISO());
    setError(null);
  }
  if (!account) return null;
  const others = f.accounts.filter((a) => a.id !== account.id);

  async function save() {
    if (!account) return;
    if (!toId) return setError("Escolha a conta de destino.");
    if (cents <= 0) return setError("Informe o valor.");
    setBusy(true);
    try {
      await f.transfer(account.id, toId, cents, date);
      showToast("Transferência feita");
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível transferir.");
    }
    setBusy(false);
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title="Transferir"
      footer={
        <div className="flex flex-col gap-2">
          {error && (
            <p role="alert" className="text-sm text-expense">
              {error}
            </p>
          )}
          <Button variant="primary" onClick={save} disabled={busy || others.length === 0}>
            {busy ? "Transferindo..." : "Transferir"}
          </Button>
        </div>
      }
    >
      {others.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">Crie outra conta para poder transferir.</p>
      ) : (
        <form
          className="flex flex-col gap-5"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <Field label="De">
            <div className="tile flex items-center gap-3 rounded-field px-3 py-2.5">
              <AccountGlyph color={account.color} size={34} />
              <span className="flex-1 truncate text-[15px] font-medium">{account.name}</span>
              <span className="num text-[13px] text-muted">{money(f.balanceOf(account.id))}</span>
            </div>
          </Field>
          <Field label="Para">
            <div className="flex flex-wrap gap-2">
              {others.map((a) => (
                <Chip key={a.id} active={toId === a.id} color={a.color} onClick={() => setToId(a.id)}>
                  {a.name}
                </Chip>
              ))}
            </div>
          </Field>
          <Field label="Valor" htmlFor="valor-transf">
            <input
              id="valor-transf"
              inputMode="numeric"
              autoComplete="off"
              className={`${inputClass} num text-[20px] font-semibold`}
              value={moneyPlain(cents)}
              onChange={(e) => setCents(Number(e.target.value.replace(/\D/g, "").slice(0, 11) || "0"))}
            />
          </Field>
          <Field label="Data" htmlFor="data-transf">
            <input id="data-transf" type="date" className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <button type="submit" hidden />
        </form>
      )}
    </Sheet>
  );
}
