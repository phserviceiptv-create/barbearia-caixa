/* Serviços rápidos no Caixa. Não altera autenticação. */
(function(){
  const css=document.createElement('style');
  css.textContent='.quick-services{display:flex;flex-wrap:wrap;gap:10px;margin:18px 0}.quick-service{min-width:150px;padding:14px 16px;border-radius:12px;font-weight:700;cursor:pointer}.quick-service small{display:block;font-weight:500;margin-top:4px}.quick-empty{padding:12px 0}.quick-note{margin:0 0 8px}';
  document.head.appendChild(css);
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const money=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  function render(){
    const box=document.getElementById('serviceQuickButtons'), select=document.getElementById('atServicoSelect');
    if(!box||!select) return;
    const active=Array.from(select.options).slice(1).filter(o=>o.value);
    box.innerHTML=active.length
      ? '<p class="quick-note muted">Toque no serviço para iniciar uma entrada no caixa:</p>'+active.map(o=>`<button type="button" class="quick-service" data-service-id="${esc(o.value)}"><span>${esc(o.dataset.nome||o.textContent.split(' — ')[0])}</span><small>${money(o.dataset.valor)}</small></button>`).join('')
      : '<div class="quick-empty muted">Cadastre serviços em Configurações para aparecerem aqui.</div>';
    box.querySelectorAll('.quick-service').forEach(btn=>btn.addEventListener('click',()=>{
      const o=active.find(x=>x.value===btn.dataset.serviceId); if(!o||typeof window.openModal!=='function') return;
      const nome=esc(o.dataset.nome||o.textContent.split(' — ')[0]), valor=Number(o.dataset.valor)||0;
      window.openModal(`<h2>${nome}</h2><p class="muted">Entrada no caixa</p><label>Valor<input id="mValor" type="number" min="0" step="0.01" value="${valor}"></label><label>Pagamento<select id="mForma"><option>Pix</option><option>Dinheiro</option><option>Cartão</option><option>Outro</option></select></label><input id="mDesc" value="${nome.replace(/"/g,'&quot;')}" hidden><select id="mTipo" hidden><option value="entrada" selected>Entrada</option></select><input id="mCategoria" value="Atendimento" hidden><button id="quickSaveMovementBtn">Registrar no caixa</button><div id="modalMsg" class="msg"></div>`);
      document.getElementById('quickSaveMovementBtn')?.addEventListener('click',()=>window.saveMovement?.());
    }));
  }
  function wait(){
    if(document.getElementById('serviceQuickButtons')&&document.getElementById('atServicoSelect')) render();
    else setTimeout(wait,100);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',wait); else wait();
})();
