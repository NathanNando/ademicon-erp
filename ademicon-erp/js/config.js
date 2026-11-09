/* =====================================================================
   config.js - CONFIGURAÇÃO DO PROJETO
   Este é o ÚNICO arquivo que você precisa editar para conectar o sistema
   ao seu projeto Supabase.

   Onde encontrar os valores:
   Supabase > seu projeto > Project Settings > API
     - Project URL  -> SUPABASE_URL
     - Project API keys > "anon" / "public" (ou "publishable") -> SUPABASE_ANON_KEY

   ATENÇÃO: use SOMENTE a chave pública (anon/publishable).
   NUNCA coloque a chave "service_role" aqui: ela ignora toda a segurança
   e qualquer pessoa conseguiria vê-la no navegador.
   A chave anon é pública por natureza; quem protege os dados são as
   políticas RLS (sql/policies.sql).
   ===================================================================== */

window.APP_CONFIG = {
  SUPABASE_URL: "https://pronxgphlphainfksbzz.supabase.co",

  SUPABASE_ANON_KEY: "sb_publishable_AcfXhuu3D37DEsBJdU1pQw_qtMao_Le",  // começa com "eyJ..." ou "sb_publishable_..."

  // Quantidade de clientes por página na tela "Seus Clientes".
  PAGE_SIZE: 10,
};
