/* =====================================================================
   utils.js - FUNÇÕES REUTILIZÁVEIS
   Validação, máscaras, formatação, avisos na tela, menu lateral,
   gráficos simples e exportação CSV. Usado por todas as páginas.
   Tudo fica dentro do objeto "Utils" para não poluir o código global.
   ===================================================================== */

const Utils = (function () {
  /* ---------------------------------------------------------------
     1) TEXTO SEGURO
     Sempre que um texto vindo do usuário for escrito no HTML, passe
     por escapeHtml() para evitar injeção de código (XSS).
     --------------------------------------------------------------- */
  function escapeHtml(valor) {
    return String(valor ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  const somenteDigitos = (valor) => String(valor ?? "").replace(/\D/g, "");

  /* ---------------------------------------------------------------
     2) VALIDAÇÕES
     --------------------------------------------------------------- */
  function emailValido(email) {
    return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(email ?? "").trim());
  }

  // Valida CPF pelos dígitos verificadores.
  function cpfValido(valor) {
    const cpf = somenteDigitos(valor);
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
    const calcula = (tamanho) => {
      let soma = 0;
      for (let i = 0; i < tamanho; i++) soma += Number(cpf[i]) * (tamanho + 1 - i);
      const resto = (soma * 10) % 11;
      return resto === 10 ? 0 : resto;
    };
    return calcula(9) === Number(cpf[9]) && calcula(10) === Number(cpf[10]);
  }

  // Valida CNPJ pelos dígitos verificadores.
  function cnpjValido(valor) {
    const cnpj = somenteDigitos(valor);
    if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;
    const calcula = (tamanho) => {
      const pesos = tamanho === 12
        ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
        : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
      let soma = 0;
      for (let i = 0; i < tamanho; i++) soma += Number(cnpj[i]) * pesos[i];
      const resto = soma % 11;
      return resto < 2 ? 0 : 11 - resto;
    };
    return calcula(12) === Number(cnpj[12]) && calcula(13) === Number(cnpj[13]);
  }

  // Telefone brasileiro: DDD + 8 dígitos (fixo) ou 9 dígitos (celular).
  function telefoneValido(valor) {
    const tel = somenteDigitos(valor);
    return tel.length === 10 || tel.length === 11;
  }

  /* Regras de senha. Devolve um texto de erro ou "" se estiver ok. */
  function validarSenha(senha) {
    if (senha.length < 8) return "A senha deve ter pelo menos 8 caracteres.";
    if (!/[A-Za-z]/.test(senha) || !/\d/.test(senha)) return "A senha deve ter letras e números.";
    return "";
  }

  /* ---------------------------------------------------------------
     3) MÁSCARAS E FORMATAÇÃO
     As máscaras só mudam o que o usuário VÊ. Na hora de salvar usamos
     somenteDigitos(), então a validação nunca é afetada.
     --------------------------------------------------------------- */
  function formatarCpf(valor) {
    const d = somenteDigitos(valor).slice(0, 11);
    return d
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1-$2");
  }

  function formatarCnpj(valor) {
    const d = somenteDigitos(valor).slice(0, 14);
    return d
      .replace(/^(\d{2})(\d)/, "$1.$2")
      .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1/$2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }

  function formatarDocumento(valor, tipo) {
    return tipo === "pj" ? formatarCnpj(valor) : formatarCpf(valor);
  }

  function formatarTelefone(valor) {
    const d = somenteDigitos(valor).slice(0, 11);
    if (d.length <= 2) return d;
    if (d.length <= 6) return d.replace(/^(\d{2})(\d+)/, "($1) $2");
    if (d.length <= 10) return d.replace(/^(\d{2})(\d{4})(\d+)/, "($1) $2-$3");
    return d.replace(/^(\d{2})(\d{5})(\d+)/, "($1) $2-$3");
  }

  /* Oculta parte do documento na listagem (proteção de dados / LGPD).
     CPF  ->  ***.456.789-**      CNPJ -> **.222.333/0001-** */
  function mascararDocumento(valor, tipo) {
    const d = somenteDigitos(valor);
    if (tipo === "pj" && d.length === 14) {
      return `**.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-**`;
    }
    if (d.length === 11) return `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**`;
    return "—";
  }

  /* Liga uma máscara a um campo <input>. "funcao" recebe o texto e
     devolve o texto formatado. */
  function aplicarMascara(input, funcao) {
    input.addEventListener("input", () => {
      input.value = funcao(input.value);
    });
  }

  function formatarData(iso) {
    if (!iso) return "—";
    // Datas "YYYY-MM-DD" (sem hora) são tratadas à parte para não "voltar um dia" por causa do fuso.
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
      const [a, m, d] = iso.split("-");
      return `${d}/${m}/${a}`;
    }
    return new Date(iso).toLocaleDateString("pt-BR");
  }

  function formatarDataHora(iso) {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  }

  const numero = (n) => Number(n || 0).toLocaleString("pt-BR");

  // "2026-03" -> "mar/26"
  function rotuloMes(chave) {
    const [ano, mes] = chave.split("-");
    const nomes = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
    return `${nomes[Number(mes) - 1]}/${ano.slice(2)}`;
  }

  // Chave "AAAA-MM" de uma data ISO.
  const chaveMes = (iso) => String(iso).slice(0, 7);

  // Lista de meses ("AAAA-MM") entre duas chaves, sem buracos.
  function mesesEntre(inicio, fim) {
    const lista = [];
    let [a, m] = inicio.split("-").map(Number);
    const [af, mf] = fim.split("-").map(Number);
    while (a < af || (a === af && m <= mf)) {
      lista.push(`${a}-${String(m).padStart(2, "0")}`);
      m++;
      if (m > 12) { m = 1; a++; }
    }
    return lista;
  }

  const ESTADOS = [
    "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA",
    "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
  ];

  /* ---------------------------------------------------------------
     4) AVISOS NA TELA (toast)
     Utils.avisar("Salvo!", "sucesso")  |  "erro"  |  "info"
     --------------------------------------------------------------- */
  function avisar(mensagem, tipo = "info") {
    let area = document.getElementById("toasts");
    if (!area) {
      area = document.createElement("div");
      area.id = "toasts";
      area.setAttribute("role", "status");
      area.setAttribute("aria-live", "polite");
      document.body.appendChild(area);
    }
    const toast = document.createElement("div");
    toast.className = `toast toast--${tipo}`;
    toast.textContent = mensagem; // textContent: seguro contra XSS
    area.appendChild(toast);
    setTimeout(() => toast.classList.add("toast--saindo"), 4200);
    setTimeout(() => toast.remove(), 4700);
  }

  // Mostra/oculta uma mensagem dentro de um formulário (caixa de aviso).
  function mostrarMensagem(el, texto, tipo = "erro") {
    if (!el) return;
    el.textContent = texto || "";
    el.className = `msg msg--${tipo}`;
    el.hidden = !texto;
  }

  // Liga/desliga o estado "carregando" de um botão.
  function carregandoBotao(botao, carregando, textoCarregando = "Aguarde...") {
    if (!botao) return;
    if (carregando) {
      botao.dataset.textoOriginal = botao.textContent;
      botao.textContent = textoCarregando;
      botao.disabled = true;
      botao.classList.add("is-loading");
    } else {
      botao.textContent = botao.dataset.textoOriginal || botao.textContent;
      botao.disabled = false;
      botao.classList.remove("is-loading");
    }
  }

  // Traduz erros comuns do Supabase para mensagens amigáveis.
  function traduzirErro(erro) {
    const texto = String(erro?.message || erro || "").toLowerCase();
    if (texto.includes("invalid login credentials")) return "E-mail ou senha incorretos.";
    if (texto.includes("email not confirmed")) return "Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.";
    if (texto.includes("user already registered")) return "Já existe uma conta com este e-mail.";
    if (texto.includes("rate limit") || texto.includes("too many")) return "Muitas tentativas. Aguarde um pouco e tente novamente.";
    if (texto.includes("password should be")) return "A senha não atende aos requisitos de segurança.";
    if (texto.includes("failed to fetch") || texto.includes("network")) return "Sem conexão com o servidor. Verifique sua internet e tente de novo.";
    if (texto.includes("customers_unique_document_per_user") || texto.includes("duplicate key")) return "Você já cadastrou um cliente com este CPF/CNPJ.";
    if (texto.includes("row-level security")) return "Você não tem permissão para realizar esta operação.";
    if (texto.includes("jwt") && texto.includes("expired")) return "Sua sessão expirou. Entre novamente.";
    return "Algo deu errado. Tente novamente em instantes.";
  }

  /* ---------------------------------------------------------------
     5) BUSCA EM LOTES
     O Supabase devolve no máximo ~1000 linhas por consulta. Para os
     relatórios (que precisam de TODOS os dados filtrados) buscamos em
     blocos até acabar. "montarConsulta" recebe (de, ate) e devolve a
     consulta já com .range(de, ate).
     --------------------------------------------------------------- */
  async function buscarTudo(montarConsulta, tamanhoBloco = 1000, limiteMaximo = 20000) {
    let todas = [];
    for (let de = 0; de < limiteMaximo; de += tamanhoBloco) {
      const { data, error } = await montarConsulta(de, de + tamanhoBloco - 1);
      if (error) throw error;
      todas = todas.concat(data);
      if (data.length < tamanhoBloco) break;
    }
    return todas;
  }

  /* ---------------------------------------------------------------
     6) GRÁFICO DE BARRAS SIMPLES (sem bibliotecas)
     itens = [{ rotulo: "SP", valor: 12 }, ...]
     --------------------------------------------------------------- */
  function desenharBarras(container, itens, { vazio = "Sem dados para exibir.", unidade = "" } = {}) {
    if (!itens.length || itens.every((i) => i.valor === 0)) {
      container.innerHTML = `<p class="vazio">${escapeHtml(vazio)}</p>`;
      return;
    }
    const maximo = Math.max(...itens.map((i) => i.valor), 1);
    container.innerHTML = `<ul class="barras">${itens
      .map((i) => {
        const largura = Math.max((i.valor / maximo) * 100, i.valor > 0 ? 2 : 0);
        return `
          <li class="barras__linha">
            <span class="barras__rotulo" title="${escapeHtml(i.rotulo)}">${escapeHtml(i.rotulo)}</span>
            <span class="barras__trilho" aria-hidden="true"><span class="barras__preenchimento" style="width:${largura}%"></span></span>
            <span class="barras__valor">${numero(i.valor)}${unidade}</span>
          </li>`;
      })
      .join("")}</ul>`;
  }

  // Gráfico de colunas (usado na evolução por mês).
  function desenharColunas(container, itens, { vazio = "Sem dados para exibir." } = {}) {
    if (!itens.length || itens.every((i) => i.valor === 0)) {
      container.innerHTML = `<p class="vazio">${escapeHtml(vazio)}</p>`;
      return;
    }
    const maximo = Math.max(...itens.map((i) => i.valor), 1);
    container.innerHTML = `<ul class="colunas">${itens
      .map((i) => {
        const altura = Math.max((i.valor / maximo) * 100, i.valor > 0 ? 3 : 0);
        return `
          <li class="colunas__item" title="${escapeHtml(i.rotulo)}: ${i.valor}">
            <span class="colunas__valor">${numero(i.valor)}</span>
            <span class="colunas__area" aria-hidden="true"><span class="colunas__barra" style="height:${altura}%"></span></span>
            <span class="colunas__rotulo">${escapeHtml(i.rotulo)}</span>
          </li>`;
      })
      .join("")}</ul>`;
  }

  /* ---------------------------------------------------------------
     7) EXPORTAÇÃO CSV
     - Separador ";" e BOM UTF-8: o Excel em português abre com acentos
       e colunas corretos.
     - Células que começam com = + - @ ganham um apóstrofo para impedir
       "injeção de fórmula" ao abrir no Excel.
     --------------------------------------------------------------- */
  function baixarCsv(nomeArquivo, cabecalho, linhas) {
    const celula = (v) => {
      let t = String(v ?? "");
      if (/^[=+\-@\t\r]/.test(t)) t = "'" + t;
      return `"${t.replace(/"/g, '""')}"`;
    };
    const csv = [cabecalho, ...linhas].map((l) => l.map(celula).join(";")).join("\r\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nomeArquivo;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  /* ---------------------------------------------------------------
     8) MENU LATERAL
     Montado por aqui para não repetir o mesmo HTML em todas as páginas.
     "paginaAtiva" é o nome do arquivo (ex.: "clientes").
     --------------------------------------------------------------- */
  const ICONES = {
    inicio: '<path d="M3 11.5 12 4l9 7.5M5 10v10h5v-6h4v6h5V10"/>',
    resumo: '<path d="M4 20V10m6 10V4m6 16v-7m4 7H2"/>',
    clientes: '<path d="M16 19v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 17.5V19M10 11a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Zm10 8v-1.5a3.5 3.5 0 0 0-2.6-3.4M15.5 4.8a3.2 3.2 0 0 1 0 6.2"/>',
    relatorios: '<path d="M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6"/>',
    sair: '<path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10"/>',
  };

  const icone = (nome) =>
    `<svg class="icone" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONES[nome]}</svg>`;

  function montarMenu(paginaAtiva) {
    const aside = document.getElementById("menu-lateral");
    if (!aside) return;

    const itens = [
      ["index", "index.html", "Início", "inicio"],
      ["dashboard", "dashboard.html", "Resumo geral", "resumo"],
      ["clientes", "clientes.html", "Seus clientes", "clientes"],
      ["relatorios", "relatorios.html", "Relatórios", "relatorios"],
    ];

    aside.innerHTML = `
      <a class="menu__logo" href="index.html" aria-label="Início">
        <img src="img/logo.svg" alt="Logotipo do sistema" width="112" height="112">
      </a>
      <button class="menu__toggle" type="button" aria-expanded="false" aria-controls="menu-nav">
        <span class="sr-only">Abrir menu</span>
        <svg class="icone" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
      </button>
      <nav id="menu-nav" class="menu__nav" aria-label="Navegação principal">
        <ul>
          ${itens.map(([id, href, texto, ic]) => `
            <li><a href="${href}" ${id === paginaAtiva ? 'aria-current="page"' : ""}>${icone(ic)}<span>${texto}</span></a></li>`).join("")}
        </ul>
        <div class="menu__usuario">
          <p class="menu__nome" id="usuario-nome">Carregando…</p>
          <p class="menu__email" id="usuario-email"></p>
          <button type="button" class="btn btn--escuro btn--bloco" id="btn-sair">${icone("sair")}<span>Sair</span></button>
        </div>
      </nav>`;

    // Menu "hambúrguer" no celular.
    const toggle = aside.querySelector(".menu__toggle");
    toggle.addEventListener("click", () => {
      const aberto = aside.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(aberto));
    });
  }

  return {
    escapeHtml, somenteDigitos,
    emailValido, cpfValido, cnpjValido, telefoneValido, validarSenha,
    formatarCpf, formatarCnpj, formatarDocumento, formatarTelefone, mascararDocumento, aplicarMascara,
    formatarData, formatarDataHora, numero, rotuloMes, chaveMes, mesesEntre, ESTADOS,
    avisar, mostrarMensagem, carregandoBotao, traduzirErro,
    buscarTudo, desenharBarras, desenharColunas, baixarCsv, montarMenu,
  };
})();
