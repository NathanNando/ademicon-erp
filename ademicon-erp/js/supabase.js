/* =====================================================================
   supabase.js - CONEXÃO COM O SUPABASE
   Cria o cliente do Supabase uma única vez e o disponibiliza para os
   outros arquivos como "window.db".
   Este arquivo só cuida da conexão; as regras de negócio ficam nos demais.

   Ordem de carregamento nas páginas:
     1) biblioteca @supabase/supabase-js (CDN)
     2) config.js
     3) supabase.js   <- este arquivo
   ===================================================================== */

(function () {
  const cfg = window.APP_CONFIG || {};

  // Verdadeiro quando o config.js ainda está com os textos de exemplo.
  const naoConfigurado =
    !cfg.SUPABASE_URL ||
    !cfg.SUPABASE_ANON_KEY ||
    cfg.SUPABASE_URL.startsWith("COLE_AQUI") ||
    cfg.SUPABASE_ANON_KEY.startsWith("COLE_AQUI");

  window.SUPABASE_CONFIGURADO = !naoConfigurado;

  if (naoConfigurado) {
    console.warn("Supabase não configurado. Edite js/config.js (veja o README).");
    window.db = null;
    return;
  }

  if (!window.supabase || !window.supabase.createClient) {
    console.error("A biblioteca do Supabase não carregou. Verifique sua conexão com a internet.");
    window.db = null;
    return;
  }

  // O cliente guarda e renova a sessão do usuário automaticamente.
  window.db = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,      // mantém o login ao recarregar a página
      autoRefreshToken: true,    // renova o token antes de expirar
      detectSessionInUrl: true,  // necessário para o link de recuperação de senha
    },
  });
})();
