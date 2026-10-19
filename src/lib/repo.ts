import { isCloud } from "./supabase/config";
import { supabaseBrowser } from "./supabase/client";
import { addMonthsISO, currentYM, monthStart, shiftYM, todayISO, uid } from "./format";
import type { Account, Category, NewTransaction, Transaction } from "./types";

export interface Repo {
  listAccounts(): Promise<Account[]>;
  saveAccount(a: Omit<Account, "id"> & { id?: string }): Promise<void>;
  deleteAccount(id: string): Promise<void>;
  listCategories(): Promise<Category[]>;
  saveCategory(c: Omit<Category, "id"> & { id?: string }): Promise<void>;
  deleteCategory(id: string): Promise<void>;
  listTransactions(from: string, to: string): Promise<Transaction[]>;
  listAllTransactions(): Promise<Transaction[]>;
  addTransactions(rows: NewTransaction[]): Promise<void>;
  updateTransaction(id: string, patch: Partial<NewTransaction>): Promise<void>;
  deleteTransaction(id: string): Promise<void>;
  deleteGroup(groupId: string): Promise<void>;
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
  async listCategories() {
    const sb = supabaseBrowser();
    return check(await sb.from("categories").select("id,name,kind,color").order("created_at"));
  },
  async saveCategory({ id, ...c }) {
    const sb = supabaseBrowser();
    if (id) check(await sb.from("categories").update(c).eq("id", id));
    else check(await sb.from("categories").insert(c));
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
  async addTransactions(rows) {
    check(await supabaseBrowser().from("transactions").insert(rows));
  },
  async updateTransaction(id, patch) {
    check(await supabaseBrowser().from("transactions").update(patch).eq("id", id));
  },
  async deleteTransaction(id) {
    check(await supabaseBrowser().from("transactions").delete().eq("id", id));
  },
  async deleteGroup(groupId) {
    check(await supabaseBrowser().from("transactions").delete().eq("group_id", groupId));
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
}

const KEY = "financas-demo-v1";

function seed(): LocalDB {
  const accounts: Account[] = [
    { id: uid(), name: "Nubank", type: "credito", color: "#6d4af0" },
    { id: uid(), name: "Itaú", type: "debito", color: "#f97316" },
    { id: uid(), name: "Pix", type: "pix", color: "#14b8a6" },
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
  const [card, debit, pix] = accounts.map((a) => a.id);
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
  ) => {
    const ym = shiftYM(now, -monthsAgo);
    const date = monthStart(ym).slice(0, 8) + String(day).padStart(2, "0");
    if (monthsAgo === 0 && date > today) return;
    tx.push({
      id: uid(), kind, amount_cents: cents, description, date,
      account_id: account, category_id: cat(category),
      group_id: null, installment: null, installments: null,
    });
  };
  // salários organizados e gastos com valores variados (dados fictícios)
  for (let i = 0; i < 6; i++) {
    const v = 1 + ((i * 7) % 5) / 40;
    add(i, 5, "receita", 685000, "Salário", debit, "Salário");
    if (i % 2 === 0) add(i, 18, "receita", Math.round(124000 * v), "Projeto freelance", pix, "Freelance");
    add(i, 10, "despesa", 189000, "Aluguel", debit, "Moradia");
    add(i, 12, "despesa", Math.round(61237 * v), "Supermercado", card, "Mercado");
    add(i, 3, "despesa", 5590, "Streaming e música", card, "Assinaturas");
    add(i, 8, "despesa", Math.round(14320 * v), "Combustível", card, "Transporte");
    add(i, 14, "despesa", Math.round(8790 * v), "Almoço", pix, "Alimentação");
    add(i, 16, "despesa", Math.round(23150 / v), "Restaurante", card, "Alimentação");
    add(i, 2, "despesa", Math.round(4280 * v), "Uber", pix, "Transporte");
    add(i, 21, "despesa", Math.round(16900 / v), "Cinema e bar", card, "Lazer");
    if (i % 3 === 1) add(i, 9, "despesa", 31000, "Consulta", debit, "Saúde");
  }
  // uma compra parcelada
  const group = uid();
  const first = monthStart(shiftYM(now, -1)).slice(0, 8) + "20";
  for (let k = 0; k < 4; k++) {
    tx.push({
      id: uid(), kind: "despesa", amount_cents: 32475, description: "Fone de ouvido",
      date: addMonthsISO(first, k), account_id: card, category_id: cat("Outros"),
      group_id: group, installment: k + 1, installments: 4,
    });
  }
  return { accounts, categories, transactions: tx };
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
  async signOut() {
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* ignora */
    }
  },
};

export const repo: Repo = isCloud ? cloudRepo : localRepo;
