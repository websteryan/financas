"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { currentYM, monthEnd, monthStart, setHiddenValues, shiftYM, todayISO, type YM } from "./format";
import { prefersReducedMotion } from "./motion";
import { repo } from "./repo";
import type { Account, Budget, Category, Investment, Kind, NewInvestment, NewTransaction, Transaction } from "./types";

/** Quantos meses (incluindo o selecionado) ficam carregados para os gráficos de evolução. */
export const WINDOW_MONTHS = 6;

type SheetState = { open: false } | { open: true; tx: Transaction | null; kind?: Kind };

interface Finance {
  month: YM;
  setMonth: (m: YM) => void;
  accounts: Account[];
  categories: Category[];
  /** Lançamentos dos últimos WINDOW_MONTHS meses até o mês selecionado. */
  windowTx: Transaction[];
  /** Lançamentos apenas do mês selecionado. */
  monthTx: Transaction[];
  /** Lançamentos do mês incluindo ajustes e transferências (para listar; os cálculos usam monthTx). */
  monthAll: Transaction[];
  /** Saldo real de cada conta e o total (acumulado desde o início). */
  balanceOf: (accountId: string) => number;
  totalBalance: number;
  /** Ocultar valores (olho). */
  hidden: boolean;
  toggleHidden: () => void;
  adjustBalance: (accountId: string, targetCents: number) => Promise<void>;
  transfer: (fromId: string, toId: string, cents: number, date: string) => Promise<void>;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  sheet: SheetState;
  openNew: (kind?: Kind) => void;
  openEdit: (tx: Transaction) => void;
  closeSheet: () => void;
  addTransactions: (rows: NewTransaction[]) => Promise<void>;
  updateTransaction: (id: string, patch: Partial<NewTransaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  deleteGroup: (groupId: string) => Promise<void>;
  saveAccount: (a: Omit<Account, "id"> & { id?: string }) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  reorderAccounts: (ids: string[]) => Promise<void>;
  saveCategory: (c: Omit<Category, "id"> & { id?: string }) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  /** Ids em animação de saída (a linha desliza antes de sumir). */
  removing: Set<string>;
  budgets: Budget[];
  /** Orçamentos indisponíveis (ex.: tabela ainda não criada); o app segue sem eles. */
  budgetsError: string | null;
  saveBudget: (b: { category_id: string; limit_cents: number }) => Promise<void>;
  deleteBudget: (categoryId: string) => Promise<void>;
  investments: Investment[];
  /** Erro ao carregar investimentos (ex.: tabela ainda não criada); não afeta o resto do app. */
  investmentsError: string | null;
  saveInvestment: (i: NewInvestment & { id?: string }) => Promise<void>;
  deleteInvestment: (id: string) => Promise<void>;
  accountById: (id: string) => Account | undefined;
  categoryById: (id: string | null) => Category | undefined;
}

const Ctx = createContext<Finance | null>(null);

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [month, setMonth] = useState<YM>(currentYM);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [rawTx, setRawTx] = useState<Transaction[]>([]);
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [hidden, setHidden] = useState(false);
  const [removing, setRemoving] = useState<Set<string>>(new Set());
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [budgetsError, setBudgetsError] = useState<string | null>(null);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [investmentsError, setInvestmentsError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sheet, setSheet] = useState<SheetState>({ open: false });

  const from = monthStart(shiftYM(month, -(WINDOW_MONTHS - 1)));
  const to = monthEnd(month);

