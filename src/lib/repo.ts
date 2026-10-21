import { isCloud } from "./supabase/config";
import { supabaseBrowser } from "./supabase/client";
import { addMonthsISO, currentYM, monthStart, shiftYM, todayISO, uid } from "./format";
import type { Account, Budget, Goal, GoalDeposit, NewGoal, NewGoalDeposit, NewRecurringRule, RecurringRule, PaymentMethod, Category, Investment, NewInvestment, NewTransaction, Transaction } from "./types";

export interface Repo {
  listAccounts(): Promise<Account[]>;
  saveAccount(a: Omit<Account, "id"> & { id?: string }): Promise<void>;
  deleteAccount(id: string): Promise<void>;
  /** Define a ordem das contas (ids na ordem desejada). */
  reorderAccounts(ids: string[]): Promise<void>;
  listCategories(): Promise<Category[]>;
  saveCategory(c: Omit<Category, "id"> & { id?: string }): Promise<void>;
  deleteCategory(id: string): Promise<void>;
  listTransactions(from: string, to: string): Promise<Transaction[]>;
  listAllTransactions(): Promise<Transaction[]>;
  /** Saldo real de cada conta (soma de todos os lançamentos desde o início), em centavos. */
  accountBalances(): Promise<Record<string, number>>;
  addTransactions(rows: NewTransaction[]): Promise<void>;
  updateTransaction(id: string, patch: Partial<NewTransaction>): Promise<void>;
  deleteTransaction(id: string): Promise<void>;
  deleteGroup(groupId: string): Promise<void>;
  listInvestments(): Promise<Investment[]>;
  saveInvestment(i: NewInvestment & { id?: string }): Promise<void>;
  deleteInvestment(id: string): Promise<void>;
  listRecurring(): Promise<RecurringRule[]>;
  saveRecurring(r: NewRecurringRule & { id?: string }): Promise<void>;
  deleteRecurring(id: string): Promise<void>;
  listBudgets(): Promise<Budget[]>;
  saveBudget(b: { category_id: string; limit_cents: number }): Promise<void>;
  deleteBudget(categoryId: string): Promise<void>;
  listGoals(): Promise<Goal[]>;
  saveGoal(g: NewGoal & { id?: string }): Promise<void>;
  deleteGoal(id: string): Promise<void>;
  listGoalDeposits(): Promise<GoalDeposit[]>;
  addGoalDeposit(d: NewGoalDeposit): Promise<void>;
  deleteGoalDeposit(id: string): Promise<void>;
  /** Variação líquida de todas as contas por mês ("YYYY-MM"), incluindo ajustes. */
  monthlyNet(): Promise<Record<string, number>>;
  savePushSub(s: { endpoint: string; p256dh: string; auth: string; tz: string }): Promise<void>;
  deletePushSub(endpoint: string): Promise<void>;
  signOut(): Promise<void>;
}

/* ---------------------------------------------------------------- Supabase */

function check<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

