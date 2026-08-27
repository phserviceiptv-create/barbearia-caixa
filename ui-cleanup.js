/* Limpeza visual isolada. Sem MutationObserver e sem alteração de autenticação. */
(function () {
  function stripServiceDescriptions() {
    document.querySelectorAll('#servicosList .service-row .muted').forEach(el => {
      const text = el.textContent || '';
      const match = text.match(/^(.*?\d+\s*min)/i);
      if (match && match[1] !== text) el.textContent = match[1];
    });
  }
  const original = window.renderServicos;
  if (typeof original === 'function') {
    window.renderServicos = function () {
      const result = original.apply(this, arguments);
      setTimeout(stripServiceDescriptions, 0);
      return result;
    };
  }
})();
