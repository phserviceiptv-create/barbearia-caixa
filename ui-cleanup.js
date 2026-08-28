/* Ajustes de interface solicitados. Não altera autenticação nem Supabase Auth. */
(function () {
  function cleanServices() {
    const dur = document.getElementById('svcDuracao');
    if (dur) dur.style.display = 'none';
    document.getElementById('svcDescricao')?.remove();
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
  window.openAppointmentModal = function () {
    if (typeof window.openClientModal !== 'function') return;
    window.openClientModal(null);
    setTimeout(() => {
      const modalTitle = document.querySelector('#modalContent h2');
      if (modalTitle) modalTitle.textContent = 'Agendar contato';
      ['mEmail','mCpf','mNascimento','mEndereco','mObs'].forEach(id => document.getElementById(id)?.remove());
      const save = document.getElementById('saveClientModal');
      if (save) save.textContent = 'Salvar contato';
    }, 0);
  };
  function apply() { cleanServices(); cleanAgenda(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(apply, 50));
  else setTimeout(apply, 50);
  const originalRender = window.renderServicos;
  if (typeof originalRender === 'function') {
    window.renderServicos = function () {
      const result = originalRender.apply(this, arguments);
      setTimeout(cleanServices, 0);
      return result;
    };
  }
})();

/* Modo PRO: a versão grátis permanece intacta quando a URL não contém ?modo=pago. */
(() => {
  const paid = new URLSearchParams(location.search).get('modo') === 'pago';
  if (!paid) return;
  window.PAID_MODE = true;
  const PLANS = {
    mensal: {label:'Mensal', price:29.90, months:1, frequency:1},
    trimestral: {label:'Trimestral', price:79.90, months:3, frequency:3},
    semestral: {label:'Semestral', price:149.90, months:6, frequency:6},
    anual: {label:'Anual', price:249.90, months:12, frequency:12}
  };
  const money = v => Number(v).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  let selected = localStorage.getItem('bc_paid_plan') || 'mensal';
  let currentSubscription = null;
  const sb = () => window.supabase.createClient('https://zjeclsozvjymuzwyhvqj.supabase.co','sb_publishable_WyjaTHvDUwGPCwHaXcdApw_xlssm0TE');
  function hideAll(){ ['authView','setupView','appView'].forEach(id=>document.getElementById(id)?.classList.add('hidden')); }
  function showAuth(){ hideAll(); document.getElementById('authView')?.classList.remove('hidden'); }
  function mount(){
    if(document.getElementById('paidView')) return;
    const el=document.createElement('div'); el.id='paidView'; el.className='center';
    el.innerHTML=`<div class="card auth-card wide-card paid-card"><div class="brand brand-center"><span class="brand-mark">✂</span><span>Barbearia Caixa PRO</span></div><h1>Escolha seu plano</h1><p class="muted">Acesso completo ao aplicativo. O acesso é liberado após a confirmação do pagamento.</p><div class="paid-plans">${Object.entries(PLANS).map(([k,p])=>`<button class="paid-plan ${k===selected?'selected':''}" data-plan="${k}"><b>${p.label}</b><strong>${money(p.price)}</strong><span>${k==='mensal'?'cobrança mensal':`a cada ${p.months} meses`}</span></button>`).join('')}</div><div class="paid-actions"><button id="paidContinue">Continuar para pagamento</button><button id="paidBack" class="secondary">Usar versão grátis</button></div><div id="paidMsg" class="msg"></div></div>`;
    document.body.appendChild(el);
    el.querySelectorAll('.paid-plan').forEach(b=>b.addEventListener('click',()=>{selected=b.dataset.plan;localStorage.setItem('bc_paid_plan',selected);el.querySelectorAll('.paid-plan').forEach(x=>x.classList.toggle('selected',x===b));}));
    document.getElementById('paidContinue').addEventListener('click',startPayment);
    document.getElementById('paidBack').addEventListener('click',()=>{location.href=location.pathname;});
  }
  function setMsg(t){const m=document.getElementById('paidMsg'); if(m)m.textContent=t||'';}
  function showPaid(){hideAll();document.getElementById('paidView')?.classList.remove('hidden');}
  async function getToken(){const {data:{session}}=await sb().auth.getSession();return session?.access_token||null;}
  async function startPayment(){
    const token=await getToken();
    if(!token){showAuth();setMsg('Entre ou crie seu acesso para continuar.');return;}
    setMsg('Criando pagamento...');
    try{
      const r=await fetch('/api/create-subscription',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},body:JSON.stringify({plan:selected})});
      const j=await r.json(); if(!r.ok) throw new Error(j.error||'Não foi possível iniciar o pagamento.');
      if(j.checkout_url){location.href=j.checkout_url;return;}
      throw new Error('Mercado Pago não retornou o link de pagamento.');
    }catch(e){setMsg(e.message);}
  }
  window.ensurePaidAccess = async function(empresa){
    try{
      const client=sb();
      const {data:{session}}=await client.auth.getSession();
      if(!session){showAuth();return false;}
      const {data:subs}=await client.from('assinaturas').select('*').eq('empresa_id',empresa).order('created_at',{ascending:false}).limit(1);
      currentSubscription=subs?.[0]||null;
      if(currentSubscription?.mp_preapproval_id){
        try{ await fetch('/api/check-subscription',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${session.access_token}`},body:JSON.stringify({assinatura_id:currentSubscription.id,mp_preapproval_id:currentSubscription.mp_preapproval_id})}); }catch(_e){}
        const {data:again}=await client.from('assinaturas').select('*').eq('id',currentSubscription.id).maybeSingle(); currentSubscription=again||currentSubscription;
      }
      const active=currentSubscription && currentSubscription.status==='ativa' && (!currentSubscription.expira_em || new Date(currentSubscription.expira_em)>new Date());
      if(active){document.getElementById('paidView')?.remove();return true;}
      mount();showPaid();
      setMsg(currentSubscription?.status==='pendente'?'Pagamento pendente. Conclua o pagamento e atualize esta página para confirmar.':'Selecione um plano para liberar o acesso.');
      return false;
    }catch(e){mount();showPaid();setMsg('Não foi possível verificar a assinatura agora.');return false;}
  };
  const originalLoadProfile = window.loadProfile;
  if(typeof originalLoadProfile==='function'){
    window.loadProfile = async function(){
      const result = await originalLoadProfile.apply(this, arguments);
      if(window.PAID_MODE && window.user?.id && window.empresa?.id){
        const allowed = await window.ensurePaidAccess(window.empresa.id);
        if(!allowed) document.getElementById('appView')?.classList.add('hidden');
      }
      return result;
    };
  }
  window.addEventListener('pageshow',()=>{if(window.PAID_MODE) mount();});
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>{mount();}); else mount();
})();
