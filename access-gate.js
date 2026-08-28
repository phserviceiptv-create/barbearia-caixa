/* Controle de acesso Free x PRO.
   FREE: Caixa/Fluxo de Caixa + Agendamento online + edição dos dados da barbearia.
   PRO: libera as demais áreas e configurações avançadas.
*/
(function(){
  let pro=false;
  let lastPlanCheck=0;
  const $=id=>document.getElementById(id);

  function isPro(){
    const empresaPro=String(window.empresa?.plano_acesso||'').toLowerCase()==='pro';
    return empresaPro || pro;
  }

  async function checkPlan(force=false){
    if(!window.sb || !window.empresa?.id) return false;
    const now=Date.now();
    if(!force && now-lastPlanCheck<3000) return isPro();
    lastPlanCheck=now;
    try{
      const r=await sb.from('assinaturas').select('status').eq('empresa_id',window.empresa.id).order('created_at',{ascending:false}).limit(1).maybeSingle();
      pro=String(window.empresa?.plano_acesso||'').toLowerCase()==='pro' || r.data?.status==='ativa';
    }catch(e){
      pro=String(window.empresa?.plano_acesso||'').toLowerCase()==='pro';
    }
    apply();
    return pro;
  }

  function showUpgrade(){
    const trigger=$('planTrigger');
    if(trigger){ trigger.click(); return; }
    setTimeout(()=>{ const b=$('planTrigger'); if(b) b.click(); },250);
  }

  function toast(){
    const old=$('accessToast');
    if(old) old.remove();
    const el=document.createElement('div');
    el.id='accessToast';
    el.innerHTML='<div><strong>Recurso PRO</strong><span>Faça o upgrade para desbloquear este recurso.</span><button>Ver plano PRO</button></div>';
    el.style.cssText='position:fixed;right:20px;bottom:20px;z-index:10000;background:#111827;color:#fff;border-radius:16px;padding:14px 16px;box-shadow:0 18px 45px rgba(0,0,0,.25);font-family:inherit';
    const inner=el.firstElementChild; inner.style.cssText='display:flex;align-items:center;gap:12px;flex-wrap:wrap';
    inner.querySelector('strong').style.cssText='font-size:14px';
    inner.querySelector('span').style.cssText='font-size:13px;color:#cbd5e1';
    const b=inner.querySelector('button'); b.style.cssText='border:0;border-radius:10px;padding:8px 12px;font-weight:800;cursor:pointer'; b.onclick=()=>{el.remove();showUpgrade();};
    document.body.appendChild(el);
    setTimeout(()=>el.remove(),5000);
  }

  function lockTab(btn){
    if(btn.dataset.proLocked==='1') return;
    btn.dataset.proLocked='1';
    btn.classList.add('pro-locked');
    const original=btn.textContent.trim();
    btn.dataset.originalText=original;
    btn.innerHTML='<span>'+original+'</span><span class="pro-lock">🔒 PRO</span>';
    btn.addEventListener('click',gateClick,true);
  }

  function unlockTab(btn){
    if(btn.dataset.proLocked!=='1') return;
    btn.dataset.proLocked='0';
    btn.classList.remove('pro-locked');
    btn.innerHTML=btn.dataset.originalText||btn.textContent.replace('🔒 PRO','').trim();
  }

  function gateClick(e){
    if(isPro()) return;
    e.preventDefault(); e.stopImmediatePropagation();
    document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
    const dash=$('dashboard'); if(dash){document.querySelectorAll('.panel').forEach(x=>x.classList.remove('active'));dash.classList.add('active');}
    toast();
    showUpgrade();
  }

  function lockSettingsSection(card){
    if(!card) return;
    card.classList.add('pro-section-locked');
    if(card.querySelector('.pro-section-overlay')) return;
    const overlay=document.createElement('div');
    overlay.className='pro-section-overlay';
    overlay.innerHTML='<strong>🔒 Recurso PRO</strong><span>Serviços e horários ficam disponíveis no plano PRO.</span><button type="button">Ver plano PRO</button>';
    overlay.querySelector('button').onclick=()=>showUpgrade();
    card.appendChild(overlay);
  }

  function unlockSettingsSection(card){
    if(!card) return;
    card.classList.remove('pro-section-locked');
    card.querySelector('.pro-section-overlay')?.remove();
  }

  function applySettingsAccess(){
    const settings=$('configuracoes');
    if(!settings) return;
    const cards=settings.querySelectorAll('.settings-card');
    if(cards.length<3) return;
    const servicesCard=cards[1];
    const hoursCard=cards[2];
    if(isPro()){
      unlockSettingsSection(servicesCard);
      unlockSettingsSection(hoursCard);
    }else{
      lockSettingsSection(servicesCard);
      lockSettingsSection(hoursCard);
    }
  }

  function addStyles(){
    if($('accessGateStyles')) return;
    const s=document.createElement('style'); s.id='accessGateStyles';
    s.textContent='.tab.pro-locked{opacity:.72;position:relative}.tab.pro-locked .pro-lock{margin-left:6px;font-size:10px;font-weight:800}.pro-section-locked{position:relative!important}.pro-section-locked>*:not(.pro-section-overlay){pointer-events:none!important;user-select:none!important;filter:grayscale(.15)}.pro-section-overlay{position:absolute;inset:0;z-index:20;background:rgba(248,250,252,.88);backdrop-filter:blur(1px);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:24px;border-radius:16px}.pro-section-overlay strong{display:block;font-size:16px;margin-bottom:6px}.pro-section-overlay span{display:block;color:#64748b;font-size:13px;margin-bottom:12px}.pro-section-overlay button{border:0;border-radius:10px;padding:10px 14px;font-weight:800;cursor:pointer}.free-plan-note{margin:0 0 16px;padding:12px 14px;border-radius:12px;background:#f8fafc;color:#475569;font-size:13px}';
    document.head.appendChild(s);
  }

  function apply(){
    addStyles();
    document.querySelectorAll('.tab').forEach(btn=>{
      const isFreeArea=btn.dataset.tab==='dashboard' || btn.dataset.tab==='agenda' || btn.dataset.tab==='configuracoes';
      if(isPro()||isFreeArea) unlockTab(btn); else lockTab(btn);
    });

    if(!isPro()){
      const app=$('appView');
      if(app){
        document.querySelectorAll('.panel').forEach(p=>{ if(p.id!=='dashboard' && p.id!=='agenda' && p.id!=='configuracoes') p.classList.remove('active'); });
        $('dashboard')?.classList.add('active');
      }
    }

    const planTrigger=$('planTrigger');
    if(planTrigger && !isPro()){
      const label=planTrigger.querySelector('.plan-label'); if(label) label.textContent='Plano Gratuito';
    }
    applySettingsAccess();
  }

  function observe(){
    apply();
    checkPlan(true);
    setInterval(()=>checkPlan(false),5000);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)checkPlan(true);});

    document.addEventListener('click',e=>{
      if(isPro()) return;
      const tab=e.target.closest?.('.tab');
      if(tab && tab.dataset.tab!=='dashboard' && tab.dataset.tab!=='agenda' && tab.dataset.tab!=='configuracoes') return;
      const panel=e.target.closest?.('#historico,#clientes');
      if(panel){e.preventDefault();e.stopPropagation();toast();showUpgrade();}
    },true);
  }

  const boot=setInterval(()=>{
    if($('appView') && !$('appView').classList.contains('hidden') && window.empresa?.id){clearInterval(boot);observe();}
  },300);
})();