const cloudRepo: Repo = {
  async listAccounts() {
    const sb = supabaseBrowser();
    return check(await sb.from("accounts").select("id,name,type,color").order("created_at"));
  },
  async saveAccount({ id, ...a }) {
    const sb = supabaseBrowser();
    if (id) check(await sb.from("accounts").update(a).eq("id", id));
    else check(await sb.from("accounts").insert(a));
  },
  async deleteAccount(id) {
    check(await supabaseBrowser().from("accounts").delete().eq("id", id));
  },
  async reorderAccounts(ids) {
    // A ordem vem de created_at; redistribuímos os mesmos carimbos na nova ordem (sem mudar o schema).
    const sb = supabaseBrowser();
    const rows = check(await sb.from("accounts").select("id,created_at").in("id", ids));
    const stamps = rows.map((r) => r.created_at as string).sort();
    await Promise.all(ids.map((id, i) => sb.from("accounts").update({ created_at: stamps[i] }).eq("id", id).then(check)));
  },
  async listCategories() {
    const sb = supabaseBrowser();
    const res = await sb.from("categories").select("id,name,kind,color,icon").order("created_at");
    // Banco ainda sem a coluna "icon" (SQL pendente): lê sem ela.
    if (res.error && /icon/i.test(res.error.message)) {
      return check(await sb.from("categories").select("id,name,kind,color").order("created_at"));
    }
    return check(res);
  },
  async saveCategory({ id, ...c }) {
    const sb = supabaseBrowser();
    const run = (row: typeof c) => (id ? sb.from("categories").update(row).eq("id", id) : sb.from("categories").insert(row));
    const res = await run(c);
    if (res.error && /icon/i.test(res.error.message)) {
      const { icon: _i, ...rest } = c;
      check(await run(rest));
      return;
    }
    check(res);
  },
  async deleteCategory(id) {
    check(await supabaseBrowser().from("categories").delete().eq("id", id));
  },
  async listTransactions(from, to) {
    const sb = supabaseBrowser();
    return check(
      await sb
        .from("transactions")
        .select("*")
        .gte("date", from)
        .lte("date", to)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false }),
    );
  },
  async listAllTransactions() {
    const sb = supabaseBrowser();
    return check(await sb.from("transactions").select("*").order("date", { ascending: false }));
  },
  async accountBalances() {
    const sb = supabaseBrowser();
    const out: Record<string, number> = {};
    // O Supabase devolve no máximo 1000 linhas por consulta: lê em páginas.
    for (let from = 0; ; from += 1000) {
      const rows = check(
        await sb.from("transactions").select("account_id,kind,amount_cents").order("id").range(from, from + 999),
      ) as Pick<Transaction, "account_id" | "kind" | "amount_cents">[];
      for (const r of rows) out[r.account_id] = (out[r.account_id] ?? 0) + (r.kind === "receita" ? r.amount_cents : -r.amount_cents);
      if (rows.length < 1000) break;
    }
    return out;
  },
  async addTransactions(rows) {
    const sb = supabaseBrowser();
    const res = await sb.from("transactions").insert(rows);
    if (res.error && /special/i.test(res.error.message)) {
      throw new Error("Falta rodar o SQL novo no Supabase (coluna special) para usar ajuste de saldo e transferência.");
    }
    // Banco ainda sem a coluna "method" (SQL pendente): grava sem ela para não travar o app.
    if (res.error && /method/i.test(res.error.message)) {
      check(await sb.from("transactions").insert(rows.map(({ method: _m, ...r }) => r)));
      return;
    }
    check(res);
  },
  async updateTransaction(id, patch) {
    const sb = supabaseBrowser();
    const res = await sb.from("transactions").update(patch).eq("id", id);
    if (res.error && /method/i.test(res.error.message)) {
      const { method: _m, ...rest } = patch;
      check(await sb.from("transactions").update(rest).eq("id", id));
      return;
    }
    check(res);
  },
  async deleteTransaction(id) {
    check(await supabaseBrowser().from("transactions").delete().eq("id", id));
  },
  async deleteGroup(groupId) {
    check(await supabaseBrowser().from("transactions").delete().eq("group_id", groupId));
  },
  async listInvestments() {
    const sb = supabaseBrowser();
    return check(
      await sb
        .from("investments")
        .select("id,name,type,institution,amount_cents,date")
        .order("date", { ascending: false })
        .order("created_at", { ascending: false }),
    );
  },
  async saveInvestment({ id, ...i }) {
    const sb = supabaseBrowser();
    if (id) check(await sb.from("investments").update(i).eq("id", id));
    else check(await sb.from("investments").insert(i));
  },
  async deleteInvestment(id) {
    check(await supabaseBrowser().from("investments").delete().eq("id", id));
  },
  async listGoals() {
    return check(await supabaseBrowser().from("goals").select("id,name,target_cents,deadline,color,created_at").order("created_at"));
  },
  async saveGoal({ id, ...g }) {
    const sb = supabaseBrowser();
    if (id) check(await sb.from("goals").update(g).eq("id", id));
    else check(await sb.from("goals").insert(g));
  },
  async deleteGoal(id) {
    check(await supabaseBrowser().from("goals").delete().eq("id", id));
  },
  async listGoalDeposits() {
    return check(await supabaseBrowser().from("goal_deposits").select("id,goal_id,amount_cents,date").order("date"));
  },
  async addGoalDeposit(d) {
    check(await supabaseBrowser().from("goal_deposits").insert(d));
  },
  async deleteGoalDeposit(id) {
    check(await supabaseBrowser().from("goal_deposits").delete().eq("id", id));
  },
  async monthlyNet() {
    const sb = supabaseBrowser();
    const out: Record<string, number> = {};
    for (let from = 0; ; from += 1000) {
      const rows = check(await sb.from("transactions").select("date,kind,amount_cents").order("id").range(from, from + 999)) as Pick<Transaction, "date" | "kind" | "amount_cents">[];
      for (const r of rows) {
        const k = r.date.slice(0, 7);
        out[k] = (out[k] ?? 0) + (r.kind === "receita" ? r.amount_cents : -r.amount_cents);
      }
      if (rows.length < 1000) break;
    }
    return out;
  },
  async savePushSub(s) {
    check(await supabaseBrowser().from("push_subscriptions").upsert(s, { onConflict: "endpoint" }));
  },
  async deletePushSub(endpoint) {
    check(await supabaseBrowser().from("push_subscriptions").delete().eq("endpoint", endpoint));
  },
  async listRecurring() {
    return check(
      await supabaseBrowser()
        .from("recurring_rules")
        .select("id,description,kind,amount_cents,day,account_id,category_id,method,start_ym,last_ym,active")
        .order("created_at"),
    );
  },
  async saveRecurring({ id, ...r }) {
    const sb = supabaseBrowser();
    if (id) check(await sb.from("recurring_rules").update(r).eq("id", id));
    else check(await sb.from("recurring_rules").insert(r));
  },
  async deleteRecurring(id) {
    check(await supabaseBrowser().from("recurring_rules").delete().eq("id", id));
  },
  async listBudgets() {
    return check(await supabaseBrowser().from("budgets").select("id,category_id,limit_cents"));
  },
  async saveBudget(b) {
    check(await supabaseBrowser().from("budgets").upsert(b, { onConflict: "user_id,category_id" }));
  },
  async deleteBudget(categoryId) {
    check(await supabaseBrowser().from("budgets").delete().eq("category_id", categoryId));
  },
  async signOut() {
    await supabaseBrowser().auth.signOut();
  },
};

