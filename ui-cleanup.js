/* Ajustes de interface solicitados. Não altera autenticação nem Supabase Auth. */
(function () {
  function cleanServices() {
    // Esconde a caixa de tempo sem remover o elemento que o código original usa internamente.
    const dur = document.getElementById('svcDuracao');
    if (dur) dur.style.display = 'none';
    // Remove a descrição do cadastro de serviços.
    document.getElementById('svcDescricao')?.remove();
    // A listagem mostra somente nome, valor e ações.
    document.querySelectorAll('#servicosList .service-row').forEach(row => {
      const muted = row.querySelector('.muted');
      if (muted) {
        const value = muted.textContent.split('·')[0].trim();
        muted.textContent = value;
      }
    });
  }

  function cleanAgenda() {
    const panel = document.getElementById('agenda');
    if (!panel) return;
    panel.querySelector('.agenda-toolbar')?.remove();
    document.getElementById('agendaList')?.remove();
    panel.querySelector('.agenda-atendimento')?.remove();
    const title = panel.querySelector('h2');
    if (title) title.textContent = 'Agendar contato';
    const subtitle = panel.querySelector('.topline .muted');
    if (subtitle) subtitle.textContent = 'Salve o contato do cliente para atendimento';
    const btn = document.getElementById('novoAgendamentoBtn');
    if (btn) btn.textContent = '+ Agendar contato';
  }

  // A aba Agendamento usa o cadastro de cliente já existente, mostrando somente nome e telefone.
  // Assim o salvamento continua usando o fluxo original do app, sem duplicar lógica de autenticação/banco.
  window.openAppointmentModal = function () {
    if (typeof window.openClientModal !== 'function') return;
    window.openClientModal(null);
    setTimeout(() => {
      const modalTitle = document.querySelector('#modalContent h2');
      if (modalTitle) modalTitle.textContent = 'Agendar contato';
      ['mEmail','mCpf','mNascimento','mEndereco','mObs'].forEach(id => {
        document.getElementById(id)?.remove();
      });
      const save = document.getElementById('saveClientModal');
      if (save) save.textContent = 'Salvar contato';
    }, 0);
  };

  function apply() {
    cleanServices();
    cleanAgenda();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(apply, 50));
  } else {
    setTimeout(apply, 50);
  }

  // Reaplica somente quando o app redesenha a lista de serviços; não monitora a página inteira.
  const originalRender = window.renderServicos;
  if (typeof originalRender === 'function') {
    window.renderServicos = function () {
      const result = originalRender.apply(this, arguments);
      setTimeout(cleanServices, 0);
      return result;
    };
  }
})();
