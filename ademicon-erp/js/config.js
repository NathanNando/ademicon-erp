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

  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InByb254Z3BobHBoYWluZmtzYnp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM0MTQyMDksImV4cCI6MjEwODk5MDIwOX0.SzLByIrFkFb0gFBYCDB9YfHvokwGAlfdAfscS2Id3ww",  // começa com "eyJ..." ou "sb_publishable_..."

  // Quantidade de clientes por página na tela "Seus Clientes".
  PAGE_SIZE: 10,
};
