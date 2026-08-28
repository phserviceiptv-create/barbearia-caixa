const PLANOS={mensal:{label:'Mensal',valor:29.9,cycle:'MONTHLY'},trimestral:{label:'Trimestral',valor:79.9,cycle:'QUARTERLY'},semestral:{label:'Semestral',valor:149.9,cycle:'SEMIANNUALLY'},anual:{label:'Anual',valor:249.9,cycle:'YEARLY'}};
const SUPABASE_URL=process.env.SUPABASE_URL||'https://zjeclsozvjymuzwyhvqj.supabase.co';
const SUPABASE_KEY=process.env.SUPABASE_ANON_KEY||'sb_publishable_WyjaTHvDUwGPCwHaXcdApw_xlssm0TE';
const ASAAS_URL=process.env.ASAAS_API_URL||'https://api.asaas.com/v3';
const h=t=>({apikey:SUPABASE_KEY,Authorization:`Bearer ${t}`,'Content-Type':'application/json'}),ah=k=>({access_token:k,'Content-Type':'application/json'});
const body=async r=>{const t=await r.text();try{return JSON.parse(t)}catch{return{message:t}}};const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const EXPIRATION_MS=5*60*1000;
async function cancelExpired(id,key){if(!id)return;await fetch(`${ASAAS_URL}/subscriptions/${encodeURIComponent(id)}`,{method:'DELETE',headers:ah(key)}).catch(()=>{});}
async function paymentData(subscriptionId,key,billingType){let payment=null,pix=null;for(let i=0;i<8;i++){try{const rr=await fetch(`${ASAAS_URL}/subscriptions/${encodeURIComponent(subscriptionId)}/payments`,{headers:ah(key)}),rj=await body(rr);payment=rj?.data?.[0]||null;if(payment){if(billingType==='PIX'){const qr=await fetch(`${ASAAS_URL}/payments/${encodeURIComponent(payment.id)}/pixQrCode`,{headers:ah(key)}),qj=await body(qr);if(qr.ok&&qj?.payload){pix={payment_id:payment.id,encodedImage:qj.encodedImage||null,payload:qj.payload,expirationDate:qj.expirationDate||null};break;}}else break;}}catch{}if(i<7)await sleep(1000);}return{payment,pix};}
module.exports=async(req,res)=>{
 if(req.method!=='POST')return res.status(405).json({error:'Método não permitido'});
 const token=(req.headers.authorization||'').replace(/^Bearer\s+/i,''),key=process.env.ASAAS_API_KEY;if(!token)return res.status(401).json({error:'Sessão não encontrada.'});if(!key)return res.status(503).json({error:'Asaas não configurado.'});
 try{
  const me=await fetch(`${SUPABASE_URL}/auth/v1/user`,{headers:h(token)});if(!me.ok)return res.status(401).json({error:'Sessão inválida.'});
  const user=await body(me),plan=PLANOS[req.body?.plan],billingType=req.body?.billingType;if(!plan)return res.status(400).json({error:'Plano inválido.'});if(!['PIX','CREDIT_CARD'].includes(billingType))return res.status(400).json({error:'Escolha PIX ou cartão de crédito.'});
  const pr=await fetch(`${SUPABASE_URL}/rest/v1/perfis?id=eq.${encodeURIComponent(user.id)}&select=empresa_id`,{headers:h(token)}),ps=await body(pr),empresaId=ps?.[0]?.empresa_id;if(!empresaId)return res.status(400).json({error:'Cadastre sua barbearia antes de contratar o PRO.'});
  const lr=await fetch(`${SUPABASE_URL}/rest/v1/assinaturas?empresa_id=eq.${encodeURIComponent(empresaId)}&usuario_id=eq.${encodeURIComponent(user.id)}&status=eq.pendente&select=*&order=created_at.desc&limit=1`,{headers:h(token)}),lp=await body(lr),pending=lp?.[0];
  if(pending?.asaas_subscription_id){
   const created=new Date(pending.created_at||0).getTime();
   if(created && Date.now()-created>=EXPIRATION_MS){await cancelExpired(pending.asaas_subscription_id,key);await fetch(`${SUPABASE_URL}/rest/v1/assinaturas?id=eq.${encodeURIComponent(pending.id)}`,{method:'PATCH',headers:{...h(token),Prefer:'return=minimal'},body:JSON.stringify({status:'expirada',asaas_status:'EXPIRED'})}).catch(()=>{});}
   else{
    const sr0=await fetch(`${ASAAS_URL}/subscriptions/${encodeURIComponent(pending.asaas_subscription_id)}`,{headers:ah(key)}),sj0=await body(sr0);
    if(sr0.ok&&String(sj0.status||'').toUpperCase()==='ACTIVE'){
     const existingType=String(sj0.billingType||'').toUpperCase();
     if(existingType===billingType){const {payment,pix}=await paymentData(pending.asaas_subscription_id,key,billingType);if(payment?.id&&payment.id!==pending.asaas_payment_id)await fetch(`${SUPABASE_URL}/rest/v1/assinaturas?id=eq.${encodeURIComponent(pending.id)}`,{method:'PATCH',headers:{...h(token),Prefer:'return=minimal'},body:JSON.stringify({asaas_payment_id:payment.id,asaas_status:sj0.status})}).catch(()=>{});return res.status(200).json({checkout_url:payment?.invoiceUrl||null,pix,pix_pending:billingType==='PIX'&&!pix,pagamento:billingType,asaas_subscription_id:pending.asaas_subscription_id,assinatura:{...pending,asaas_payment_id:payment?.id||pending.asaas_payment_id},reused:true,expires_at:new Date(created+EXPIRATION_MS).toISOString()});}
     await cancelExpired(pending.asaas_subscription_id,key);await fetch(`${SUPABASE_URL}/rest/v1/assinaturas?id=eq.${encodeURIComponent(pending.id)}`,{method:'PATCH',headers:{...h(token),Prefer:'return=minimal'},body:JSON.stringify({status:'cancelada',asaas_status:'DELETED'})}).catch(()=>{});
    }
   }
  }
  const er=await fetch(`${SUPABASE_URL}/rest/v1/empresas?id=eq.${encodeURIComponent(empresaId)}&select=nome,nome_fantasia,whatsapp,telefone,email,cnpj`,{headers:h(token)}),es=await body(er),e=es?.[0]||{},doc=String(e.cnpj||'').replace(/\D/g,'');if(!/^(\d{11}|\d{14})$/.test(doc))return res.status(400).json({error:'Cadastre um CPF ou CNPJ válido nos dados da barbearia.'});
  const cr=await fetch(`${ASAAS_URL}/customers`,{method:'POST',headers:ah(key),body:JSON.stringify({name:e.nome_fantasia||e.nome||user.email,email:e.email||user.email,phone:e.telefone||e.whatsapp||undefined,cpfCnpj:doc,externalReference:empresaId})}),cj=await body(cr);if(!cr.ok)return res.status(502).json({error:cj?.errors?.[0]?.description||cj?.message||'Erro ao cadastrar cliente no Asaas.'});
  const sr=await fetch(`${ASAAS_URL}/subscriptions`,{method:'POST',headers:ah(key),body:JSON.stringify({customer:cj.id,billingType,value:plan.valor,nextDueDate:new Date().toISOString().slice(0,10),cycle:plan.cycle,description:`Barbearia Caixa PRO - ${plan.label}`,externalReference:`${empresaId}:${user.id}:${req.body.plan}`})}),sj=await body(sr);if(!sr.ok)return res.status(502).json({error:sj?.errors?.[0]?.description||sj?.message||'Erro ao criar assinatura no Asaas.'});
  const expiresAt=new Date(Date.now()+EXPIRATION_MS).toISOString();const ir=await fetch(`${SUPABASE_URL}/rest/v1/assinaturas`,{method:'POST',headers:{...h(token),Prefer:'return=representation'},body:JSON.stringify({empresa_id:empresaId,usuario_id:user.id,plano:req.body.plan,valor:plan.valor,status:'pendente',asaas_customer_id:cj.id,asaas_subscription_id:sj.id,asaas_status:sj.status||'ACTIVE'})}),ij=await body(ir);if(!ir.ok){await cancelExpired(sj.id,key);return res.status(502).json({error:'Assinatura criada no Asaas, mas não foi registrada no aplicativo.'});}
  const {payment,pix}=await paymentData(sj.id,key,billingType);if(payment?.id&&ij?.[0]?.id)await fetch(`${SUPABASE_URL}/rest/v1/assinaturas?id=eq.${encodeURIComponent(ij[0].id)}`,{method:'PATCH',headers:{...h(token),Prefer:'return=minimal'},body:JSON.stringify({asaas_payment_id:payment.id})}).catch(()=>{});
  return res.status(200).json({checkout_url:payment?.invoiceUrl||null,pix,pix_pending:billingType==='PIX'&&!pix,pagamento:billingType,asaas_subscription_id:sj.id,assinatura:{...(ij?.[0]||{}),asaas_payment_id:payment?.id||null},expires_at:expiresAt});
 }catch(e){return res.status(500).json({error:e.message||'Erro interno.'})}
};
