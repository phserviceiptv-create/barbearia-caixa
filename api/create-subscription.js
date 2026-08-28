const PLANOS={mensal:{label:'Mensal',valor:29.90,cycle:'MONTHLY'},trimestral:{label:'Trimestral',valor:79.90,cycle:'QUARTERLY'},semestral:{label:'Semestral',valor:149.90,cycle:'SEMIANNUALLY'},anual:{label:'Anual',valor:249.90,cycle:'YEARLY'}};
const SUPABASE_URL=process.env.SUPABASE_URL||'https://zjeclsozvjymuzwyhvqj.supabase.co';
const SUPABASE_KEY=process.env.SUPABASE_ANON_KEY||'sb_publishable_WyjaTHvDUwGPCwHaXcdApw_xlssm0TE';
const ASAAS_URL=process.env.ASAAS_API_URL||'https://api.asaas.com/v3';
const h=t=>({'apikey':SUPABASE_KEY,'Authorization':`Bearer ${t}`,'Content-Type':'application/json'});
const ah=k=>({'access_token':k,'Content-Type':'application/json'});
const body=async r=>{const t=await r.text();try{return JSON.parse(t)}catch{return {message:t}}};
module.exports=async(req,res)=>{
 if(req.method!=='POST')return res.status(405).json({error:'Método não permitido'});
 const token=(req.headers.authorization||'').replace(/^Bearer\s+/i,'');
 const key=process.env.ASAAS_API_KEY;
 if(!token)return res.status(401).json({error:'Sessão não encontrada.'});
 if(!key)return res.status(503).json({error:'Asaas ainda não configurado: falta ASAAS_API_KEY.'});
 try{
  const me=await fetch(`${SUPABASE_URL}/auth/v1/user`,{headers:h(token)});
  if(!me.ok)return res.status(401).json({error:'Sessão inválida.'});
  const user=await body(me);
  const plan=PLANOS[req.body?.plan];
  if(!plan)return res.status(400).json({error:'Plano inválido.'});
  const billingType=req.body?.billingType;
  if(!['PIX','CREDIT_CARD'].includes(billingType))return res.status(400).json({error:'Forma de pagamento inválida. Escolha PIX ou cartão de crédito.'});

  const pr=await fetch(`${SUPABASE_URL}/rest/v1/perfis?id=eq.${encodeURIComponent(user.id)}&select=empresa_id`,{headers:h(token)});
  const ps=await body(pr);
  const empresaId=ps?.[0]?.empresa_id;
  if(!empresaId)return res.status(400).json({error:'Cadastre sua barbearia antes de contratar o PRO.'});

  const er=await fetch(`${SUPABASE_URL}/rest/v1/empresas?id=eq.${encodeURIComponent(empresaId)}&select=nome,nome_fantasia,whatsapp,telefone,email,cnpj`,{headers:h(token)});
  const es=await body(er);const e=es?.[0]||{};
  const documento=String(e.cnpj||'').replace(/\D/g,'');
  if(!/^(\d{11}|\d{14})$/.test(documento))return res.status(400).json({error:'Cadastre um CPF ou CNPJ válido nos dados da barbearia antes de contratar o PRO.'});

  const cr=await fetch(`${ASAAS_URL}/customers`,{method:'POST',headers:ah(key),body:JSON.stringify({name:e.nome_fantasia||e.nome||user.email,email:e.email||user.email,phone:e.telefone||e.whatsapp||undefined,cpfCnpj:documento,externalReference:empresaId})});
  const cj=await body(cr);
  if(!cr.ok)return res.status(502).json({error:cj?.errors?.[0]?.description||cj?.message||'Erro ao cadastrar cliente no Asaas.'});

  const base=`https://${req.headers.host}`;
  const sr=await fetch(`${ASAAS_URL}/subscriptions`,{method:'POST',headers:ah(key),body:JSON.stringify({customer:cj.id,billingType,value:plan.valor,nextDueDate:new Date().toISOString().slice(0,10),cycle:plan.cycle,description:`Barbearia Caixa PRO - ${plan.label}`,externalReference:`${empresaId}:${user.id}:${req.body.plan}`,callback:{successUrl:`${base}/?modo=pago&pagamento=retorno`,autoRedirect:true}})});
  const sj=await body(sr);
  if(!sr.ok)return res.status(502).json({error:sj?.errors?.[0]?.description||sj?.message||'Erro ao criar assinatura no Asaas.'});

  const row={empresa_id:empresaId,usuario_id:user.id,plano:req.body.plan,valor:plan.valor,status:'pendente',asaas_customer_id:cj.id,asaas_subscription_id:sj.id,asaas_status:sj.status||'ACTIVE'};
  const ir=await fetch(`${SUPABASE_URL}/rest/v1/assinaturas`,{method:'POST',headers:{...h(token),Prefer:'return=representation'},body:JSON.stringify(row)});
  const ij=await body(ir);
  if(!ir.ok)return res.status(502).json({error:'Assinatura criada no Asaas, mas não foi registrada no aplicativo.',detail:ij});

  // Não bloqueia a resposta esperando o QR Code. O Asaas pode levar alguns segundos
  // para gerar a primeira cobrança de uma assinatura PIX. O frontend consulta
  // /api/subscription-pix até o QR Code estar disponível.
  let invoiceUrl=sj.invoiceUrl||null;
  try{
   const rr=await fetch(`${ASAAS_URL}/subscriptions/${encodeURIComponent(sj.id)}/payments`,{headers:ah(key)});
   const rj=await body(rr);const payment=rj?.data?.[0]||null;
   invoiceUrl=invoiceUrl||payment?.invoiceUrl||null;
  }catch{}

  return res.status(200).json({
   checkout_url:invoiceUrl,
   pix:null,
   pix_pending:billingType==='PIX',
   pagamento:billingType,
   asaas_subscription_id:sj.id,
   assinatura:ij?.[0]||null
  });
 }catch(e){return res.status(500).json({error:e.message||'Erro interno.'});}
};
