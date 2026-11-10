/* =====================================================================
   clientes.js - TELA "SEUS CLIENTES"
   Cadastrar, consultar, editar e excluir clientes.

   - A busca, o filtro, a ordenação e a paginação são feitos NO BANCO
     (o navegador baixa só a página atual).
   - A exclusão é LÓGICA: o cliente recebe "deleted_at" e some das telas,
     mas continua guardado (histórico comercial / LGPD).
   ===================================================================== */

/* Estado da tela: tudo o que muda a listagem fica aqui. */
const estado = {
  usuario: null,
  pagina: 1,
  porPagina: Number(window.APP_CONFIG?.PAGE_SIZE) || 10,
  total: 0,
  busca: "",
  status: "",
  ordem: "recentes",
  carregando: false,
  recarregarDepois: false, // true quando o usuário mudou um filtro durante um carregamento
  clienteEditandoId: null, // null = cadastrando um novo
  clienteExcluindo: null,
};

/* Ordenações disponíveis: [coluna, crescente?] */
const ORDENS = {
  recentes: ["created_at", false],
  antigos: ["created_at", true],
  nome_asc: ["name", true],
  nome_desc: ["name", false],
};

const el = (id) => document.getElementById(id);

document.addEventListener("DOMContentLoaded", async () => {
  Utils.montarMenu("clientes");
  estado.usuario = await Auth.exigirLogin();
  if (!estado.usuario) return;

  prepararFormulario();
  prepararFiltros();
  prepararTabela();
  carregarClientes();
});

/* =====================================================================
   LISTAGEM
   ===================================================================== */
