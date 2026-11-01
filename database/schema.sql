create extension if not exists pgcrypto;

create table if not exists public.employees (
    id uuid primary key default gen_random_uuid(),
    auth_user_id uuid unique not null,
    full_name text not null,
    email text not null unique,
    role text not null check (role in ('admin', 'manager', 'sales', 'finance')),
    active boolean not null default false,
    created_at timestamptz not null default now()
);

create table if not exists public.clients (
    id uuid primary key default gen_random_uuid(),
    full_name text not null,
    document text,
    phone text,
    email text,
    created_by uuid references public.employees(id),
    created_at timestamptz not null default now()
);

create index if not exists clients_full_name_idx on public.clients using btree (full_name);
create index if not exists clients_created_at_idx on public.clients (created_at desc);

create table if not exists public.consortium_groups (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    administrator text,
    status text not null default 'active' check (status in ('active', 'inactive')),
    created_at timestamptz not null default now()
);

create table if not exists public.proposals (
    id uuid primary key default gen_random_uuid(),
    client_id uuid not null references public.clients(id),
    group_id uuid references public.consortium_groups(id),
    seller_id uuid references public.employees(id),
    credit_amount numeric(14,2) not null default 0,
    status text not null default 'pending' check (status in ('pending', 'analysis', 'approved', 'rejected', 'cancelled')),
    created_at timestamptz not null default now()
);

create table if not exists public.sales (
    id uuid primary key default gen_random_uuid(),
    proposal_id uuid references public.proposals(id),
    seller_id uuid references public.employees(id),
    sale_amount numeric(14,2) not null default 0,
    commission_amount numeric(14,2) not null default 0,
    status text not null default 'pending' check (status in ('pending', 'confirmed', 'cancelled')),
    created_at timestamptz not null default now()
);

create table if not exists public.sales_goals (
    id uuid primary key default gen_random_uuid(),
    employee_id uuid references public.employees(id),
    month date not null,
    target_amount numeric(14,2) not null default 0,
    created_at timestamptz not null default now(),
    unique(employee_id, month)
);

create table if not exists public.commissions (
    id uuid primary key default gen_random_uuid(),
    sale_id uuid references public.sales(id),
    employee_id uuid references public.employees(id),
    amount numeric(14,2) not null default 0,
    status text not null default 'pending' check (status in ('pending', 'approved', 'paid')),
    created_at timestamptz not null default now()
);

create table if not exists public.financial_transactions (
    id uuid primary key default gen_random_uuid(),
    description text not null,
    amount numeric(14,2) not null,
    transaction_type text not null check (transaction_type in ('income', 'expense')),
    due_date date,
    status text not null default 'pending' check (status in ('pending', 'paid', 'cancelled')),
    created_by uuid references public.employees(id),
    created_at timestamptz not null default now()
);

-- RLS deve ser habilitado e revisado antes de expor acesso direto pelo cliente.
-- Neste starter, os dados empresariais são acessados pela API com validação de funcionário.
alter table public.employees enable row level security;
alter table public.clients enable row level security;
alter table public.consortium_groups enable row level security;
alter table public.proposals enable row level security;
alter table public.sales enable row level security;
alter table public.sales_goals enable row level security;
alter table public.commissions enable row level security;
alter table public.financial_transactions enable row level security;
