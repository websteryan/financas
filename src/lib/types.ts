export type AccountType = "credito" | "debito" | "pix" | "dinheiro";
export type Kind = "despesa" | "receita";
/** Forma de pagamento de um lançamento (a mesma conta aceita todas). */
export type PaymentMethod = "credito" | "debito" | "pix" | "dinheiro";

export const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  credito: "Crédito",
  debito: "Débito",
  pix: "Pix",
  dinheiro: "Dinheiro",
};

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
  /** Chave do ícone (veja category-icons). Vazio: deduzido pelo nome. */
  icon?: string | null;
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
  /** Pode faltar em lançamentos antigos; use methodOf(). */
  method?: PaymentMethod | null;
  /** Movimentos que não são gasto nem receita: ajuste de saldo e transferência entre contas. */
  special?: SpecialKind | null;
  created_at?: string;
}

/** Forma de pagamento: a gravada ou, em lançamentos antigos, a deduzida do tipo antigo da conta. */
export function methodOf(tx: Pick<Transaction, "method">, account?: Pick<Account, "type">): PaymentMethod {
  return tx.method ?? account?.type ?? "debito";
}

export type SpecialKind = "ajuste" | "transferencia";

export type NewTransaction = Omit<Transaction, "id" | "created_at">;

export interface Budget {
  id: string;
  category_id: string;
  limit_cents: number;
}

export type InvestmentType = "renda_fixa" | "acoes" | "fiis" | "cripto" | "fundos" | "outros";

export interface Investment {
  id: string;
  name: string;
  type: InvestmentType;
  institution: string;
  amount_cents: number;
  date: string; // YYYY-MM-DD
  created_at?: string;
}

export type NewInvestment = Omit<Investment, "id" | "created_at">;

export const INVESTMENT_TYPE_LABEL: Record<InvestmentType, string> = {
  renda_fixa: "Renda fixa",
  acoes: "Ações",
  fiis: "FIIs",
  cripto: "Cripto",
  fundos: "Fundos",
  outros: "Outros",
};

export const INVESTMENT_TYPE_COLOR: Record<InvestmentType, string> = {
  renda_fixa: "#7545e8",
  acoes: "#3ccb8b",
  fiis: "#f2b84b",
  cripto: "#ff8a5b",
  fundos: "#4aa8ff",
  outros: "#8b8b98",
};

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