/* ------------------------------------------------- Modo demonstração (local) */

interface LocalDB {
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  investments?: Investment[];
  budgets?: Budget[];
  recurring?: RecurringRule[];
  goals?: Goal[];
  goalDeposits?: GoalDeposit[];
}

const KEY = "financas-demo-v1";

function seed(): LocalDB {
  const accounts: Account[] = [
    { id: uid(), name: "Nubank", type: "debito", color: "#7545e8" },
    { id: uid(), name: "Itaú", type: "debito", color: "#f97316" },
    { id: uid(), name: "Carteira", type: "dinheiro", color: "#14b8a6" },
  ];
  const c = (name: string, kind: Category["kind"], color: string): Category => ({ id: uid(), name, kind, color });
  const categories: Category[] = [
    c("Alimentação", "despesa", "#f97316"),
    c("Mercado", "despesa", "#eab308"),
    c("Transporte", "despesa", "#3b82f6"),
    c("Moradia", "despesa", "#8b5cf6"),
    c("Saúde", "despesa", "#ef4444"),
    c("Lazer", "despesa", "#ec4899"),
    c("Assinaturas", "despesa", "#6366f1"),
    c("Outros", "despesa", "#8b8b93"),
    c("Salário", "receita", "#22c55e"),
    c("Freelance", "receita", "#14b8a6"),
  ];
  const cat = (n: string) => categories.find((x) => x.name === n)!.id;
  const [nu, itau] = accounts.map((a) => a.id);
  const now = currentYM();
  const today = todayISO();
  const tx: Transaction[] = [];
  const add = (
    monthsAgo: number,
    day: number,
    kind: Transaction["kind"],
    cents: number,
    description: string,
    account: string,
    category: string,
    method?: PaymentMethod,
  ) => {
    const ym = shiftYM(now, -monthsAgo);
    const date = monthStart(ym).slice(0, 8) + String(day).padStart(2, "0");
    if (monthsAgo === 0 && date > today) return;
    tx.push({
      id: uid(), kind, amount_cents: cents, description, date,
      account_id: account, category_id: cat(category),
      method: kind === "despesa" ? method ?? "debito" : null,
      group_id: null, installment: null, installments: null,
    });
  };
  // salários organizados e gastos com valores variados (dados fictícios)
  for (let i = 0; i < 6; i++) {
    const v = 1 + ((i * 7) % 5) / 40;
    add(i, 5, "receita", 685000, "Salário", itau, "Salário");
    if (i % 2 === 0) add(i, 18, "receita", Math.round(124000 * v), "Projeto freelance", itau, "Freelance");
    add(i, 10, "despesa", 189000, "Aluguel", itau, "Moradia", "debito");
    add(i, 12, "despesa", Math.round(61237 * v), "Supermercado", nu, "Mercado", "credito");
    add(i, 3, "despesa", 5590, "Streaming e música", nu, "Assinaturas", "credito");
    add(i, 8, "despesa", Math.round(14320 * v), "Combustível", nu, "Transporte", "credito");
    add(i, 14, "despesa", Math.round(8790 * v), "Almoço", itau, "Alimentação", "pix");
    add(i, 16, "despesa", Math.round(23150 / v), "Restaurante", nu, "Alimentação", "credito");
    add(i, 2, "despesa", Math.round(4280 * v), "Uber", itau, "Transporte", "pix");
    add(i, 21, "despesa", Math.round(16900 / v), "Cinema e bar", nu, "Lazer", "credito");
    if (i % 3 === 1) add(i, 9, "despesa", 31000, "Consulta", itau, "Saúde", "debito");
  }
  // uma compra parcelada
  const group = uid();
  const first = monthStart(shiftYM(now, -1)).slice(0, 8) + "20";
  for (let k = 0; k < 4; k++) {
    tx.push({
      id: uid(), kind: "despesa", amount_cents: 32475, description: "Fone de ouvido",
      date: addMonthsISO(first, k), account_id: nu, category_id: cat("Outros"), method: "credito",
      group_id: group, installment: k + 1, installments: 4,
    });
  }
  const inv = (name: string, type: Investment["type"], institution: string, cents: number, monthsAgo: number, day: number): Investment => ({
    id: uid(), name, type, institution, amount_cents: cents,
    date: monthStart(shiftYM(now, -monthsAgo)).slice(0, 8) + String(day).padStart(2, "0"),
  });
  const investments: Investment[] = [
    inv("Tesouro Selic 2029", "renda_fixa", "Tesouro Direto", 500000, 5, 6),
    inv("CDB 110% CDI", "renda_fixa", "Nubank", 300000, 3, 12),
    inv("PETR4", "acoes", "XP", 180000, 4, 9),
    inv("HGLG11", "fiis", "XP", 120000, 2, 15),
    inv("Bitcoin", "cripto", "Binance", 80000, 1, 4),
  ];
  const budgets: Budget[] = [
    { id: uid(), category_id: cat("Alimentação"), limit_cents: 60000 },
    { id: uid(), category_id: cat("Mercado"), limit_cents: 80000 },
    { id: uid(), category_id: cat("Lazer"), limit_cents: 30000 },
  ];
  const t0 = new Date();
  const thisYm = `${t0.getFullYear()}-${String(t0.getMonth() + 1).padStart(2, "0")}`;
  const recurring: RecurringRule[] = [
    { id: uid(), description: "Streaming e música", kind: "despesa", amount_cents: 5590, day: 1, account_id: nu, category_id: cat("Assinaturas"), method: "credito", start_ym: thisYm, last_ym: null, active: true },
  ];
  return { accounts, categories, transactions: tx, investments, budgets, recurring };
}

