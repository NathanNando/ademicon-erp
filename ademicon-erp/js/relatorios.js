/* =====================================================================
   relatorios.js - TELA "RELATÓRIOS"
   Busca os clientes que combinam com os filtros e calcula os resumos
   no navegador. Exporta CSV e permite imprimir.
   Se não houver dados, mostra uma mensagem (nunca números inventados).
   ===================================================================== */

let linhasFiltradas = []; // clientes do último relatório gerado (usado no CSV)
const $ = (id) => document.getElementById(id);

document.addEventListener("DOMContentLoaded", async () => {
  Utils.montarMenu("relatorios");
  const usuario = await Auth.exigirLogin();
  if (!usuario) return;

  $("form-filtros").addEventListener("submit", (e) => { e.preventDefault(); gerarRelatorio(); });
  $("btn-limpar").addEventListener("click", () => { $("form-filtros").reset(); gerarRelatorio(); });
  $("btn-csv").addEventListener("click", exportarCsv);
  $("btn-imprimir").addEventListener("click", () => window.print());
  gerarRelatorio();
});

/* Lê os filtros da tela. */
function lerFiltros() {
  const f = $("form-filtros");
  return { de: f.de.value, ate: f.ate.value, status: f.status.value, tipo: f.tipo.value };
}

async function gerarRelatorio() {
  const filtros = lerFiltros();
  const erro = $("relatorio-erro");
  const area = $("resultado");
  erro.hidden = true;

  if (filtros.de && filtros.ate && filtros.de > filtros.ate) {
    erro.textContent = "A data inicial não pode ser maior que a data final.";
    erro.hidden = false;
    return;
  }

  area.setAttribute("aria-busy", "true");
  area.classList.add("is-loading");
  const botao = $("btn-gerar");
  Utils.carregandoBotao(botao, true, "Gerando...");

  try {
    linhasFiltradas = await Utils.buscarTudo((a, b) => {
      let q = window.db
        .from("customers")
        .select("name,document,customer_type,email,phone,city,state,status,created_at")
        .is("deleted_at", null);
      if (filtros.de) q = q.gte("created_at", new Date(filtros.de + "T00:00:00").toISOString());
      if (filtros.ate) q = q.lte("created_at", new Date(filtros.ate + "T23:59:59.999").toISOString());
      if (filtros.status) q = q.eq("status", filtros.status);
      if (filtros.tipo) q = q.eq("customer_type", filtros.tipo);
      return q.order("created_at").order("name").range(a, b);
    });
    desenharRelatorio(linhasFiltradas);
  } catch (e) {
    console.error(e);
    erro.textContent = `Não foi possível gerar o relatório. ${Utils.traduzirErro(e)}`;
    erro.hidden = false;
  } finally {
    Utils.carregandoBotao(botao, false);
    area.setAttribute("aria-busy", "false");
    area.classList.remove("is-loading");
  }
}

/* Conta quantas vezes cada valor aparece. "chave" devolve {id, rotulo}. */
function agrupar(linhas, chave) {
  const mapa = new Map();
  linhas.forEach((l) => {
    const { id, rotulo } = chave(l);
    const atual = mapa.get(id) || { rotulo, valor: 0 };
    atual.valor++;
    mapa.set(id, atual);
  });
  return [...mapa.values()].sort((a, b) => b.valor - a.valor || a.rotulo.localeCompare(b.rotulo, "pt-BR"));
}

