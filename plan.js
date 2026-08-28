(function(){
  const PLANOS = {
    mensal: { label: 'Mensal', valor: 29.90 },
    trimestral: { label: 'Trimestral', valor: 79.90 },
    semestral: { label: 'Semestral', valor: 149.90 },
    anual: { label: 'Anual', valor: 249.90 }
  };
  let assinatura = null;
  let initialized = false;
  let polling = null;
  const money = v => Number(v || 0).toLocaleString('pt-BR', {style:'currency', currency:'BRL'});
  const $ = id => document.getElementById(id);
  function injectStyles(){
    if ($('planStyles')) return;
    const s=document.createElement('style'); s.id='planStyles';
    s.textContent=`
      .plan-trigger{display:inline-flex;align-items:center;gap:8px;border:0;border-radius:999px;padding:9px 14px;font-weight:800;cursor:pointer;background:#111827;color:#fff;box-shadow:0 8px 24px rgba(0,0,0,.12)}
      .plan-trigger.free{background:#eef2f7;color:#334155}.plan-trigger.pro{background:#111827;color:#fff}.plan-trigger .plan-dot{width:8px;height:8px;border-radius:50%;background:#94a3b8}.plan-trigger.pro .plan-dot{background:#f59e0b}
      .plan-overlay{position:fixed;inset:0;background:rgba(15,23,42,.55);display:flex;align-items:center;justify-content:center;padding:20px;z-index:9999}
      .plan-box{width:min(760px,100%);max-height:90vh;overflow:auto;background:#fff;border-radius:24px;padding:28px;box-shadow:0 30px 80px rgba(0,0,0,.25)}
      .plan-head{display:flex;justify-content:space-between;gap:15px;align-items:flex-start}.plan-box h2{margin:0 0 6px}.plan-sub{margin:0 0 22px;color:#64748b}.plan-close{border:0;background:#f1f5f9;border-radius:50%;width:38px;height:38px;font-size:24px;cursor:pointer}
      .plan-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.plan-card{border:1px solid #e2e8f0;border-radius:18px;padding:20px}.plan-card.pro-card{border:2px solid #111827}.plan-card h3{margin:0 0 5px}.plan-price{font-size:26px;font-weight:900;margin:8px 0 14px}.plan-card ul{margin:0 0 18px;padding-left:19px;line-height:1.8;color:#475569}.plan-select{width:100%;padding:11px;border:1px solid #cbd5e1;border-radius:10px;background:#fff}.plan-primary{width:100%;border:0;border-radius:11px;padding:12px;font-weight:800;background:#111827;color:#fff;cursor:pointer;margin-top:10px}.plan-primary:disabled{opacity:.6;cursor:not-allowed}.plan-secondary{border:1px solid #cbd5e1;border-radius:11px;padding:11px 14px;background:#fff;font-weight:700;cursor:pointer}.plan-status{margin-top:15px;padding:12px 14px;border-radius:12px;background:#f8fafc;color:#475569}.plan-status.ok{background:#ecfdf5;color:#166534}.plan-status.warn{background:#fffbeb;color:#92400e}.plan-note{font-size:12px;color:#64748b;margin-top:14px;line-height:1.5}
      @media(max-width:700px){.plan-grid{grid-template-columns:1fr}.plan-box{padding:20px}.plan-head{align-items:center}}
    `; document.head.appendChild(s);
  }
  function ensureTrigger(){
    const header=document.querySelector('#appView header'); if(!header || $('planTrigger')) return; injectStyles();
    const btn=document.createElement('button'); btn.id='planTrigger'; btn.className='plan-trigger free'; btn.innerHTML='<span class="plan-dot"></span><span class="plan-label">Plano Gratuito</span>'; btn.onclick=openPlan;
    const logout=$('logoutBtn'); header.insertBefore(btn, logout || null);
  }
  async function loadSubscription(){
    try{ if(!window.sb || !window.empresa?.id) return; const r=await sb.from('assinaturas').select('*').eq('empresa_id',empresa.id).order('created_at',{ascending:false}).limit(1).maybeSingle(); assinatura=r.data||null; updateTrigger(); }catch(e){ console.warn('Plano:',e); }
  }
  function isPro(){ return String(window.empresa?.plano_acesso||'').toLowerCase()==='pro' || assinatura?.status==='ativa'; }
  function updateTrigger(){ const b=$('planTrigger'); if(!b) return; const pro=isPro(); b.className='plan-trigger '+(pro?'pro':'free'); const label=b.querySelector('.plan-label'); if(label) label.textContent=pro?'Plano PRO':'Plano Gratuito'; }
  function closePlan(){ $('planOverlay')?.remove(); }
  function openPlan(){
    if($('planOverlay')) return; injectStyles(); const pro=isPro(); const current=assinatura?.plano ? PLANOS[assinatura.plano] : null; const status=assinatura?.status||'';
    const overlay=document.createElement('div'); overlay.id='planOverlay'; overlay.className='plan-overlay';
    overlay.innerHTML=`<div class="plan-box" role="dialog" aria-modal="true"><div class="plan-head"><div><h2>${pro?'Seu plano PRO':'Escolha como usar o Barbearia Caixa'}</h2><p class="plan-sub">A versão gratuita continua disponível. O PRO fica dentro da mesma aplicação.</p></div><button class="plan-close" id="planClose">×</button></div><div class="plan-grid"><div class="plan-card"><h3>Gratuito</h3><div class="plan-price">R$ 0</div><ul><li>Caixa e movimentações</li><li>Clientes</li><li>Agenda</li><li>Histórico</li><li>Configurações básicas</li></ul><button class="plan-secondary" disabled>Plano atual</button></div><div class="plan-card pro-card"><h3>PRO</h3><div class="plan-price">a partir de R$ 29,90</div><ul><li>Recursos avançados do sistema</li><li>Relatórios e gestão ampliada</li><li>Recibos e ferramentas profissionais</li><li>Atualizações e recursos PRO</li><li>Suporte prioritário</li></ul>${pro?'<button class="plan-secondary" disabled>PRO ativo</button>':`<label style="display:block;font-weight:700">Escolha a cobrança</label><select id="planSelect" class="plan-select"><option value="mensal">Mensal — ${money(29.90)}</option><option value="trimestral">Trimestral — ${money(79.90)}</option><option value="semestral">Semestral — ${money(149.90)}</option><option value="anual">Anual — ${money(249.90)}</option></select><button id="planUpgradeBtn" class="plan-primary">Assinar PRO</button>`}</div></div>${status && !pro?`<div class="plan-status warn">Assinatura ${status}. Se você já pagou, clique em <b>Atualizar status</b>.</div>`:''}${pro?`<div class="plan-status ok">Seu acesso PRO está ativo${current?' · '+current.label:''}.</div>`:''}<div style="display:flex;gap:10px;margin-top:14px;justify-content:flex-end"><button class="plan-secondary" id="planRefresh">Atualizar status</button></div><div id="planMsg" class="plan-note">O pagamento é processado pelo Asaas. A aplicação libera o PRO somente após a confirmação do pagamento.</div></div>`;
    document.body.appendChild(overlay); $('planClose').onclick=closePlan; overlay.addEventListener('click',e=>{if(e.target===overlay)closePlan();}); $('planRefresh').onclick=async()=>{ await refreshStatus(true); }; $('planUpgradeBtn')?.addEventListener('click',startUpgrade);
  }
  async function startUpgrade(){
    const btn=$('planUpgradeBtn'), msg=$('planMsg'), plan=$('planSelect')?.value; if(!btn||!plan) return;
    try{ btn.disabled=true; btn.textContent='Preparando pagamento...'; msg.textContent='Conectando ao pagamento seguro...'; const {data:{session}}=await sb.auth.getSession(); if(!session) throw new Error('Sua sessão expirou. Entre novamente.');
      const r=await fetch('/api/create-subscription',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+session.access_token},body:JSON.stringify({plan})}); const data=await r.json().catch(()=>({})); if(!r.ok) throw new Error(data.error||'Não foi possível iniciar a assinatura.');
      assinatura=data.assinatura||assinatura; if(data.checkout_url){ msg.textContent='Abrindo a página segura de pagamento...'; window.open(data.checkout_url,'_blank'); } else msg.textContent='Assinatura criada. Aguarde a confirmação do pagamento.'; setTimeout(()=>loadSubscription(),1200);
    }catch(e){ msg.textContent=e.message||'Erro ao iniciar assinatura.'; } finally{btn.disabled=false;btn.textContent='Assinar PRO';}
  }
  async function refreshStatus(showMsg){
    const msg=$('planMsg'); try{ if(showMsg&&msg) msg.textContent='Consultando status do pagamento...'; await loadSubscription();
      if(assinatura?.asaas_subscription_id && assinatura?.id && assinatura.status!=='ativa'){ const {data:{session}}=await sb.auth.getSession(); if(session){ const r=await fetch('/api/check-subscription',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+session.access_token},body:JSON.stringify({asaas_subscription_id:assinatura.asaas_subscription_id,assinatura_id:assinatura.id})}); if(r.ok){ const d=await r.json(); assinatura=d.assinatura||assinatura; } } }
      updateTrigger(); if(showMsg&&msg) msg.textContent=isPro()?'Pagamento confirmado. Seu PRO está ativo.':'Ainda não há confirmação de pagamento. Tente novamente após concluir o pagamento.'; if(isPro()) setTimeout(()=>{closePlan(); location.reload();},1200);
    }catch(e){ if(msg) msg.textContent=e.message||'Não foi possível atualizar o status.'; }
  }
  function start(){ const ready=!!window.empresa?.id && !$('appView')?.classList.contains('hidden'); if(!ready) return; injectStyles(); ensureTrigger(); loadSubscription(); if(new URLSearchParams(location.search).get('modo')==='pago' && !polling){ let tries=0; polling=setInterval(async()=>{tries++; await refreshStatus(false); if(isPro()||tries>=12){clearInterval(polling);polling=null;}},5000); } }
  setInterval(start,1200); document.addEventListener('visibilitychange',()=>{if(!document.hidden){start();}});
})();