  const reload = useCallback(async () => {
    try {
      const [a, c, t] = await Promise.all([
        repo.listAccounts(),
        repo.listCategories(),
        repo.listTransactions(from, to),
      ]);
      setAccounts(a);
      setCategories(c);
      setRawTx(t);
      try {
        setBalances(await repo.accountBalances());
      } catch {
        /* saldos indisponíveis: segue sem eles */
      }
      setError(null);
      try {
        setBudgets(await repo.listBudgets());
        setBudgetsError(null);
      } catch (e) {
        setBudgetsError(e instanceof Error ? e.message : "Orçamentos indisponíveis.");
      }
      try {
        setInvestments(await repo.listInvestments());
        setInvestmentsError(null);
      } catch (e) {
        setInvestmentsError(e instanceof Error ? e.message : "Não foi possível carregar os investimentos.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível carregar os dados.");
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    void reload();
  }, [reload]);

  // Recarrega quando o app volta ao primeiro plano (útil entre iPhone e computador)
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") void reload();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [reload]);

  // Ocultar valores: lembra a escolha neste aparelho
  useEffect(() => {
    try {
      if (localStorage.getItem("lastro-ocultar") === "1") {
        setHiddenValues(true);
        setHidden(true);
      }
    } catch {}
  }, []);
  const toggleHidden = useCallback(() => {
    setHidden((h) => {
      setHiddenValues(!h);
      try {
        localStorage.setItem("lastro-ocultar", h ? "0" : "1");
      } catch {}
      return !h;
    });
  }, []);

  const run = useCallback(
    async (fn: () => Promise<void>) => {
      await fn();
      await reload();
    },
    [reload],
  );

  /** Marca as linhas como "saindo", espera a animação e só então apaga. */
  const animatedRemove = useCallback(
    async (ids: string[], fn: () => Promise<void>) => {
      setRemoving(new Set(ids));
      if (!prefersReducedMotion()) await new Promise((r) => setTimeout(r, 300));
      try {
        await fn();
        await reload();
      } finally {
        setRemoving(new Set());
      }
    },
    [reload],
  );

  const value = useMemo<Finance>(() => {
    const mStart = monthStart(month);
    const windowTx = rawTx.filter((t) => !t.special);
    const accMap = new Map(accounts.map((a) => [a.id, a]));
    const catMap = new Map(categories.map((c) => [c.id, c]));
    return {
      month,
      setMonth,
      accounts,
      categories,
      windowTx,
      monthTx: windowTx.filter((t) => t.date >= mStart && t.date <= to),
      monthAll: rawTx.filter((t) => t.date >= mStart && t.date <= to),
      balanceOf: (id) => balances[id] ?? 0,
      totalBalance: accounts.reduce((s, a) => s + (balances[a.id] ?? 0), 0),
      hidden,
      toggleHidden,
      adjustBalance: (accountId, target) =>
        run(async () => {
          const diff = target - (balances[accountId] ?? 0);
          if (diff === 0) return;
          await repo.addTransactions([
            { kind: diff > 0 ? "receita" : "despesa", amount_cents: Math.abs(diff), description: "Ajuste de saldo", date: todayISO(), account_id: accountId, category_id: null, group_id: null, installment: null, installments: null, method: null, special: "ajuste" },
          ]);
        }),
      transfer: (fromId, toId, cents, date) =>
        run(async () => {
          const gid = crypto.randomUUID();
          const base = { amount_cents: cents, date, category_id: null, group_id: gid, installment: null, installments: null, method: null, special: "transferencia" as const };
          await repo.addTransactions([
            { ...base, kind: "despesa", description: `Transferência para ${accMap.get(toId)?.name ?? "outra conta"}`, account_id: fromId },
            { ...base, kind: "receita", description: `Transferência de ${accMap.get(fromId)?.name ?? "outra conta"}`, account_id: toId },
          ]);
        }),
      loading,
      error,
      reload,
      sheet,
      openNew: (kind) => setSheet({ open: true, tx: null, kind }),
      openEdit: (tx) => setSheet({ open: true, tx }),
      closeSheet: () => setSheet({ open: false }),
      addTransactions: (rows) => run(() => repo.addTransactions(rows)),
      updateTransaction: (id, patch) => run(() => repo.updateTransaction(id, patch)),
      deleteTransaction: (id) => animatedRemove([id], () => repo.deleteTransaction(id)),
      deleteGroup: (g) =>
        animatedRemove(
          rawTx.filter((t) => t.group_id === g).map((t) => t.id),
          () => repo.deleteGroup(g),
        ),
      saveAccount: (a) => run(() => repo.saveAccount(a)),
      deleteAccount: (id) => run(() => repo.deleteAccount(id)),
      reorderAccounts: (ids) => run(() => repo.reorderAccounts(ids)),
      saveCategory: (c) => run(() => repo.saveCategory(c)),
      deleteCategory: (id) => run(() => repo.deleteCategory(id)),
      budgets,
      budgetsError,
      saveBudget: (b) => run(() => repo.saveBudget(b)),
      deleteBudget: (id) => run(() => repo.deleteBudget(id)),
      removing,
      investments,
      investmentsError,
      saveInvestment: (i) => run(() => repo.saveInvestment(i)),
      deleteInvestment: (id) => animatedRemove([id], () => repo.deleteInvestment(id)),
      accountById: (id) => accMap.get(id),
      categoryById: (id) => (id ? catMap.get(id) : undefined),
    };
  }, [month, accounts, categories, rawTx, balances, hidden, toggleHidden, budgets, budgetsError, removing, animatedRemove, investments, investmentsError, loading, error, reload, sheet, run, to]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useFinance(): Finance {
  const v = useContext(Ctx);
  if (!v) throw new Error("useFinance precisa estar dentro de FinanceProvider");
  return v;
}

/* ------------------------------------------------------------ cálculos */

export function totals(list: Transaction[]) {
  let income = 0;
  let expense = 0;
  for (const t of list) {
    if (t.special) continue;
    if (t.kind === "receita") income += t.amount_cents;
    else expense += t.amount_cents;
  }
  return { income, expense, balance: income - expense };
}

export function groupSum<K extends string>(list: Transaction[], key: (t: Transaction) => K): Map<K, number> {
  const map = new Map<K, number>();
  for (const t of list) map.set(key(t), (map.get(key(t)) ?? 0) + t.amount_cents);
  return map;
}
