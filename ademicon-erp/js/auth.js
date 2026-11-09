/* =====================================================================
   auth.js - AUTENTICAÇÃO E SESSÃO (Supabase Auth)
   - Login, cadastro, recuperação de senha e logout
   - Proteção das páginas internas (redireciona quem não está logado)

   NÃO existe sistema próprio de senhas: tudo é feito pelo Supabase Auth.
   Nas páginas de login/cadastro/recuperação, este arquivo se inicia
   sozinho (veja o final). Nas páginas internas, o script da página chama
   Auth.exigirLogin().
   ===================================================================== */

const Auth = (function () {
  const PAGINA_LOGIN = "login.html";
  const PAGINA_INICIAL = "dashboard.html"; // para onde vai depois de entrar

  /* ---------------------------------------------------------------
     Aviso quando o config.js ainda não foi preenchido
     --------------------------------------------------------------- */
  function avisoSemConfiguracao(elementoMensagem) {
    const texto =
      "O sistema ainda não está conectado ao Supabase. Preencha a URL e a chave pública em js/config.js (veja o README).";
    if (elementoMensagem) {
      Utils.mostrarMensagem(elementoMensagem, texto, "erro");
    } else {
      const aviso = document.createElement("div");
      aviso.className = "msg msg--erro msg--topo";
      aviso.setAttribute("role", "alert");
      aviso.textContent = texto;
      (document.querySelector("main") || document.body).prepend(aviso);
    }
  }

  /* ---------------------------------------------------------------
     PÁGINAS INTERNAS
     Chame no começo do script de cada página protegida:
        const usuario = await Auth.exigirLogin();
        if (!usuario) return;
     --------------------------------------------------------------- */
  async function exigirLogin() {
    if (!window.db) {
      avisoSemConfiguracao();
      return null;
    }

    const { data, error } = await window.db.auth.getSession();
    if (error || !data.session) {
      window.location.replace(PAGINA_LOGIN);
      return null;
    }

    // Reage a mudanças: logout em outra aba, sessão expirada etc.
    window.db.auth.onAuthStateChange((evento) => {
      if (evento === "SIGNED_OUT") window.location.replace(PAGINA_LOGIN);
    });

    // O botão "Sair" é criado pelo menu (Utils.montarMenu).
    const botaoSair = document.getElementById("btn-sair");
    if (botaoSair) botaoSair.addEventListener("click", sair);

    await preencherUsuario(data.session.user);
    return data.session.user;
  }

  // Mostra nome e e-mail do funcionário no menu lateral.
  async function preencherUsuario(user) {
    const elNome = document.getElementById("usuario-nome");
    const elEmail = document.getElementById("usuario-email");
    let nome = user.user_metadata?.full_name || user.email;

    try {
      const { data } = await window.db.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
      if (data?.full_name) nome = data.full_name;
    } catch (e) {
      /* se falhar, usamos o nome guardado no cadastro */
    }
    if (elNome) elNome.textContent = nome;
    if (elEmail) elEmail.textContent = user.email;
  }

  // Encerra a sessão com segurança e volta para o login.
  async function sair() {
    try {
      await window.db.auth.signOut();
    } catch (e) {
      console.error(e);
    }
    window.location.replace(PAGINA_LOGIN);
  }

  /* ---------------------------------------------------------------
     Páginas públicas: se já estiver logado, vai direto para o painel.
     --------------------------------------------------------------- */
  async function redirecionarSeLogado() {
    if (!window.db) return;
    const { data } = await window.db.auth.getSession();
    if (data.session) window.location.replace(PAGINA_INICIAL);
  }

  // Botão "mostrar/ocultar senha" (qualquer botão com data-alternar-senha="id-do-campo").
  function ligarMostrarSenha() {
    document.querySelectorAll("[data-alternar-senha]").forEach((botao) => {
      botao.addEventListener("click", () => {
        const campo = document.getElementById(botao.dataset.alternarSenha);
        const visivel = campo.type === "text";
        campo.type = visivel ? "password" : "text";
        botao.setAttribute("aria-pressed", String(!visivel));
        botao.setAttribute("aria-label", visivel ? "Mostrar senha" : "Ocultar senha");
        botao.textContent = visivel ? "Mostrar" : "Ocultar";
      });
    });
  }

  /* ---------------------------------------------------------------
     LOGIN
     --------------------------------------------------------------- */
  async function iniciarLogin() {
    const form = document.getElementById("form-login");
    const msg = document.getElementById("mensagem");
    const botao = document.getElementById("btn-entrar");
    ligarMostrarSenha();

    // Mensagem vinda de outras telas (ex.: "senha alterada com sucesso").
    const aviso = new URLSearchParams(window.location.search).get("aviso");
    if (aviso === "senha-alterada") Utils.mostrarMensagem(msg, "Senha alterada com sucesso. Entre com a nova senha.", "sucesso");

    if (!window.db) return avisoSemConfiguracao(msg);
    await redirecionarSeLogado();

    form.addEventListener("submit", async (evento) => {
      evento.preventDefault();
      Utils.mostrarMensagem(msg, "");

      const email = form.email.value.trim();
      const senha = form.senha.value;

      if (!Utils.emailValido(email)) return Utils.mostrarMensagem(msg, "Informe um e-mail válido.");
      if (!senha) return Utils.mostrarMensagem(msg, "Informe sua senha.");

      Utils.carregandoBotao(botao, true, "Entrando...");
      try {
        const { error } = await window.db.auth.signInWithPassword({ email, password: senha });
        if (error) throw error;
        window.location.replace(PAGINA_INICIAL);
      } catch (erro) {
        Utils.mostrarMensagem(msg, Utils.traduzirErro(erro));
        Utils.carregandoBotao(botao, false);
      }
    });
  }

  /* ---------------------------------------------------------------
     CADASTRO
     --------------------------------------------------------------- */
  async function iniciarCadastro() {
    const form = document.getElementById("form-cadastro");
    const msg = document.getElementById("mensagem");
    const botao = document.getElementById("btn-cadastrar");
    ligarMostrarSenha();

    if (!window.db) return avisoSemConfiguracao(msg);
    await redirecionarSeLogado();

    form.addEventListener("submit", async (evento) => {
      evento.preventDefault();
      Utils.mostrarMensagem(msg, "");

      const nome = form.nome.value.trim().replace(/\s+/g, " ");
      const email = form.email.value.trim();
      const senha = form.senha.value;
      const confirma = form.confirma.value;

      if (nome.length < 3 || !nome.includes(" ")) return Utils.mostrarMensagem(msg, "Informe seu nome completo (nome e sobrenome).");
      if (!Utils.emailValido(email)) return Utils.mostrarMensagem(msg, "Informe um e-mail válido.");
      const erroSenha = Utils.validarSenha(senha);
      if (erroSenha) return Utils.mostrarMensagem(msg, erroSenha);
      if (senha !== confirma) return Utils.mostrarMensagem(msg, "As senhas não são iguais.");

      Utils.carregandoBotao(botao, true, "Criando conta...");
      try {
        const { data, error } = await window.db.auth.signUp({
          email,
          password: senha,
          options: {
            data: { full_name: nome }, // o gatilho do banco usa isto para criar o perfil
            emailRedirectTo: new URL(PAGINA_LOGIN, window.location.href).href,
          },
        });
        if (error) throw error;

        // Quando o e-mail já existe e a confirmação está ligada, o Supabase
        // devolve um usuário sem "identities" (para não revelar quem tem conta).
        if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
          throw new Error("User already registered");
        }

        if (data.session) {
          // Confirmação de e-mail desligada no projeto: já está logado.
          window.location.replace(PAGINA_INICIAL);
        } else {
          form.reset();
          Utils.mostrarMensagem(
            msg,
            "Conta criada! Enviamos um e-mail de confirmação. Clique no link dele e depois entre no sistema.",
            "sucesso"
          );
          Utils.carregandoBotao(botao, false);
        }
      } catch (erro) {
        Utils.mostrarMensagem(msg, Utils.traduzirErro(erro));
        Utils.carregandoBotao(botao, false);
      }
    });
  }

  /* ---------------------------------------------------------------
     RECUPERAÇÃO DE SENHA (2 etapas na mesma página)
     Etapa 1: o usuário informa o e-mail e recebe um link.
     Etapa 2: ao clicar no link, volta para esta página e o Supabase
              dispara o evento PASSWORD_RECOVERY; mostramos o formulário
              de nova senha.
     --------------------------------------------------------------- */
  async function iniciarRecuperacao() {
    const formEmail = document.getElementById("form-recuperar");
    const formNova = document.getElementById("form-nova-senha");
    const msg = document.getElementById("mensagem");
    const botaoEmail = document.getElementById("btn-enviar-link");
    const botaoNova = document.getElementById("btn-salvar-senha");
    const frase = document.getElementById("frase-lateral");
    ligarMostrarSenha();

    if (!window.db) return avisoSemConfiguracao(msg);

    function mostrarEtapaNovaSenha() {
      formEmail.hidden = true;
      formNova.hidden = false;
      if (frase) frase.textContent = "“Quase lá, escolha uma nova senha para sua conta”";
      Utils.mostrarMensagem(msg, "");
    }

    // O link do e-mail traz "type=recovery" na URL.
    const veioDoLink = /type=recovery/.test(window.location.hash + window.location.search);
    if (veioDoLink) mostrarEtapaNovaSenha();

    window.db.auth.onAuthStateChange((evento) => {
      if (evento === "PASSWORD_RECOVERY") mostrarEtapaNovaSenha();
    });

    // Etapa 1: pedir o link por e-mail.
    formEmail.addEventListener("submit", async (evento) => {
      evento.preventDefault();
      Utils.mostrarMensagem(msg, "");
      const email = formEmail.email.value.trim();
      if (!Utils.emailValido(email)) return Utils.mostrarMensagem(msg, "Informe um e-mail válido.");

      Utils.carregandoBotao(botaoEmail, true, "Enviando...");
      try {
const { error } = await window.db.auth.resetPasswordForEmail(email, {
  redirectTo: window.location.origin + window.location.pathname, // Isso pega automaticamente localhost ou Vercel correto
});
        });
        if (error) throw error;
        // Mensagem neutra: não revela se o e-mail tem conta ou não.
        Utils.mostrarMensagem(
          msg,
          "Se existir uma conta com este e-mail, enviamos um link para redefinir a senha. Verifique também o spam.",
          "sucesso"
        );
      } catch (erro) {
        Utils.mostrarMensagem(msg, Utils.traduzirErro(erro));
      }
      Utils.carregandoBotao(botaoEmail, false);
    });

    // Etapa 2: salvar a nova senha.
    formNova.addEventListener("submit", async (evento) => {
      evento.preventDefault();
      Utils.mostrarMensagem(msg, "");
      const senha = formNova.senha.value;
      const confirma = formNova.confirma.value;

      const erroSenha = Utils.validarSenha(senha);
      if (erroSenha) return Utils.mostrarMensagem(msg, erroSenha);
      if (senha !== confirma) return Utils.mostrarMensagem(msg, "As senhas não são iguais.");

      Utils.carregandoBotao(botaoNova, true, "Salvando...");
      try {
        const { error } = await window.db.auth.updateUser({ password: senha });
        if (error) throw error;
        await window.db.auth.signOut();
        window.location.replace(`${PAGINA_LOGIN}?aviso=senha-alterada`);
      } catch (erro) {
        Utils.mostrarMensagem(msg, Utils.traduzirErro(erro));
        Utils.carregandoBotao(botaoNova, false);
      }
    });
  }

  return { exigirLogin, sair, iniciarLogin, iniciarCadastro, iniciarRecuperacao };
})();

/* Inicia sozinho nas páginas públicas (o <body> indica qual é a página). */
document.addEventListener("DOMContentLoaded", () => {
  const pagina = document.body.dataset.pagina;
  if (pagina === "login") Auth.iniciarLogin();
  if (pagina === "cadastro") Auth.iniciarCadastro();
  if (pagina === "recuperar-senha") Auth.iniciarRecuperacao();
});
