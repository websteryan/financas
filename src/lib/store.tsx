"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { currentYM, monthEnd, monthStart, shiftYM, type YM } from "./format";
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
  const [windowTx, setWindowTx] = useState<Transaction[]>([]);
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
      setWindowTx(t);
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
    const accMap = new Map(accounts.map((a) => [a.id, a]));
    const catMap = new Map(categories.map((c) => [c.id, c]));
    return {
      month,
      setMonth,
      accounts,
      categories,
      windowTx,
      monthTx: windowTx.filter((t) => t.date >= mStart && t.date <= to),
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
          windowTx.filter((t) => t.group_id === g).map((t) => t.id),
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
  }, [month, accounts, categories, windowTx, budgets, budgetsError, removing, animatedRemove, investments, investmentsError, loading, error, reload, sheet, run, to]);

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
