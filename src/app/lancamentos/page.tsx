"use client";

import { useMemo, useState } from "react";
import { MagnifyingGlass } from "@/components/icons";
import { PageHeader } from "@/components/PageHeader";
import { TransactionList } from "@/components/TransactionList";
import { Button, Chip, Empty, Segmented, Skeleton, inputClass } from "@/components/ui";
import { money } from "@/lib/format";
import { totals, useFinance } from "@/lib/store";

type Filter = "tudo" | "despesa" | "receita";

const normalize = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export default function LancamentosPage() {
  const f = useFinance();
  const [kind, setKind] = useState<Filter>("tudo");
  const [account, setAccount] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const items = useMemo(() => {
    const q = normalize(query.trim());
    return f.monthTx.filter((t) => {
      if (kind !== "tudo" && t.kind !== kind) return false;
      if (account && t.account_id !== account) return false;
      if (q) {
        const cat = f.categoryById(t.category_id)?.name ?? "";
        if (!normalize(`${t.description} ${cat}`).includes(q)) return false;
      }
      return true;
    });
  }, [f, kind, account, query]);

  const t = totals(items);

  return (
    <div className="fade-in">
      <PageHeader title="Lançamentos" />

      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center">
        <Segmented
          className="lg:w-80"
          value={kind}
          onChange={setKind}
          options={[
            { value: "tudo", label: "Tudo" },
            { value: "despesa", label: "Gastos" },
            { value: "receita", label: "Receitas" },
          ]}
        />
        <div className="relative flex-1">
          <MagnifyingGlass size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <label htmlFor="busca" className="sr-only">
            Buscar
          </label>
          <input
            id="busca"
            type="search"
            className={`${inputClass} pl-10`}
            placeholder="Buscar por descrição ou categoria"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {f.accounts.length > 1 && (
        <div className="no-scrollbar -mx-4 mb-5 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
          <Chip active={account === null} onClick={() => setAccount(null)}>
            Todas as contas
          </Chip>
          {f.accounts.map((a) => (
            <Chip key={a.id} active={account === a.id} color={a.color} onClick={() => setAccount(account === a.id ? null : a.id)}>
              {a.name}
            </Chip>
          ))}
        </div>
      )}

      <div className="card p-3 sm:p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line px-2 pb-3 text-[13px] text-muted">
          <span>
            {items.length} {items.length === 1 ? "lançamento" : "lançamentos"}
          </span>
          <span className="num flex gap-4">
            {kind !== "despesa" && <span className="text-income">+ {money(t.income)}</span>}
            {kind !== "receita" && <span className="text-fg">- {money(t.expense)}</span>}
          </span>
        </div>
        <div className="pt-3">
          {f.loading ? (
            <div className="flex flex-col gap-3 p-2">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <Empty
              title={f.monthTx.length ? "Nenhum resultado" : "Nada lançado neste mês"}
              text={f.monthTx.length ? "Tente outro filtro ou outra busca." : "Use o botão + para registrar o primeiro."}
              action={
                !f.monthTx.length && (
                  <Button variant="primary" onClick={f.openNew}>
                    Novo lançamento
                  </Button>
                )
              }
            />
          ) : (
            <TransactionList items={items} />
          )}
        </div>
      </div>
    </div>
  );
}
