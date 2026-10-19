-- Finanças: esquema do banco (cole tudo no SQL Editor do Supabase e clique em Run)

create extension if not exists "pgcrypto";

-- Contas (cartão de crédito, débito, pix, dinheiro)
create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('credito', 'debito', 'pix', 'dinheiro')),
  color text not null default '#7c6af2',
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
create index if not exists transactions_group_idx on public.transactions (group_id);

-- Segurança: cada usuário só enxerga e altera os próprios dados
alter table public.accounts enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;

drop policy if exists "own accounts" on public.accounts;
create policy "own accounts" on public.accounts
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "own categories" on public.categories;
create policy "own categories" on public.categories
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "own transactions" on public.transactions;
create policy "own transactions" on public.transactions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Ao criar uma conta de usuário, já cria contas e categorias padrão (pode editar depois)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.accounts (user_id, name, type, color) values
    (new.id, 'Cartão de crédito', 'credito', '#7c6af2'),
    (new.id, 'Conta corrente', 'debito', '#3b82f6'),
    (new.id, 'Pix', 'pix', '#14b8a6');

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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
