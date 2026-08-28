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
 const subscriptionId=req.body?.asaas_subscription_id;
 const assinaturaId=req.body?.assinatura_id;
 if(!token)return res.status(401).json({error:'Sessão não encontrada.'});
 if(!key)return res.status(503).json({error:'Asaas ainda não configurado.'});
 if(!subscriptionId||!assinaturaId)return res.status(400).json({error:'Assinatura incompleta.'});
 try{
  const me=await fetch(`${SUPABASE_URL}/auth/v1/user`,{headers:h(token)});
  if(!me.ok)return res.status(401).json({error:'Sessão inválida.'});
  const user=await body(me);

  const ar=await fetch(`${SUPABASE_URL}/rest/v1/assinaturas?id=eq.${encodeURIComponent(assinaturaId)}&usuario_id=eq.${encodeURIComponent(user.id)}&asaas_subscription_id=eq.${encodeURIComponent(subscriptionId)}&select=id,empresa_id,usuario_id,plano,valor,status,asaas_subscription_id`,{headers:h(token)});
  const assinaturas=await body(ar);
  const assinatura=assinaturas?.[0];
  if(!ar.ok||!assinatura)return res.status(403).json({error:'Assinatura não encontrada para este usuário.'});

  const pr=await fetch(`${ASAAS_URL}/subscriptions/${encodeURIComponent(subscriptionId)}/payments`,{headers:ah(key)});
  const pj=await body(pr);
  if(!pr.ok)return res.status(502).json({error:pj?.errors?.[0]?.description||pj?.message||'Não foi possível consultar a cobrança PIX.'});
  const payment=pj?.data?.[0]||null;
  if(!payment)return res.status(200).json({ready:false,pix:null,checkout_url:null});

  const qr=await fetch(`${ASAAS_URL}/payments/${encodeURIComponent(payment.id)}/pixQrCode`,{headers:ah(key)});
  const qj=await body(qr);
  if(qr.ok&&qj?.payload){
   return res.status(200).json({ready:true,pix:{payment_id:payment.id,encodedImage:qj.encodedImage||null,payload:qj.payload,expirationDate:qj.expirationDate||null},checkout_url:payment.invoiceUrl||null,payment_status:payment.status||'PENDING'});
  }

  return res.status(200).json({ready:false,pix:null,checkout_url:payment.invoiceUrl||null,payment_status:payment.status||'PENDING'});
 }catch(e){return res.status(500).json({error:e.message||'Erro interno.'});}
};
