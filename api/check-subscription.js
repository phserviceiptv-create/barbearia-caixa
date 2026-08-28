const SUPABASE_URL=process.env.SUPABASE_URL||'https://zjeclsozvjymuzwyhvqj.supabase.co';
const SUPABASE_KEY=process.env.SUPABASE_ANON_KEY||'sb_publishable_WyjaTHvDUwGPCwHaXcdApw_xlssm0TE';
const ASAAS_URL=process.env.ASAAS_API_URL||'https://api.asaas.com/v3';
const h=t=>({'apikey':SUPABASE_KEY,'Authorization':`Bearer ${t}`,'Content-Type':'application/json'});
const body=async r=>{const t=await r.text();try{return JSON.parse(t)}catch{return {message:t}}};
module.exports=async(req,res)=>{
 if(req.method!=='POST')return res.status(405).json({error:'Método não permitido'});
 const token=(req.headers.authorization||'').replace(/^Bearer\s+/i,'');const key=process.env.ASAAS_API_KEY;
 if(!token)return res.status(401).json({error:'Sessão não encontrada.'});
 if(!key)return res.status(503).json({error:'Asaas ainda não configurado.'});
 try{
  const me=await fetch(`${SUPABASE_URL}/auth/v1/user`,{headers:h(token)});if(!me.ok)return res.status(401).json({error:'Sessão inválida.'});
  const id=req.body?.asaas_subscription_id,assinaturaId=req.body?.assinatura_id;if(!id||!assinaturaId)return res.status(400).json({error:'Assinatura incompleta.'});
  const rr=await fetch(`${ASAAS_URL}/subscriptions/${encodeURIComponent(id)}`,{headers:{access_token:key}});const sub=await body(rr);if(!rr.ok)return res.status(502).json({error:sub?.errors?.[0]?.description||sub?.message||'Não foi possível consultar o Asaas.'});
  const pr=await fetch(`${ASAAS_URL}/subscriptions/${encodeURIComponent(id)}/payments`,{headers:{access_token:key}});const pj=await body(pr);const payment=pj?.data?.[0]||null;
  const paymentPaid=['CONFIRMED','RECEIVED'].includes(String(payment?.status||'').toUpperCase());
  const subscriptionActive=String(sub.status||'').toUpperCase()==='ACTIVE';
  const status=subscriptionActive&&paymentPaid?'ativa':String(sub.status||'').toUpperCase()==='INACTIVE'?'cancelada':String(sub.status||'').toUpperCase()==='EXPIRED'?'expirada':'pendente';
  const up={status,asaas_status:sub.status||null,asaas_payment_id:payment?.id||null,proxima_cobranca_em:sub.nextDueDate||null,inicio_em:status==='ativa'?(sub.dateCreated||new Date().toISOString()):null,ultima_confirmacao_em:paymentPaid?(payment?.paymentDate||payment?.confirmedDate||new Date().toISOString()):null};
  const ur=await fetch(`${SUPABASE_URL}/rest/v1/assinaturas?id=eq.${encodeURIComponent(assinaturaId)}`,{method:'PATCH',headers:{...h(token),Prefer:'return=representation'},body:JSON.stringify(up)});const uj=await body(ur);if(!ur.ok)return res.status(403).json({error:'Não foi possível atualizar a assinatura.',detail:uj});
  return res.status(200).json({status,assinatura:uj?.[0]||null,payment_status:payment?.status||null});
 }catch(e){return res.status(500).json({error:e.message||'Erro interno.'});}
};
