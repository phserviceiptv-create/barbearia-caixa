/* Ajustes visuais solicitados: não altera autenticação nem regras de negócio. */
(function () {
  function removeByHeading(text) {
    const headings = Array.from(document.querySelectorAll("h3"));
    const heading = headings.find(h => h.textContent.trim().toLowerCase() === text.toLowerCase());
    if (heading) heading.closest(".settings-card")?.remove();
  }

  function apply() {
    // Retira completamente a área de produtos da tela.
    removeByHeading("Produtos");

    // Retira o campo de descrição do cadastro/listagem de serviços.
    document.getElementById("svcDescricao")?.closest("textarea")?.remove();

    // Mantém apenas um campo para o nome do estabelecimento.
    document.getElementById("cfgFantasia")?.remove();
    document.getElementById("empresaFantasia")?.remove();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => setTimeout(apply, 0));
  } else {
    setTimeout(apply, 0);
  }

  // O app pode reconstruir partes da tela após login/refresh; reaplica sem tocar no login.
  new MutationObserver(() => apply()).observe(document.body, { childList: true, subtree: true });
})();
