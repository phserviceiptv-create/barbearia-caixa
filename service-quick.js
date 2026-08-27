/* Serviços rápidos no Caixa. Não altera autenticação. */
(function(){
  const css=document.createElement('style');
  css.textContent='.quick-services{display:flex;flex-wrap:wrap;gap:10px;margin:18px 0}.quick-service{min-width:150px;padding:14px 16px;border-radius:12px;font-weight:700;cursor:pointer}.quick-service small{display:block;font-weight:500;margin-top:4px}.quick-empty{padding:12px 0}.quick-note{margin:0 0 8px}';
  document.head.appendChild(css);

  function render(){
    const box=document.getElementById('serviceQuickButtons');
    if(!box || !Array.isArray(window.servicos)) return;
    const active=window.servicos.filter(s=>s.ativo);
    box.innerHTML=active.length
      ? '<p class="quick-note muted">Toque no serviço para iniciar uma entrada no caixa:</p>'+active.map(s=>`<button type="button" class="quick-service" data-service-id="${s.id}">${String(s.nome).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}<small>${window.money(s.valor)}</small></button>`).join('')
      : '<div class="quick-empty muted">Cadastre serviços em Configurações para aparecerem aqui.</div>';
    box.querySelectorAll('.quick-service').forEach(btn=>btn.addEventListener('click',()=>{
      const s=active.find(x=>x.id===btn.dataset.serviceId); if(!s) return;
      if(typeof window.openModal!=='function') return;
      window.openModal(`<h2>${String(s.nome).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}</h2><p class="muted">Entrada no caixa</p><label>Valor<input id="mValor" type="number" min="0" step="0.01" value="${Number(s.valor)||0}"></label><label>Pagamento<select id="mForma"><option>Pix</option><option>Dinheiro</option><option>Cartão</option><option>Outro</option></select></label><input id="mDesc" value="${String(s.nome).replace(/"/g,'&quot;')}" hidden><input id="mTipo" value="entrada" hidden><input id="mCategoria" value="Atendimento" hidden><button id="quickSaveMovementBtn">Registrar no caixa</button><div id="modalMsg" class="msg"></div>`);
      document.getElementById('quickSaveMovementBtn')?.addEventListener('click',()=>window.saveMovement?.());
    }));
  }
  function wait(){
    if(document.getElementById('serviceQuickButtons') && window.servicos) render();
    else setTimeout(wait,100);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',wait); else wait();
})();
