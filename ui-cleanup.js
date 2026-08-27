/* Ajustes de interface solicitados. Não altera autenticação nem Supabase Auth. */
(function () {
  function cleanServices() {
    // Remove a caixa de tempo do cadastro de serviços.
    document.getElementById('svcDuracao')?.closest('input')?.remove();
    // Remove a descrição do cadastro de serviços.
    document.getElementById('svcDescricao')?.remove();
    // A listagem mostra somente nome, valor e status.
    const list = document.getElementById('servicosList');
    if (!list) return;
    list.querySelectorAll('.service-row').forEach(row => {
      row.querySelector('.muted')?.remove();
    });
  }

  function renderServicesClean() {
    const list = document.getElementById('servicosList');
    if (!list || !Array.isArray(window.servicos)) return;
    list.innerHTML = window.servicos.length ? window.servicos.map(s => `
      <div class="service-row">
        <div><b>${window.esc(s.nome)}</b><div class="muted">${window.money(s.valor)}</div></div>
        <div class="actions"><span class="pill">${s.ativo ? 'Ativo' : 'Inativo'}</span>
          <button onclick="toggleService('${s.id}',${!s.ativo})">${s.ativo ? 'Desativar' : 'Ativar'}</button>
          <button onclick="deleteService('${s.id}')">Excluir</button>
        </div>
      </div>`).join('') : '<div class="empty">Nenhum serviço cadastrado.</div>';
  }

  function cleanAgenda() {
    const panel = document.getElementById('agenda');
    if (!panel) return;
    panel.querySelector('.agenda-toolbar')?.remove();
    document.getElementById('agendaList')?.remove();
    document.querySelector('.agenda-atendimento')?.remove();
    const title = panel.querySelector('h2');
    if (title) title.textContent = 'Agendar contato';
    const subtitle = panel.querySelector('.topline .muted');
    if (subtitle) subtitle.textContent = 'Salve o contato do cliente para atendimento';
    const btn = document.getElementById('novoAgendamentoBtn');
    if (btn) btn.textContent = '+ Agendar contato';
  }

  // Substitui o cadastro de serviço por uma versão que não exige tempo.
  const originalAddServico = window.addServico;
  if (typeof originalAddServico === 'function') {
    window.addServico = async function () {
      const dur = document.getElementById('svcDuracao');
      // O banco antigo pode ter o campo de duração; usamos 30 internamente, sem exibi-lo.
      if (dur) dur.value = '30';
      return originalAddServico.apply(this, arguments);
    };
  }

  // A aba Agendamento passa a salvar somente nome e telefone/WhatsApp do cliente.
  window.openAppointmentModal = function () {
    window.openModal(`<h2>Agendar contato</h2>
      <label>Nome do cliente<input id="agContatoNome" placeholder="Nome *"></label>
      <label>WhatsApp / telefone<input id="agContatoTel" placeholder="(00) 00000-0000"></label>
      <button id="saveAgContatoBtn">Salvar contato</button>
      <div id="modalMsg" class="msg"></div>`);
    document.getElementById('saveAgContatoBtn')?.addEventListener('click', async () => {
      const nome = document.getElementById('agContatoNome')?.value.trim();
      const telefone = document.getElementById('agContatoTel')?.value.trim() || null;
      if (!nome) return window.msg('modalMsg', 'Informe o nome do cliente.');
      const existing = Array.isArray(window.clientes) ? window.clientes.find(c =>
        telefone && c.telefone && window.phone(c.telefone) === window.phone(telefone)
      ) : null;
      const r = existing
        ? await window.sb.from('clientes').update({nome, telefone}).eq('id', existing.id).eq('empresa_id', window.empresa.id).select().single()
        : await window.sb.from('clientes').insert({nome, telefone, empresa_id:window.empresa.id}).select().single();
      if (r.error) return window.msg('modalMsg', r.error.message);
      window.closeModal();
      await window.loadClients();
      window.renderClients();
      window.fillClientSelect();
      alert('Contato salvo com sucesso.');
    });
  };

  function apply() {
    cleanServices();
    cleanAgenda();
  }

  // Executa depois que o DOM e o aplicativo estiverem prontos.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(apply, 50));
  } else {
    setTimeout(apply, 50);
  }

  // O app pode renderizar a lista de serviços novamente após salvar.
  const originalRender = window.renderServicos;
  if (typeof originalRender === 'function') {
    window.renderServicos = function () {
      const result = originalRender.apply(this, arguments);
      setTimeout(() => { cleanServices(); }, 0);
      return result;
    };
  }
})();
