(function(){
  function loadJsPDF(){
    if(window.jspdf?.jsPDF) return Promise.resolve(window.jspdf.jsPDF);
    return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/jspdf/4.2.1/jspdf.umd.min.js';s.onload=()=>window.jspdf?.jsPDF?resolve(window.jspdf.jsPDF):reject(new Error('PDF não carregou.'));s.onerror=()=>reject(new Error('Não foi possível carregar o gerador de PDF.'));document.head.appendChild(s);});
  }
  function receiptData(a,c){
    const address=[empresa?.endereco,empresa?.cidade,empresa?.estado,empresa?.cep].filter(Boolean).join(' - ');
    const mov=movimentacoes.find(x=>x.atendimento_id===a?.id);
    return {name:empresa?.nome_fantasia||empresa?.nome||'Barbearia Caixa',cnpj:empresa?.cnpj||'',address,whatsapp:empresa?.whatsapp||empresa?.telefone||'',logo:empresa?.logo_url||'',client:c?.nome||'Cliente avulso',service:a?.servico||'',professional:a?.profissional||'',date:a?.atendido_em?new Date(a.atendido_em).toLocaleDateString('pt-BR'):'',time:a?.atendido_em?new Date(a.atendido_em).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}):'',value:Number(a?.valor||0),payment:mov?.forma_pagamento||'Não informado'};
  }
  async function buildReceiptPDF(a,c){
    const jsPDF=await loadJsPDF(),d=receiptData(a,c),width=80,height=180;
    const doc=new jsPDF({orientation:'portrait',unit:'mm',format:[width,height]});let y=7;
    const center=(text,size=9,bold=false)=>{doc.setFont('helvetica',bold?'bold':'normal');doc.setFontSize(size);const lines=doc.splitTextToSize(String(text||''),width-10);doc.text(lines,width/2,y,{align:'center'});y+=lines.length*(size*.48)+2;};
    const line=()=>{doc.setLineWidth(.25);doc.line(5,y,width-5,y);y+=4;};
    const row=(label,value,bold=false)=>{doc.setFont('helvetica',bold?'bold':'normal');doc.setFontSize(8.5);doc.text(`${label}:`,5,y);const lines=doc.splitTextToSize(String(value||'-'),width-28);doc.text(lines,23,y);y+=Math.max(4.5,lines.length*4);};
    if(d.logo){try{doc.addImage(d.logo,'JPEG',width/2-10,y,20,20,undefined,'FAST');y+=23;}catch(e){}}
    center(d.name,12,true);if(d.cnpj)center(`CNPJ: ${d.cnpj}`,8.2);if(d.address)center(d.address,8.2);if(d.whatsapp)center(`WhatsApp: ${d.whatsapp}`,8.2);
    line();center('RECIBO DE PAGAMENTO',10,true);line();row('Cliente',d.client,true);row('Serviço',d.service);if(d.professional)row('Profissional',d.professional);row('Data',d.date);row('Hora',d.time);row('Pagamento',d.payment);
    y+=1;line();doc.setFont('helvetica','bold');doc.setFontSize(11);doc.text('VALOR:',5,y);doc.text(money(d.value),width-5,y,{align:'right'});y+=6;line();center('Obrigado pela preferência!',8.5,true);center('Volte sempre!',8.5);return doc;
  }
  async function shareReceiptPDF(a,c){
    const name=`recibo-${(c?.nome||'cliente').toLowerCase().replace(/[^a-z0-9]+/gi,'-')}.pdf`,blob=await (await buildReceiptPDF(a,c)).output('blob'),file=new File([blob],name,{type:'application/pdf'});
    const text=`Recibo de pagamento - ${empresa?.nome_fantasia||empresa?.nome||'Barbearia'}\nCliente: ${c?.nome||'Cliente avulso'}\nValor: ${money(a?.valor)}\nObrigado pela preferência!`;
    if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[file]}))){await navigator.share({title:'Recibo de pagamento',text,files:[file]});return;}
    const url=URL.createObjectURL(blob),aEl=document.createElement('a');aEl.href=url;aEl.download=name;aEl.click();setTimeout(()=>URL.revokeObjectURL(url),3000);if(c?.telefone)wa(c.telefone,`${text}\n\nO PDF foi baixado. Anexe o arquivo nesta conversa do WhatsApp.`);
  }
  window.makeReceipt=function(id){
    const a=atendimentos.find(x=>x.id===id);if(!a)return;const c=clientes.find(x=>x.id===a.cliente_id),d=receiptData(a,c);
    openModal(`<div class="receipt">${empresa?.logo_url?`<img class="receipt-logo" src="${esc(empresa.logo_url)}" alt="Logo">`:''}<h3>${esc(d.name)}</h3>${d.cnpj?`<div class="center-text muted">CNPJ: ${esc(d.cnpj)}</div>`:''}${d.address?`<div class="center-text muted">${esc(d.address)}</div>`:''}${d.whatsapp?`<div class="center-text muted">${esc(d.whatsapp)}</div>`:''}<hr><p><b>RECIBO DE PAGAMENTO</b></p><hr><p><b>Cliente:</b> ${esc(d.client)}</p><p><b>Serviço:</b> ${esc(d.service)}</p>${d.professional?`<p><b>Profissional:</b> ${esc(d.professional)}</p>`:''}<p><b>Data:</b> ${esc(d.date)} às ${esc(d.time)}</p><p><b>Pagamento:</b> ${esc(d.payment)}</p><p class="receipt-total"><b>VALOR:</b> ${money(d.value)}</p><p class="center-text muted">Obrigado pela preferência! Volte sempre!</p></div><div class="actions receipt-actions"><button id="printReceiptBtn">Imprimir</button><button id="pdfReceiptBtn">Gerar PDF</button>${c?.telefone?`<button id="waReceiptBtn">Enviar PDF pelo WhatsApp</button>`:''}</div><div id="receiptMsg" class="msg"></div>`);
    $('printReceiptBtn')?.addEventListener('click',()=>window.print());
    $('pdfReceiptBtn')?.addEventListener('click',async()=>{try{msg('receiptMsg','Gerando PDF...');const doc=await buildReceiptPDF(a,c);doc.save(`recibo-${(c?.nome||'cliente').replace(/[^a-z0-9]+/gi,'-')}.pdf`);msg('receiptMsg','PDF gerado.');}catch(e){msg('receiptMsg',e.message||'Erro ao gerar PDF.');}});
    $('waReceiptBtn')?.addEventListener('click',async()=>{try{msg('receiptMsg','Preparando PDF para o WhatsApp...');await shareReceiptPDF(a,c);msg('receiptMsg','PDF pronto para envio.');}catch(e){if(e?.name!=='AbortError')msg('receiptMsg',e.message||'Não foi possível compartilhar o PDF.');}});
  };
})();
