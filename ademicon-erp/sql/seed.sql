-- =====================================================================
-- ERP Ademicon - DADOS DE EXEMPLO (OPCIONAL, só para testes)
--
-- Serve apenas para você ver o sistema "cheio" durante o desenvolvimento.
-- NÃO execute em produção. Os clientes abaixo são fictícios e os CPFs/CNPJs
-- são números de teste válidos.
--
-- COMO USAR:
--   1. Crie sua conta pela tela de cadastro do sistema.
--   2. Troque o e-mail abaixo pelo e-mail da conta que você criou.
--   3. Execute este arquivo no SQL Editor do Supabase.
-- =====================================================================

do $$
declare
  v_email text := 'nathanfs2205@gmail.com';   -- <<< TROQUE AQUI
  v_user  uuid;
begin
  select id into v_user from public.profiles where email = v_email;

  if v_user is null then
    raise exception 'Perfil não encontrado para o e-mail "%". Crie a conta pelo sistema primeiro.', v_email;
  end if;

  insert into public.customers
    (name, document, customer_type, email, phone, birth_date, city, state, address, status, notes, created_by, created_at, updated_at)
  values
    ('Mariana Costa Ribeiro', '52998224725', 'pf', 'mariana@exemplo.com', '11987654321', '1988-04-12', 'São Paulo', 'SP', 'Rua das Flores, 120', 'ativo',   'Interesse em consórcio de imóvel.', v_user, now() - interval '70 days', now() - interval '70 days'),
    ('João Pedro Almeida',    '11144477735', 'pf', 'joao@exemplo.com',     '21991234567', '1979-11-03', 'Rio de Janeiro', 'RJ', 'Av. Atlântica, 800', 'ativo', 'Quer simular carta de crédito para veículo.', v_user, now() - interval '45 days', now() - interval '45 days'),
    ('Ana Beatriz Souza',     '39053344705', 'pf', 'ana@exemplo.com',      '31988776655', '1992-07-21', 'Belo Horizonte', 'MG', 'Rua da Bahia, 45', 'inativo', null, v_user, now() - interval '30 days', now() - interval '30 days'),
    ('Construtora Horizonte Ltda', '11222333000181', 'pj', 'contato@horizonte.exemplo.com', '1133445566', '2010-02-15', 'Campinas', 'SP', 'Av. Brasil, 1500', 'ativo', 'Avalia consórcio para frota de caminhões.', v_user, now() - interval '12 days', now() - interval '12 days'),
    ('Mercado Boa Compra ME',  '45723174000110', 'pj', 'financeiro@boacompra.exemplo.com', '4132221100', '2015-09-30', 'Curitiba', 'PR', 'Rua XV de Novembro, 300', 'ativo', null, v_user, now() - interval '3 days', now() - interval '3 days')
  on conflict do nothing;
end $$;