function desenharRelatorio(linhas) {
  const vazio = linhas.length === 0;
  $("sem-dados").hidden = !vazio;
  $("conteudo-relatorio").hidden = vazio;
  $("btn-csv").disabled = vazio;
  $("btn-imprimir").disabled = vazio;
  $("resumo-filtros").textContent = descreverFiltros();
  if (vazio) return;

  // --- Totais ---
  const ativos = linhas.filter((l) => l.status === "ativo").length;
  const pf = linhas.filter((l) => l.customer_type === "pf").length;
  $("r-total").textContent = Utils.numero(linhas.length);
  $("r-ativos").textContent = Utils.numero(ativos);
  $("r-inativos").textContent = Utils.numero(linhas.length - ativos);
  $("r-pf").textContent = Utils.numero(pf);
  $("r-pj").textContent = Utils.numero(linhas.length - pf);

  // --- Por tipo ---
  Utils.desenharBarras($("g-tipos"), [
    { rotulo: "Pessoa física", valor: pf },
    { rotulo: "Pessoa jurídica", valor: linhas.length - pf },
  ]);

  // --- Por estado e por cidade (10 maiores) ---
  const porEstado = agrupar(linhas, (l) => ({ id: l.state || "-", rotulo: l.state || "Não informado" }));
  const porCidade = agrupar(linhas, (l) => {
    const cidade = (l.city || "").trim();
    return { id: cidade.toLowerCase() + "|" + (l.state || ""), rotulo: cidade ? `${cidade}${l.state ? " / " + l.state : ""}` : "Não informada" };
  });
  Utils.desenharBarras($("g-estados"), porEstado.slice(0, 10));
  Utils.desenharBarras($("g-cidades"), porCidade.slice(0, 10));
  $("nota-estados").hidden = porEstado.length <= 10;
  $("nota-cidades").hidden = porCidade.length <= 10;

  // --- Evolução por mês (do 1º ao último mês com cadastro) ---
  const chave = (iso) => {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  };
  const chaves = linhas.map((l) => chave(l.created_at)).sort();
  let meses = Utils.mesesEntre(chaves[0], chaves[chaves.length - 1]);
  const cortado = meses.length > 24;
  if (cortado) meses = meses.slice(-24); // gráfico legível: últimos 24 meses
  const contagem = Object.fromEntries(meses.map((m) => [m, 0]));
  chaves.forEach((c) => { if (c in contagem) contagem[c]++; });

  Utils.desenharColunas($("g-evolucao"), meses.map((m) => ({ rotulo: Utils.rotuloMes(m), valor: contagem[m] })));
  $("nota-evolucao").hidden = !cortado;

  // --- Tabela: cadastros por período (mês a mês, com acumulado) ---
  const anterioresAoCorte = cortado ? chaves.filter((c) => c < meses[0]).length : 0;
  let acumulado = anterioresAoCorte;
  $("corpo-periodo").innerHTML = meses.map((m) => {
    acumulado += contagem[m];
    return `<tr><td data-label="Mês">${Utils.rotuloMes(m)}</td><td data-label="Cadastros">${Utils.numero(contagem[m])}</td><td data-label="Acumulado">${Utils.numero(acumulado)}</td></tr>`;
  }).join("");
}

/* Texto que descreve os filtros usados (aparece também na impressão). */
function descreverFiltros() {
  const f = lerFiltros();
  const partes = [];
  if (f.de) partes.push(`a partir de ${Utils.formatarData(f.de)}`);
  if (f.ate) partes.push(`até ${Utils.formatarData(f.ate)}`);
  if (f.status) partes.push(f.status === "ativo" ? "somente ativos" : "somente inativos");
  if (f.tipo) partes.push(f.tipo === "pf" ? "pessoa física" : "pessoa jurídica");
  return partes.length ? `Filtros: ${partes.join(", ")}.` : "Filtros: todos os clientes.";
}

/* Exporta para CSV os clientes do relatório atual. */
function exportarCsv() {
  if (!linhasFiltradas.length) return Utils.avisar("Não há dados para exportar.", "info");

  // Por padrão o CPF/CNPJ sai parcialmente oculto (minimização de dados / LGPD).
  const completo = $("csv-documento-completo").checked;
  const cabecalho = ["Nome", "Tipo", "CPF/CNPJ", "E-mail", "Telefone", "Cidade", "Estado", "Status", "Data de cadastro"];
  const linhas = linhasFiltradas.map((c) => [
    c.name,
    c.customer_type === "pj" ? "Pessoa jurídica" : "Pessoa física",
    completo ? Utils.formatarDocumento(c.document, c.customer_type) : Utils.mascararDocumento(c.document, c.customer_type),
    c.email || "",
    c.phone ? Utils.formatarTelefone(c.phone) : "",
    c.city || "",
    c.state || "",
    c.status === "ativo" ? "Ativo" : "Inativo",
    Utils.formatarData(c.created_at),
  ]);

  const hoje = new Date().toISOString().slice(0, 10);
  Utils.baixarCsv(`clientes-${hoje}.csv`, cabecalho, linhas);
  Utils.avisar(`Arquivo gerado com ${Utils.numero(linhas.length)} cliente(s).`, "sucesso");
}