function load(): LocalDB {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as LocalDB;
  } catch {
    /* sem armazenamento disponível */
  }
  const db = seed();
  persist(db);
  return db;
}

function persist(db: LocalDB) {
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
  } catch {
    /* ignora */
  }
}

function mutate(fn: (db: LocalDB) => void) {
  const db = load();
  fn(db);
  persist(db);
}

const byDateDesc = (a: Transaction, b: Transaction) =>
  b.date.localeCompare(a.date) || (b.created_at ?? "").localeCompare(a.created_at ?? "");

const localRepo: Repo = {
  async listAccounts() {
    return load().accounts;
  },
  async saveAccount({ id, ...a }) {
    mutate((db) => {
      if (id) db.accounts = db.accounts.map((x) => (x.id === id ? { ...x, ...a } : x));
      else db.accounts.push({ id: uid(), ...a });
    });
  },
  async deleteAccount(id) {
    mutate((db) => {
      db.accounts = db.accounts.filter((x) => x.id !== id);
      db.transactions = db.transactions.filter((t) => t.account_id !== id);
    });
  },
  async reorderAccounts(ids) {
    mutate((db) => {
      const byId = new Map(db.accounts.map((a) => [a.id, a]));
      const ordered = ids.map((id) => byId.get(id)).filter((a): a is Account => Boolean(a));
      db.accounts = [...ordered, ...db.accounts.filter((a) => !ids.includes(a.id))];
    });
  },
  async listCategories() {
    return load().categories;
  },
  async saveCategory({ id, ...c }) {
    mutate((db) => {
      if (id) db.categories = db.categories.map((x) => (x.id === id ? { ...x, ...c } : x));
      else db.categories.push({ id: uid(), ...c });
    });
  },
  async deleteCategory(id) {
    mutate((db) => {
      db.categories = db.categories.filter((x) => x.id !== id);
      db.transactions = db.transactions.map((t) => (t.category_id === id ? { ...t, category_id: null } : t));
    });
  },
  async listTransactions(from, to) {
    return load()
      .transactions.filter((t) => t.date >= from && t.date <= to)
      .sort(byDateDesc);
  },
  async accountBalances() {
    const out: Record<string, number> = {};
    for (const t of load().transactions) out[t.account_id] = (out[t.account_id] ?? 0) + (t.kind === "receita" ? t.amount_cents : -t.amount_cents);
    return out;
  },
  async listAllTransactions() {
    return load().transactions.sort(byDateDesc);
  },
  async addTransactions(rows) {
    const stamp = new Date().toISOString();
    mutate((db) => {
      db.transactions.push(...rows.map((r) => ({ ...r, id: uid(), created_at: stamp })));
    });
  },
  async updateTransaction(id, patch) {
    mutate((db) => {
      db.transactions = db.transactions.map((t) => (t.id === id ? { ...t, ...patch } : t));
    });
  },
  async deleteTransaction(id) {
    mutate((db) => {
      db.transactions = db.transactions.filter((t) => t.id !== id);
    });
  },
  async deleteGroup(groupId) {
    mutate((db) => {
      db.transactions = db.transactions.filter((t) => t.group_id !== groupId);
    });
  },
  async listInvestments() {
    return [...(load().investments ?? [])].sort((a, b) => b.date.localeCompare(a.date));
  },
  async saveInvestment({ id, ...i }) {
    mutate((db) => {
      const list = db.investments ?? [];
      db.investments = id ? list.map((x) => (x.id === id ? { ...x, ...i } : x)) : [...list, { id: uid(), ...i }];
    });
  },
  async deleteInvestment(id) {
    mutate((db) => {
      db.investments = (db.investments ?? []).filter((x) => x.id !== id);
    });
  },
  async listGoals() {
    return load().goals ?? [];
  },
  async saveGoal({ id, ...g }) {
    mutate((db) => {
      const list = db.goals ?? [];
      db.goals = id ? list.map((x) => (x.id === id ? { ...x, ...g } : x)) : [...list, { id: uid(), ...g }];
    });
  },
  async deleteGoal(id) {
    mutate((db) => {
      db.goals = (db.goals ?? []).filter((x) => x.id !== id);
      db.goalDeposits = (db.goalDeposits ?? []).filter((x) => x.goal_id !== id);
    });
  },
  async listGoalDeposits() {
    return load().goalDeposits ?? [];
  },
  async addGoalDeposit(d) {
    mutate((db) => {
      db.goalDeposits = [...(db.goalDeposits ?? []), { id: uid(), ...d }];
    });
  },
  async deleteGoalDeposit(id) {
    mutate((db) => {
      db.goalDeposits = (db.goalDeposits ?? []).filter((x) => x.id !== id);
    });
  },
  async monthlyNet() {
    const out: Record<string, number> = {};
    for (const t of load().transactions) {
      const k = t.date.slice(0, 7);
      out[k] = (out[k] ?? 0) + (t.kind === "receita" ? t.amount_cents : -t.amount_cents);
    }
    return out;
  },
  async savePushSub() {
    /* sem notificações no modo demonstração */
  },
  async deletePushSub() {},
  async listRecurring() {
    return load().recurring ?? [];
  },
  async saveRecurring({ id, ...r }) {
    mutate((db) => {
      const list = db.recurring ?? [];
      db.recurring = id ? list.map((x) => (x.id === id ? { ...x, ...r } : x)) : [...list, { id: uid(), ...r }];
    });
  },
  async deleteRecurring(id) {
    mutate((db) => {
      db.recurring = (db.recurring ?? []).filter((x) => x.id !== id);
    });
  },
  async listBudgets() {
    return load().budgets ?? [];
  },
  async saveBudget(b) {
    mutate((db) => {
      const list = (db.budgets ?? []).filter((x) => x.category_id !== b.category_id);
      db.budgets = [...list, { id: uid(), ...b }];
    });
  },
  async deleteBudget(categoryId) {
    mutate((db) => {
      db.budgets = (db.budgets ?? []).filter((x) => x.category_id !== categoryId);
    });
  },
  async signOut() {
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* ignora */
    }
  },
};

export const repo: Repo = isCloud ? cloudRepo : localRepo;
