(function(){
 const $=id=>document.getElementById(id);
 function slugify(s){return String(s||'barbearia').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,45)||'barbearia';}
 async function ensureSlug(){
  if(!window.empresa?.id||!window.sb)return null;
  if(window.empresa.public_slug)return window.empresa.public_slug;
  let base=slugify(window.empresa.nome_fantasia||window.empresa.nome||'barbearia');let slug=base;
  for(let i=0;i<8;i++){
   const r=await sb.from('empresas').select('id').eq('public_slug',slug).neq('id',empresa.id).maybeSingle();
   if(!r.data)break;slug=base+'-'+Math.floor(100+i*17+Math.random()*80);
  }
  const r=await sb.from('empresas').update({public_slug:slug}).eq('id',empresa.id).select().single();
  if(!r.error&&r.data){empresa=r.data;return slug} return null;
 }
 function add(){
  const header=document.querySelector('#appView header');if(!header||$('onlineBookingBtn'))return;
  const b=document.createElement('button');b.id='onlineBookingBtn';b.className='ghost';b.textContent='🔗 Agendamento online';b.style.marginRight='8px';
  const logout=$('logoutBtn');header.insertBefore(b,logout||null);
  b.onclick=async()=>{if(String(empresa?.plano_acesso||'').toLowerCase()!=='pro'&&!(window.assinatura?.status==='ativa')){ $('planTrigger')?.click(); return; }
   const slug=await ensureSlug();if(!slug)return alert('Não foi possível gerar o link agora.');const url=location.origin+'/agendar.html?estabelecimento='+encodeURIComponent(slug);
   const ok=confirm('Link público de agendamento:\n\n'+url+'\n\nOK = abrir página\nCancelar = copiar link');if(ok)window.open(url,'_blank');else navigator.clipboard?.writeText(url);
  };
 }
 function start(){if(window.empresa?.id){add();ensureSlug()}}
 setInterval(start,1000);
})();
