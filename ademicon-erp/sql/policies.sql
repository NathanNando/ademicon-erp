-- =====================================================================
-- ERP Ademicon - SEGURANÇA (Row Level Security / RLS)
-- Execute DEPOIS de schema.sql.
--
-- REGRA DE ACESSO (padrão deste projeto):
--   Cada funcionário enxerga e gerencia SOMENTE os clientes que ele mesmo
--   cadastrou. Quem não está logado não acessa nada.
--
-- Mesmo que alguém altere o JavaScript do navegador, o banco continua
-- recusando o acesso: a segurança de verdade está aqui.
-- =====================================================================

-- Liga o RLS. Com ele ligado e sem política, NADA é permitido.
alter table public.profiles  enable row level security;
alter table public.customers enable row level security;

-- Garante que usuários não logados (anon) não tenham acesso às tabelas.
revoke all on public.profiles  from anon;
revoke all on public.customers from anon;

-- Limpa políticas antigas para o script poder ser executado de novo.
drop policy if exists "profiles_select_own"  on public.profiles;
drop policy if exists "profiles_update_own"  on public.profiles;
drop policy if exists "customers_select_own" on public.customers;
drop policy if exists "customers_insert_own" on public.customers;
drop policy if exists "customers_update_own" on public.customers;

-- ---------------------------------------------------------------------
-- PERFIS: cada usuário lê e edita apenas o próprio perfil.
-- (A criação do perfil é feita pelo gatilho handle_new_user.)
-- "(select auth.uid())" é mais rápido do que chamar auth.uid() direto.
-- ---------------------------------------------------------------------
create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()));

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using      (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- ---------------------------------------------------------------------
-- CLIENTES
-- Leitura, inclusão e edição: somente do próprio funcionário.
-- Na inclusão, "created_by" precisa ser o próprio usuário (ninguém
-- consegue cadastrar cliente "em nome de" outra pessoa).
-- ---------------------------------------------------------------------
create policy "customers_select_own"
  on public.customers for select
  to authenticated
  using (created_by = (select auth.uid()));

create policy "customers_insert_own"
  on public.customers for insert
  to authenticated
  with check (created_by = (select auth.uid()));

create policy "customers_update_own"
  on public.customers for update
  to authenticated
  using      (created_by = (select auth.uid()))
  with check (created_by = (select auth.uid()));

-- Não existe política de DELETE de propósito: o sistema faz EXCLUSÃO
-- LÓGICA (preenche deleted_at com um UPDATE). Assim nenhum cliente é
-- apagado de verdade por engano, e o histórico é preservado.
revoke delete on public.customers from authenticated;

-- ---------------------------------------------------------------------
-- OPCIONAL: compartilhar clientes entre TODOS os funcionários
-- Se a Ademicon quiser que toda a equipe veja os mesmos clientes, NÃO
-- basta trocar a regra acima por "using (true)": isso deixaria qualquer
-- pessoa que criar uma conta ver os dados. O caminho seguro é criar uma
-- tabela de empresas/equipes e de membros, e liberar o acesso só para
-- quem for membro. Se precisar, peça essa evolução.
-- ---------------------------------------------------------------------
