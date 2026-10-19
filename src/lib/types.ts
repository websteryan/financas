export type AccountType = "credito" | "debito" | "pix" | "dinheiro";
export type Kind = "despesa" | "receita";

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  color: string;
}

export interface Category {
  id: string;
  name: string;
  kind: Kind;
  color: string;
}

export interface Transaction {
  id: string;
  kind: Kind;
  amount_cents: number;
  description: string;
  date: string; // YYYY-MM-DD
  account_id: string;
  category_id: string | null;
  group_id: string | null;
  installment: number | null;
  installments: number | null;
  created_at?: string;
}

export type NewTransaction = Omit<Transaction, "id" | "created_at">;

export const ACCOUNT_TYPE_LABEL: Record<AccountType, string> = {
  credito: "Crédito",
  debito: "Débito",
  pix: "Pix",
  dinheiro: "Dinheiro",
};

export const PALETTE = [
  "#6d4af0",
  "#3b82f6",
  "#14b8a6",
  "#22c55e",
  "#84cc16",
  "#eab308",
  "#f97316",
  "#ef4444",
  "#ec4899",
  "#8b5cf6",
  "#06b6d4",
  "#8b8b93",
];
