/* Serviços rápidos no Caixa. Não altera autenticação. */
(function(){
  const css=document.createElement('style');
  css.textContent='.quick-services{display:flex;flex-wrap:wrap;gap:10px;margin:18px 0}.quick-service{min-width:150px;padding:14px 16px;border-radius:12px;font-weight:700;cursor:pointer;color:#111!important;background:#fff!important;border:1px solid rgba(0,0,0,.12)}.quick-service span{color:#111!important}.quick-service small{display:block;font-weight:500;margin-top:4px;color:#555!important}.quick-empty{padding:12px 0}.quick-note{width:100%;margin:0 0 8px}.quick-client{margin-top:12px}';
  document.head.appendChild(css);
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const money=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});

  function getServicesFromScreen(){
    return Array.from(document.querySelectorAll('#servicosList .service-row')).map(row=>{
      const name=(row.querySelector('b')?.textContent||'').trim();
      const text=(row.textContent||'').replace(/\s+/g,' ').trim();
      const valueMatch=text.match(/R\$\s*[\d.]+,\d{2}/);
      const value=valueMatch?Number(valueMatch[0].replace(/[^\d,]/g,'').replace(',','.')):0;
      const active=(row.querySelector('.pill')?.textContent||'').trim().toLowerCase()==='ativo';
      return {name,value,active};
    }).filter(s=>s.name&&s.active);
  }

  function render(){
    const box=document.getElementById('serviceQuickButtons');
    if(!box) return;
    const active=getServicesFromScreen();
    box.innerHTML=active.length
      ? '<p class="quick-note muted">Serviços rápidos — toque para lançar no caixa:</p>'+active.map((s,i)=>`<button type="button" class="quick-service" data-index="${i}"><span>${esc(s.name)}</span><small>${money(s.value)}</small></button>`).join('')
      : '<div class="quick-empty muted">Cadastre serviços em Configurações para aparecerem aqui.</div>';
    box.querySelectorAll('.quick-service').forEach(btn=>btn.addEventListener('click',()=>{
      const s=active[Number(btn.dataset.index)];
      if(!s || typeof window.openModal!=='function') return;
      const clientOptions='<option value="">Selecionar cliente...</option>';
        
      window.openModal(`<h2>${esc(s.name)}</h2><p class="muted">Registrar atendimento no caixa</p><label>Cliente<select id="atCliente" class="quick-client">${clientOptions}</select></label><label>Valor<input id="mValor" type="number" min="0" step="0.01" value="${s.value}"></label><label>Pagamento<select id="mForma"><option>Pix</option><option>Dinheiro</option><option>Cartão</option><option>Outro</option></select></label><input id="mDesc" value="${esc(s.name)}" hidden><select id="mTipo" hidden><option value="entrada" selected>Entrada</option></select><input id="mCategoria" value="Atendimento" hidden><button id="quickSaveMovementBtn">Registrar no caixa</button><div id="modalMsg" class="msg"></div>`);
      if(typeof window.fillClientSelect==='function') window.fillClientSelect();
      document.getElementById('quickSaveMovementBtn')?.addEventListener('click',()=>window.saveMovement?.());
    }));
  }

  window.renderQuickServices=render;
  function watchServices(){
    const list=document.getElementById('servicosList');
    if(!list) return;
    render();
    let timer;
    new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(render,50);}).observe(list,{childList:true,subtree:true,characterData:true});
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>setTimeout(watchServices,100)); else setTimeout(watchServices,100);
})();
