/* =====================================================================
   inicio.js - TELA "SEJAM BEM-VINDOS" (index.html)
   Página de boas-vindas com atalhos. Só precisa garantir o login e
   cumprimentar o funcionário pelo nome.
   ===================================================================== */

document.addEventListener("DOMContentLoaded", async () => {
  Utils.montarMenu("index");
  const usuario = await Auth.exigirLogin();
  if (!usuario) return;

  // O nome completo já foi carregado no menu por Auth.exigirLogin().
  const nome = document.getElementById("usuario-nome").textContent.trim().split(" ")[0];
  document.getElementById("saudacao").textContent = nome ? `Olá, ${nome}!` : "Olá!";
});
