/* Serviços rápidos no Caixa. Não altera autenticação. */
(function(){
  const css=document.createElement('style');
  css.textContent='.quick-services{display:flex;flex-wrap:wrap;gap:10px;margin:18px 0}.quick-service{min-width:150px;padding:14px 16px;border-radius:12px;font-weight:700;cursor:pointer}.quick-service small{display:block;font-weight:500;margin-top:4px}.quick-empty{padding:12px 0}.quick-note{width:100%;margin:0 0 8px}.quick-service{border:1px solid rgba(0,0,0,.12);background:var(--card,#fff)}';
  document.head.appendChild(css);
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const money=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});

  function getServicesFromScreen(){
    return Array.from(document.querySelectorAll('#servicosList .service-row')).map(row=>{
      const name=row.querySelector('b')?.textContent?.trim()||'';
      const meta=row.querySelector('.muted')?.textContent||'';
      const active=(row.querySelector('.pill')?.textContent||'').trim().toLowerCase()==='ativo';
      const valueMatch=meta.match(/R\$\s*[\d.]+,\d{2}/);
      const value=valueMatch?Number(valueMatch[0].replace(/[^\d,]/g,'').replace('.','').replace(',','.')):0;
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
      window.openModal(`<h2>${esc(s.name)}</h2><p class="muted">Entrada no caixa</p><label>Valor<input id="mValor" type="number" min="0" step="0.01" value="${s.value}"></label><label>Pagamento<select id="mForma"><option>Pix</option><option>Dinheiro</option><option>Cartão</option><option>Outro</option></select></label><input id="mDesc" value="${esc(s.name)}" hidden><select id="mTipo" hidden><option value="entrada" selected>Entrada</option></select><input id="mCategoria" value="Atendimento" hidden><button id="quickSaveMovementBtn">Registrar no caixa</button><div id="modalMsg" class="msg"></div>`);
      document.getElementById('quickSaveMovementBtn')?.addEventListener('click',()=>window.saveMovement?.());
    }));
  }

  window.renderQuickServices=render;
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>setTimeout(render,50)); else setTimeout(render,50);
})();
