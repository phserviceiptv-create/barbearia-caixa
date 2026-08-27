/* Serviços rápidos no Caixa. Não altera autenticação. */
(function(){
  const css=document.createElement('style');
  css.textContent='.quick-services{display:flex;flex-wrap:wrap;gap:10px;margin:18px 0}.quick-service{min-width:150px;padding:14px 16px;border-radius:12px;font-weight:700;cursor:pointer}.quick-service small{display:block;font-weight:500;margin-top:4px}.quick-empty{padding:12px 0}.quick-note{width:100%;margin:0 0 8px}.quick-service{border:1px solid rgba(0,0,0,.12);background:var(--card,#fff)}';
  document.head.appendChild(css);
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const money=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  function render(){
    const box=document.getElementById('serviceQuickButtons');
    if(!box) return;
    const active=Array.isArray(window.servicos) ? window.servicos.filter(s=>s.ativo) : [];
    box.innerHTML=active.length
      ? '<p class="quick-note muted">Serviços rápidos — toque para lançar no caixa:</p>'+active.map(s=>`<button type="button" class="quick-service" data-service-id="${esc(s.id)}"><span>${esc(s.nome)}</span><small>${money(s.valor)}</small></button>`).join('')
      : '<div class="quick-empty muted">Cadastre serviços em Configurações para aparecerem aqui.</div>';
    box.querySelectorAll('.quick-service').forEach(btn=>btn.addEventListener('click',()=>{
      const s=active.find(x=>String(x.id)===String(btn.dataset.serviceId));
      if(!s || typeof window.openModal!=='function') return;
      window.openModal(`<h2>${esc(s.nome)}</h2><p class="muted">Entrada no caixa</p><label>Valor<input id="mValor" type="number" min="0" step="0.01" value="${Number(s.valor)||0}"></label><label>Pagamento<select id="mForma"><option>Pix</option><option>Dinheiro</option><option>Cartão</option><option>Outro</option></select></label><input id="mDesc" value="${esc(s.nome)}" hidden><select id="mTipo" hidden><option value="entrada" selected>Entrada</option></select><input id="mCategoria" value="Atendimento" hidden><button id="quickSaveMovementBtn">Registrar no caixa</button><div id="modalMsg" class="msg"></div>`);
      document.getElementById('quickSaveMovementBtn')?.addEventListener('click',()=>window.saveMovement?.());
    }));
  }
  function waitForServices(){
    if(document.getElementById('serviceQuickButtons') && Array.isArray(window.servicos)) render();
    else setTimeout(waitForServices,150);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',waitForServices); else waitForServices();
  window.renderQuickServices=render;
})();
