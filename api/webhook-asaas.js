const SUPABASE_URL=process.env.SUPABASE_URL||'https://zjeclsozvjymuzwyhvqj.supabase.co';
const KEY=process.env.SUPABASE_SERVICE_ROLE_KEY;const WEBHOOK_TOKEN=process.env.ASAAS_WEBHOOK_TOKEN;
const h=()=>({'apikey':KEY,'Authorization':`Bearer ${KEY}`,'Content-Type':'application/json'});
module.exports=async(req,res)=>{
 if(req.method!=='POST')return res.status(405).end();
 if(WEBHOOK_TOKEN && req.headers['asaas-access-token']!==WEBHOOK_TOKEN)return res.status(401).end();
 try{
  const p=req.body||{};const eventId=p.id,event=p.event,pay=p.payment||{};if(!eventId)return res.status(200).end();
  const ir=await fetch(`${SUPABASE_URL}/rest/v1/asaas_webhook_events`,{method:'POST',headers:{...h(),Prefer:'return=minimal'},body:JSON.stringify({event_id:eventId,event_type:event,subscription_id:pay.subscription||p.subscription?.id||null,payment_id:pay.id||null,payload:p})});
  if(ir.status===409)return res.status(200).end();
  if(!ir.ok)return res.status(500).end();
  const subscriptionId=pay.subscription||p.subscription?.id||null;if(!subscriptionId)return res.status(200).end();
  const paid=['PAYMENT_RECEIVED','PAYMENT_CONFIRMED','PAYMENT_OVERDUE'].includes(event);const active=['PAYMENT_RECEIVED','PAYMENT_CONFIRMED'].includes(event);const status=active?'ativa':event==='PAYMENT_OVERDUE'?'pendente':null;
  const q={};if(status)q.status=status;q.asaas_status=pay.status||null;q.asaas_payment_id=pay.id||null;if(active)q.ultima_confirmacao_em=new Date().toISOString();
  if(event==='PAYMENT_OVERDUE')q.ultima_confirmacao_em=null;
  if(Object.keys(q).length)await fetch(`${SUPABASE_URL}/rest/v1/assinaturas?asaas_subscription_id=eq.${encodeURIComponent(subscriptionId)}`,{method:'PATCH',headers:{...h(),Prefer:'return=minimal'},body:JSON.stringify(q)});
  if(['SUBSCRIPTION_INACTIVATED','SUBSCRIPTION_DELETED'].includes(event))await fetch(`${SUPABASE_URL}/rest/v1/assinaturas?asaas_subscription_id=eq.${encodeURIComponent(subscriptionId)}`,{method:'PATCH',headers:{...h(),Prefer:'return=minimal'},body:JSON.stringify({status:'cancelada',asaas_status:'INACTIVE'})});
  return res.status(200).end();
 }catch(e){return res.status(500).end();}
};
