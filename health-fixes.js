// Correcoes isoladas de robustez. Nao altera autenticacao nem Supabase.
(function(){
  const localTodayISO = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  };
  const normalizePhone = value => {
    let n = String(value || '').replace(/\D/g,'');
    if (n && n.length >= 10 && n.length <= 11 && !n.startsWith('55')) n = '55' + n;
    return n;
  };

  // Evita erro de data causado pelo uso de UTC no fuso do Brasil.
  window.todayISO = localTodayISO;

  // Abre o WhatsApp com numero brasileiro completo quando o cadastro estiver sem DDI.
  window.wa = function(number,text){
    const n = normalizePhone(number);
    if (!n) return;
    window.open(`https://wa.me/${n}?text=${encodeURIComponent(text || '')}`,'_blank','noopener');
  };

  // Evita duas leituras simultaneas do perfil quando o Supabase dispara o evento de autenticacao.
  const originalLoadProfile = window.loadProfile;
  let profilePromise = null;
  window.loadProfile = async function(){
    if (profilePromise) return profilePromise;
    profilePromise = Promise.resolve().then(() => originalLoadProfile()).finally(() => { profilePromise = null; });
    return profilePromise;
  };

  // Evita duplo clique no registro de atendimento sem tocar no fluxo de login.
  const originalRegisterAttendance = window.registerAttendance;
  window.registerAttendance = async function(){
    const btn = document.getElementById('registrarAtBtn');
    if (btn?.disabled) return;
    if (btn) {
      btn.disabled = true;
      btn.dataset.healthOldText = btn.textContent;
      btn.textContent = 'Registrando...';
    }
    try {
      return await originalRegisterAttendance();
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = btn.dataset.healthOldText || 'Registrar atendimento e emitir recibo';
      }
    }
  };

  // Exige valor positivo nos cadastros que exibem valor obrigatorio.
  const originalAddServico = window.addServico;
  window.addServico = async function(){
    const nome = document.getElementById('svcNome')?.value.trim();
    const valor = Number(document.getElementById('svcValor')?.value);
    const duracao = Number(document.getElementById('svcDuracao')?.value);
    if (!nome || !Number.isFinite(valor) || valor <= 0 || !Number.isFinite(duracao) || duracao <= 0) {
      if (typeof msg === 'function') msg('servicoMsg','Preencha serviço, valor e duração com valores válidos.');
      return;
    }
    return originalAddServico();
  };

  const originalAddProduto = window.addProduto;
  window.addProduto = async function(){
    const nome = document.getElementById('prodNome')?.value.trim();
    const preco = Number(document.getElementById('prodPreco')?.value);
    if (!nome || !Number.isFinite(preco) || preco <= 0) {
      if (typeof msg === 'function') msg('produtoMsg','Preencha produto e preço com valores válidos.');
      return;
    }
    return originalAddProduto();
  };
})();