async function carregarClientes() {
  // Se já está carregando, guarda o pedido e refaz a consulta ao terminar
  // (assim a última escolha do usuário nunca é perdida).
  if (estado.carregando) {
    estado.recarregarDepois = true;
    return;
  }
  estado.carregando = true;
  estado.recarregarDepois = false;
  const tabela = el("tabela-clientes");
  const corpo = el("corpo-clientes");
  const erro = el("lista-erro");
  tabela.setAttribute("aria-busy", "true");
  erro.hidden = true;
  corpo.innerHTML = `<tr><td colspan="8" class="vazio">Carregando clientes…</td></tr>`;

  try {
    const [coluna, crescente] = ORDENS[estado.ordem];
    const de = (estado.pagina - 1) * estado.porPagina;

    let consulta = window.db
      .from("customers")
      .select("id,name,document,customer_type,email,phone,city,state,status,created_at", { count: "exact" })
      .is("deleted_at", null);

    if (estado.status) consulta = consulta.eq("status", estado.status);

    // Busca por nome OU por CPF/CNPJ.
    // Removemos caracteres que têm significado especial no filtro .or()
    // para que o texto digitado nunca altere a consulta (segurança).
    const termo = estado.busca.replace(/[,()%*_\\"]/g, "").trim();
    if (termo) {
      const digitos = Utils.somenteDigitos(termo);
      const filtros = [`name.ilike.%${termo}%`];
      if (digitos.length >= 3) filtros.push(`document.ilike.%${digitos}%`);
      consulta = consulta.or(filtros.join(","));
    }

    const { data, count, error } = await consulta
      .order(coluna, { ascending: crescente })
      .order("id") // desempate: mantém a paginação estável
      .range(de, de + estado.porPagina - 1);
    if (error) throw error;

    estado.total = count ?? 0;

    // Se a página ficou vazia (ex.: excluiu o último da página), volta uma.
    if (!data.length && estado.total > 0 && estado.pagina > 1) {
      estado.pagina--;
      estado.recarregarDepois = true; // o bloco "finally" refaz a consulta
      return;
    }

    desenharTabela(data);
    desenharPaginacao();
  } catch (e) {
    console.error(e);
    corpo.innerHTML = "";
    erro.textContent = `Não foi possível carregar os clientes. ${Utils.traduzirErro(e)}`;
    erro.hidden = false;
    el("paginacao").hidden = true;
  } finally {
    tabela.setAttribute("aria-busy", "false");
    estado.carregando = false;
    if (estado.recarregarDepois) carregarClientes();
  }
}

function desenharTabela(clientes) {
  const corpo = el("corpo-clientes");

  if (!clientes.length) {
    const filtrando = estado.busca || estado.status;
    corpo.innerHTML = `<tr><td colspan="8" class="vazio">${
      filtrando
        ? "Nenhum cliente encontrado com esses filtros."
        : 'Você ainda não cadastrou clientes. Clique em "Novo cliente" para começar.'
    }</td></tr>`;
    return;
  }

  corpo.innerHTML = clientes.map((c) => `
    <tr>
      <td data-label="Nome"><strong>${Utils.escapeHtml(c.name)}</strong>
        <small class="tipo">${c.customer_type === "pj" ? "Pessoa jurídica" : "Pessoa física"}</small></td>
      <td data-label="CPF/CNPJ">${Utils.mascararDocumento(c.document, c.customer_type)}</td>
      <td data-label="Telefone">${Utils.escapeHtml(c.phone ? Utils.formatarTelefone(c.phone) : "—")}</td>
      <td data-label="E-mail" class="quebra">${Utils.escapeHtml(c.email || "—")}</td>
      <td data-label="Cidade">${Utils.escapeHtml([c.city, c.state].filter(Boolean).join(" / ") || "—")}</td>
      <td data-label="Status"><span class="selo selo--${c.status}">${c.status === "ativo" ? "Ativo" : "Inativo"}</span></td>
      <td data-label="Cadastro">${Utils.formatarData(c.created_at)}</td>
      <td data-label="Ações" class="acoes">
        <button type="button" class="btn btn--pequeno" data-acao="editar" data-id="${c.id}">Editar</button>
        <button type="button" class="btn btn--pequeno btn--perigo" data-acao="excluir" data-id="${c.id}" data-nome="${Utils.escapeHtml(c.name)}">Excluir</button>
      </td>
    </tr>`).join("");
}

function desenharPaginacao() {
  const totalPaginas = Math.max(Math.ceil(estado.total / estado.porPagina), 1);
  const primeiro = estado.total ? (estado.pagina - 1) * estado.porPagina + 1 : 0;
  const ultimo = Math.min(estado.pagina * estado.porPagina, estado.total);

  el("paginacao").hidden = estado.total === 0;
  el("pag-info").textContent = `${primeiro}–${ultimo} de ${Utils.numero(estado.total)} cliente(s)`;
  el("pag-numero").textContent = `Página ${estado.pagina} de ${totalPaginas}`;
  el("pag-anterior").disabled = estado.pagina <= 1;
  el("pag-proxima").disabled = estado.pagina >= totalPaginas;
}

function prepararFiltros() {
  // A busca espera o usuário parar de digitar (evita uma consulta por letra).
  let temporizador;
  el("busca").addEventListener("input", (e) => {
    clearTimeout(temporizador);
    temporizador = setTimeout(() => {
      estado.busca = e.target.value;
      estado.pagina = 1;
      carregarClientes();
    }, 350);
  });

  el("filtro-status").addEventListener("change", (e) => {
    estado.status = e.target.value;
    estado.pagina = 1;
    carregarClientes();
  });

  el("ordenacao").addEventListener("change", (e) => {
    estado.ordem = e.target.value;
    estado.pagina = 1;
    carregarClientes();
  });

  el("pag-anterior").addEventListener("click", () => { estado.pagina--; carregarClientes(); });
  el("pag-proxima").addEventListener("click", () => { estado.pagina++; carregarClientes(); });
}

function prepararTabela() {
  // Um único "ouvinte" cuida de todos os botões Editar/Excluir.
  el("corpo-clientes").addEventListener("click", (e) => {
    const botao = e.target.closest("button[data-acao]");
    if (!botao) return;
    if (botao.dataset.acao === "editar") abrirFormulario(botao.dataset.id);
    if (botao.dataset.acao === "excluir") abrirConfirmacao(botao.dataset.id, botao.dataset.nome);
  });

  el("btn-novo").addEventListener("click", () => abrirFormulario(null));
}

/* =====================================================================
   FORMULÁRIO (cadastro e edição)
   ===================================================================== */
function prepararFormulario() {
  const form = el("form-cliente");

  // Lista de estados.
  form.estado.innerHTML = '<option value="">UF</option>' +
    Utils.ESTADOS.map((uf) => `<option value="${uf}">${uf}</option>`).join("");

  // Máscaras (só visuais; ao salvar usamos apenas os dígitos).
  Utils.aplicarMascara(form.documento, (v) => Utils.formatarDocumento(v, form.tipo.value));
  Utils.aplicarMascara(form.telefone, Utils.formatarTelefone);

  // Trocar PF/PJ muda os rótulos e reaplica a máscara.
  form.tipo.addEventListener("change", () => {
    ajustarRotulosPorTipo();
    form.documento.value = Utils.formatarDocumento(form.documento.value, form.tipo.value);
  });

  // Limpa o erro de um campo assim que a pessoa volta a digitar nele.
  form.addEventListener("input", (e) => mostrarErroCampo(e.target.name, ""));

  el("btn-cancelar-form").addEventListener("click", () => el("dialogo-cliente").close());
  el("btn-fechar-form").addEventListener("click", () => el("dialogo-cliente").close());
  form.addEventListener("submit", salvarCliente);

  // Janela de confirmação de exclusão.
  el("btn-cancelar-exclusao").addEventListener("click", () => el("dialogo-exclusao").close());
  el("btn-confirmar-exclusao").addEventListener("click", excluirCliente);
}

function ajustarRotulosPorTipo() {
  const pj = el("form-cliente").tipo.value === "pj";
  el("rotulo-documento").textContent = pj ? "CNPJ" : "CPF";
  el("rotulo-nascimento").textContent = pj ? "Data de abertura da empresa" : "Data de nascimento";
  el("rotulo-nome").textContent = pj ? "Razão social / nome da empresa" : "Nome completo";
  el("form-cliente").documento.placeholder = pj ? "00.000.000/0000-00" : "000.000.000-00";
}

async function abrirFormulario(id) {
  const form = el("form-cliente");
  const dialogo = el("dialogo-cliente");
  form.reset();
  limparErros();
  Utils.mostrarMensagem(el("form-mensagem"), "");
  estado.clienteEditandoId = id;

  el("titulo-form").textContent = id ? "Editar cliente" : "Novo cliente";
  ajustarRotulosPorTipo();

  if (id) {
    // Edição: busca os dados completos do cliente.
    try {
      const { data, error } = await window.db.from("customers").select("*").eq("id", id).is("deleted_at", null).single();
      if (error) throw error;
      form.tipo.value = data.customer_type;
      ajustarRotulosPorTipo();
      form.nome.value = data.name;
      form.documento.value = Utils.formatarDocumento(data.document, data.customer_type);
      form.email.value = data.email || "";
      form.telefone.value = data.phone ? Utils.formatarTelefone(data.phone) : "";
      form.nascimento.value = data.birth_date || "";
      form.cidade.value = data.city || "";
      form.estado.value = data.state || "";
      form.endereco.value = data.address || "";
      form.status.value = data.status;
      form.observacoes.value = data.notes || "";
    } catch (e) {
      console.error(e);
      return Utils.avisar(`Não foi possível abrir o cliente. ${Utils.traduzirErro(e)}`, "erro");
    }
  }

  dialogo.showModal();
  form.nome.focus();
}

/* ---------------- validação ---------------- */
function validarFormulario(form) {
  const erros = {};
  const tipo = form.tipo.value;
  const nome = form.nome.value.trim();
  const doc = Utils.somenteDigitos(form.documento.value);
  const email = form.email.value.trim();
  const tel = Utils.somenteDigitos(form.telefone.value);

  if (nome.length < 2) erros.nome = "Informe o nome (mínimo 2 letras).";
  if (nome.length > 150) erros.nome = "O nome pode ter no máximo 150 caracteres.";

  if (!doc) erros.documento = `Informe o ${tipo === "pj" ? "CNPJ" : "CPF"}.`;
  else if (tipo === "pf" && !Utils.cpfValido(doc)) erros.documento = "CPF inválido. Confira os números.";
  else if (tipo === "pj" && !Utils.cnpjValido(doc)) erros.documento = "CNPJ inválido. Confira os números.";

  if (email && !Utils.emailValido(email)) erros.email = "E-mail inválido.";
  if (tel && !Utils.telefoneValido(tel)) erros.telefone = "Telefone inválido. Use DDD + número.";

  if (form.nascimento.value) {
    const data = new Date(form.nascimento.value + "T00:00:00");
    if (data > new Date()) erros.nascimento = "A data não pode estar no futuro.";
    else if (data.getFullYear() < 1900) erros.nascimento = "Data inválida.";
  }

  if (form.observacoes.value.length > 2000) erros.observacoes = "Máximo de 2000 caracteres.";
  return erros;
}

function mostrarErroCampo(nome, texto) {
  const alvo = document.querySelector(`[data-erro="${nome}"]`);
  if (!alvo) return;
  alvo.textContent = texto;
  const campo = el("form-cliente").elements[nome];
  if (campo) campo.setAttribute("aria-invalid", texto ? "true" : "false");
}

function limparErros() {
  document.querySelectorAll("[data-erro]").forEach((s) => (s.textContent = ""));
  [...el("form-cliente").elements].forEach((c) => c.removeAttribute?.("aria-invalid"));
}

/* ---------------- salvar ---------------- */
async function salvarCliente(evento) {
  evento.preventDefault();
  const form = evento.target;
  const botao = el("btn-salvar-cliente");
  const msg = el("form-mensagem");
  Utils.mostrarMensagem(msg, "");
  limparErros();

  const erros = validarFormulario(form);
  const nomesComErro = Object.keys(erros);
  if (nomesComErro.length) {
    nomesComErro.forEach((n) => mostrarErroCampo(n, erros[n]));
    form.elements[nomesComErro[0]].focus();
    return Utils.mostrarMensagem(msg, "Corrija os campos destacados e tente novamente.");
  }

  // Texto vazio vira null no banco.
  const textoOuNulo = (v) => (v.trim() ? v.trim() : null);
  const dados = {
    name: form.nome.value.trim().replace(/\s+/g, " "),
    document: Utils.somenteDigitos(form.documento.value),
    customer_type: form.tipo.value,
    email: textoOuNulo(form.email.value)?.toLowerCase() ?? null,
    phone: Utils.somenteDigitos(form.telefone.value) || null,
    birth_date: form.nascimento.value || null,
    city: textoOuNulo(form.cidade.value),
    state: form.estado.value || null,
    address: textoOuNulo(form.endereco.value),
    status: form.status.value,
    notes: textoOuNulo(form.observacoes.value),
  };

  Utils.carregandoBotao(botao, true, "Salvando...");
  try {
    let resposta;
    if (estado.clienteEditandoId) {
      resposta = await window.db.from("customers").update(dados).eq("id", estado.clienteEditandoId);
    } else {
      // O banco confere (RLS) que created_by é mesmo o usuário logado.
      resposta = await window.db.from("customers").insert({ ...dados, created_by: estado.usuario.id });
    }
    if (resposta.error) throw resposta.error;

    el("dialogo-cliente").close();
    Utils.avisar(estado.clienteEditandoId ? "Cliente atualizado com sucesso." : "Cliente cadastrado com sucesso.", "sucesso");
    if (!estado.clienteEditandoId) estado.pagina = 1; // novo cliente: volta ao início
    carregarClientes();
  } catch (e) {
    console.error(e);
    Utils.mostrarMensagem(msg, Utils.traduzirErro(e));
  } finally {
    Utils.carregandoBotao(botao, false);
  }
}

/* =====================================================================
   EXCLUSÃO (com confirmação) - Versão Corrigida
   ===================================================================== */
function abrirConfirmacao(id, nome) {
  if (!id) {
    console.error("Tentativa de exclusão sem ID válido.");
    return;
  }
  estado.clienteExcluindo = id;
  el("nome-exclusao").textContent = nome;
  el("dialogo-exclusao").showModal();
  el("btn-cancelar-exclusao").focus();
}

async function excluirCliente() {
  if (!estado.clienteExcluindo) {
    Utils.avisar("Nenhum cliente selecionado para exclusão.", "erro");
    return;
  }

  const botao = el("btn-confirmar-exclusao");
  Utils.carregandoBotao(botao, true, "Excluindo...");

  try {
    // O .select() força o Supabase JS v2 a retornar o registro atualizado.
    // Sem ele, atualizações bloqueadas por RLS retornam sucesso silencioso (0 linhas).
    const { data, error } = await window.db
      .from("customers")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", estado.clienteExcluindo)
      .select();

    if (error) throw error;

    // Caso a lista retorne vazia, nenhuma linha foi afetada no banco.
    if (!data || data.length === 0) {
      throw new Error("Permissão negada no banco de dados (RLS) ou cliente não encontrado.");
    }

    el("dialogo-exclusao").close();
    Utils.avisar("Cliente excluído.", "sucesso");
    carregarClientes();
  } catch (e) {
    console.error("Erro ao excluir cliente:", e);
    el("dialogo-exclusao").close();
    Utils.avisar(`Não foi possível excluir. ${Utils.traduzirErro(e)}`, "erro");
  } finally {
    Utils.carregandoBotao(botao, false);
    estado.clienteExcluindo = null; // Reseta a variável de estado
  }
}
