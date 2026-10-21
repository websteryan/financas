-- Finanças: esquema do banco (cole tudo no SQL Editor do Supabase e clique em Run)

create extension if not exists "pgcrypto";

-- Contas (cartão de crédito, débito, pix, dinheiro)
create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('credito', 'debito', 'pix', 'dinheiro')),
  color text not null default '#6d4af0',
  created_at timestamptz not null default now()
);

-- Categorias de gasto e de receita
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('despesa', 'receita')),
  color text not null default '#8b8b93',
  created_at timestamptz not null default now()
);

-- Lançamentos (valores em centavos para evitar erro de arredondamento)
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind text not null check (kind in ('despesa', 'receita')),
  amount_cents bigint not null check (amount_cents > 0),
  description text not null default '',
  date date not null,
  account_id uuid not null references public.accounts(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  group_id uuid,
  installment int,
  installments int,
  created_at timestamptz not null default now()
);

create index if not exists transactions_user_date_idx on public.transactions (user_id, date desc);
-- Forma de pagamento do gasto (credito, debito, pix, dinheiro); a mesma conta aceita todas
alter table public.transactions add column if not exists method text check (method in ('credito', 'debito', 'pix', 'dinheiro'));

create index if not exists transactions_group_idx on public.transactions (group_id);
create index if not exists transactions_account_idx on public.transactions (account_id);
create index if not exists transactions_category_idx on public.transactions (category_id);
create index if not exists accounts_user_idx on public.accounts (user_id);
create index if not exists categories_user_idx on public.categories (user_id);

-- Segurança: cada usuário só enxerga e altera os próprios dados
alter table public.accounts enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;

drop policy if exists "own accounts" on public.accounts;
create policy "own accounts" on public.accounts
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "own categories" on public.categories;
create policy "own categories" on public.categories
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "own transactions" on public.transactions;
create policy "own transactions" on public.transactions
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Investimentos (só registro de onde e quanto foi investido; valores em centavos)
create table if not exists public.investments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('renda_fixa','acoes','fiis','cripto','fundos','outros')),
  institution text not null default '',
  amount_cents bigint not null check (amount_cents > 0),
  date date not null,
  created_at timestamptz not null default now()
);
create index if not exists investments_user_date_idx on public.investments (user_id, date desc);
alter table public.investments enable row level security;
drop policy if exists "own investments" on public.investments;
create policy "own investments" on public.investments
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Orçamento mensal por categoria de gasto (valor em centavos)
create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  limit_cents bigint not null check (limit_cents > 0),
  created_at timestamptz not null default now(),
  unique (user_id, category_id)
);
alter table public.budgets enable row level security;
drop policy if exists "own budgets" on public.budgets;
create policy "own budgets" on public.budgets
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Ao criar uma conta de usuário, já cria contas e categorias padrão (pode editar depois)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.accounts (user_id, name, type, color) values
    (new.id, 'Conta principal', 'debito', '#7545e8'),
    (new.id, 'Carteira', 'dinheiro', '#14b8a6');

  insert into public.categories (user_id, name, kind, color) values
    (new.id, 'Alimentação', 'despesa', '#f97316'),
    (new.id, 'Mercado', 'despesa', '#eab308'),
    (new.id, 'Transporte', 'despesa', '#3b82f6'),
    (new.id, 'Moradia', 'despesa', '#8b5cf6'),
    (new.id, 'Saúde', 'despesa', '#ef4444'),
    (new.id, 'Lazer', 'despesa', '#ec4899'),
    (new.id, 'Educação', 'despesa', '#06b6d4'),
    (new.id, 'Assinaturas', 'despesa', '#6366f1'),
    (new.id, 'Compras', 'despesa', '#84cc16'),
    (new.id, 'Outros', 'despesa', '#8b8b93'),
    (new.id, 'Salário', 'receita', '#22c55e'),
    (new.id, 'Freelance', 'receita', '#14b8a6'),
    (new.id, 'Rendimentos', 'receita', '#0ea5e9'),
    (new.id, 'Outras receitas', 'receita', '#8b8b93');
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Ícone da categoria (chave do ícone escolhido no app)
alter table public.categories add column if not exists icon text;
