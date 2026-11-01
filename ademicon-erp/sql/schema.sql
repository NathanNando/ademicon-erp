-- =====================================================================
-- ERP Ademicon - ESTRUTURA DO BANCO (tabelas, índices e gatilhos)
-- Execute este arquivo PRIMEIRO no SQL Editor do Supabase.
-- Depois execute policies.sql (segurança) e, se quiser, seed.sql.
-- É seguro rodar mais de uma vez (usa "if not exists" / "or replace").
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1) PERFIS DE USUÁRIOS
-- Uma linha por funcionário. O "id" é o mesmo id do Supabase Auth.
-- A senha NUNCA fica aqui: quem guarda a senha (criptografada) é o Auth.
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  full_name  text        not null check (char_length(btrim(full_name)) between 2 and 150),
  email      text        not null,
  created_at timestamptz not null default now()
);

comment on table public.profiles is 'Perfil de cada funcionário (ligado ao Supabase Auth).';


-- ---------------------------------------------------------------------
-- 2) CLIENTES
-- "created_by" identifica o funcionário responsável pelo cadastro.
-- Por padrão, cada funcionário só enxerga os clientes que ele criou
-- (isso é garantido pelas políticas RLS em policies.sql).
-- ---------------------------------------------------------------------
create table if not exists public.customers (
  id            uuid primary key default gen_random_uuid(),

  name          text        not null check (char_length(btrim(name)) between 2 and 150),

  -- Apenas dígitos (a máscara é só visual, no navegador).
  document      text        not null,
  customer_type text        not null default 'pf' check (customer_type in ('pf', 'pj')),

  email         text        check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone         text        check (phone is null or phone ~ '^[0-9]{10,11}$'),

  -- Data de nascimento (pessoa física) ou de abertura (pessoa jurídica).
  birth_date    date        check (birth_date is null or birth_date <= current_date),

  city          text,
  state         char(2)     check (state is null or state ~ '^[A-Z]{2}$'),
  address       text,

  status        text        not null default 'ativo' check (status in ('ativo', 'inativo')),
  notes         text,

  created_by    uuid        not null default auth.uid() references public.profiles (id) on delete restrict,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  -- Exclusão lógica: o registro some das telas, mas continua no banco
  -- para manter o histórico comercial (rastreabilidade / LGPD).
  deleted_at    timestamptz,

  -- CPF tem 11 dígitos e CNPJ tem 14 (o tipo do cliente decide qual).
  constraint customers_document_len check (
    (customer_type = 'pf' and document ~ '^[0-9]{11}$') or
    (customer_type = 'pj' and document ~ '^[0-9]{14}$')
  )
);

comment on table  public.customers            is 'Clientes cadastrados pelos funcionários.';
comment on column public.customers.document   is 'CPF (11 dígitos) ou CNPJ (14 dígitos), somente números.';
comment on column public.customers.deleted_at is 'Preenchido quando o cliente é excluído (exclusão lógica).';

-- Impede cadastrar o mesmo documento duas vezes para o mesmo funcionário
-- (ignora clientes já excluídos).
create unique index if not exists customers_unique_document_per_user
  on public.customers (created_by, document)
  where deleted_at is null;

-- Índices para deixar listagens, buscas e relatórios rápidos.
create index if not exists customers_created_by_idx  on public.customers (created_by, created_at desc);
create index if not exists customers_status_idx      on public.customers (created_by, status);
create index if not exists customers_name_idx        on public.customers (created_by, lower(name));


-- ---------------------------------------------------------------------
-- 3) GATILHO: atualiza "updated_at" automaticamente a cada edição
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists customers_set_updated_at on public.customers;
create trigger customers_set_updated_at
  before update on public.customers
  for each row execute function public.set_updated_at();


-- ---------------------------------------------------------------------
-- 4) GATILHO: cria o perfil automaticamente quando alguém se cadastra
-- O nome completo vem do formulário de cadastro (raw_user_meta_data).
-- "security definer" é necessário porque quem executa é o sistema de
-- autenticação, não o usuário.
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Ninguém precisa chamar essas funções diretamente pela API.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.set_updated_at()  from public, anon, authenticated;
