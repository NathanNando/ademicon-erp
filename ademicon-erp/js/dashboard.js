/* =====================================================================
   dashboard.js - TELA "RESUMO GERAL"
   Todos os números vêm do banco (Supabase). Nada é fictício.
   O RLS garante que cada funcionário só conta os próprios clientes.
   ===================================================================== */

document.addEventListener("DOMContentLoaded", async () => {
  Utils.montarMenu("dashboard");
  const usuario = await Auth.exigirLogin();
  if (!usuario) return;

  document.getElementById("btn-recarregar").addEventListener("click", carregarPainel);
  carregarPainel();
});

/* Base de toda consulta: só clientes que NÃO foram excluídos (exclusão lógica). */
const clientesAtivosNoBanco = (colunas, opcoes) =>
  window.db.from("customers").select(colunas, opcoes).is("deleted_at", null);

/* Conta registros. "ajustar" recebe a consulta e pode adicionar filtros. */
async function contar(ajustar = (q) => q) {
  const { count, error } = await ajustar(clientesAtivosNoBanco("id", { count: "exact", head: true }));
  if (error) throw error;
  return count ?? 0;
}

async function carregarPainel() {
  const painel = document.getElementById("painel");
  const erro = document.getElementById("painel-erro");
  painel.setAttribute("aria-busy", "true");
  painel.classList.add("is-loading");
  erro.hidden = true;

  try {
    // Desde o 1º dia do mês de 5 meses atrás (janela de 6 meses para o gráfico).
    const hoje = new Date();
    const inicioJanela = new Date(hoje.getFullYear(), hoje.getMonth() - 5, 1);

    const [total, ativos, inativos, comerciais, pf, pj, recentes, atividades, cadastrosJanela] = await Promise.all([
      contar(),
      contar((q) => q.eq("status", "ativo")),
      contar((q) => q.eq("status", "inativo")),
      // "Registro comercial" = cliente que tem observações comerciais preenchidas.
      contar((q) => q.not("notes", "is", null).neq("notes", "")),
      contar((q) => q.eq("customer_type", "pf")),
      contar((q) => q.eq("customer_type", "pj")),
      clientesAtivosNoBanco("id,name,city,state,status,created_at")
        .order("created_at", { ascending: false }).limit(5).then(semErro),
      clientesAtivosNoBanco("id,name,created_at,updated_at")
        .order("updated_at", { ascending: false }).limit(6).then(semErro),
      Utils.buscarTudo((de, ate) =>
        clientesAtivosNoBanco("created_at")
          .gte("created_at", inicioJanela.toISOString())
          .order("created_at").range(de, ate)
      ),
    ]);

    // --- Cartões de indicadores ---
    definirTexto("kpi-total", Utils.numero(total));
    definirTexto("kpi-ativos", Utils.numero(ativos));
    definirTexto("kpi-inativos", Utils.numero(inativos));
    definirTexto("kpi-comerciais", Utils.numero(comerciais));

    // --- Últimos clientes cadastrados ---
    const listaRecentes = document.getElementById("lista-recentes");
    if (!recentes.length) {
      listaRecentes.innerHTML = '<li class="vazio">Nenhum cliente cadastrado ainda. <a href="clientes.html">Cadastre o primeiro</a>.</li>';
    } else {
      listaRecentes.innerHTML = recentes.map((c) => `
        <li class="lista__item">
          <div>
            <strong>${Utils.escapeHtml(c.name)}</strong>
            <small>${Utils.escapeHtml([c.city, c.state].filter(Boolean).join(" / ") || "Local não informado")}</small>
          </div>
          <div class="lista__lado">
            <span class="selo selo--${c.status}">${c.status === "ativo" ? "Ativo" : "Inativo"}</span>
            <small>${Utils.formatarData(c.created_at)}</small>
          </div>
        </li>`).join("");
    }

    // --- Atividades recentes (cadastros e edições) ---
    const listaAtividades = document.getElementById("lista-atividades");
    if (!atividades.length) {
      listaAtividades.innerHTML = '<li class="vazio">As atividades aparecerão aqui.</li>';
    } else {
      listaAtividades.innerHTML = atividades.map((c) => {
        // Se as datas são praticamente iguais, o cliente acabou de ser cadastrado.
        const foiEditado = new Date(c.updated_at) - new Date(c.created_at) > 2000;
        return `
          <li class="lista__item">
            <div>
              <strong>${Utils.escapeHtml(c.name)}</strong>
              <small>${foiEditado ? "Cadastro atualizado" : "Novo cliente cadastrado"}</small>
            </div>
            <small>${Utils.formatarDataHora(c.updated_at)}</small>
          </li>`;
      }).join("");
    }

    // --- Gráfico: cadastros por mês (últimos 6 meses) ---
    const chaveLocal = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const meses = Utils.mesesEntre(chaveLocal(inicioJanela), chaveLocal(hoje));
    const porMes = Object.fromEntries(meses.map((m) => [m, 0]));
    cadastrosJanela.forEach((c) => {
      // Usa o mês no fuso do navegador (e não o UTC do banco).
      const chave = chaveLocal(new Date(c.created_at));
      if (chave in porMes) porMes[chave]++;
    });
    Utils.desenharColunas(
      document.getElementById("grafico-meses"),
      meses.map((m) => ({ rotulo: Utils.rotuloMes(m), valor: porMes[m] })),
      { vazio: "Ainda não há cadastros nos últimos 6 meses." }
    );

    // --- Gráfico: clientes por tipo ---
    Utils.desenharBarras(
      document.getElementById("grafico-tipos"),
      [
        { rotulo: "Pessoa física", valor: pf },
        { rotulo: "Pessoa jurídica", valor: pj },
      ],
      { vazio: "Cadastre clientes para ver a distribuição por tipo." }
    );
  } catch (e) {
    console.error(e);
    erro.textContent = `Não foi possível carregar os dados. ${Utils.traduzirErro(e)}`;
    erro.hidden = false;
  } finally {
    painel.setAttribute("aria-busy", "false");
    painel.classList.remove("is-loading");
  }
}

/* Auxiliares */
function semErro({ data, error }) {
  if (error) throw error;
  return data;
}

function definirTexto(id, texto) {
  document.getElementById(id).textContent = texto;
}
