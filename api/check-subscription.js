const SUPABASE_URL=process.env.SUPABASE_URL||'https://zjeclsozvjymuzwyhvqj.supabase.co';
const SUPABASE_KEY=process.env.SUPABASE_ANON_KEY||'sb_publishable_WyjaTHvDUwGPCwHaXcdApw_xlssm0TE';
function h(token){return {'apikey':SUPABASE_KEY,'Authorization':`Bearer ${token}`,'Content-Type':'application/json'};}
module.exports=async(req,res)=>{
 if(req.method!=='POST')return res.status(405).json({error:'Método não permitido'});
 const token=(req.headers.authorization||'').replace(/^Bearer\s+/i,'');const mp=process.env.MP_ACCESS_TOKEN;
 if(!token)return res.status(401).json({error:'Sessão não encontrada.'});if(!mp)return res.status(503).json({error:'Pagamento ainda não configurado.'});
 try{
  const id=req.body?.mp_preapproval_id;const assinaturaId=req.body?.assinatura_id;if(!id||!assinaturaId)return res.status(400).json({error:'Assinatura incompleta.'});
  const me=await fetch(`${SUPABASE_URL}/auth/v1/user`,{headers:h(token)});if(!me.ok)return res.status(401).json({error:'Sessão inválida.'});
  const mr=await fetch(`https://api.mercadopago.com/preapproval/${encodeURIComponent(id)}`,{headers:{Authorization:`Bearer ${mp}`,'Content-Type':'application/json'}});const sub=await mr.json();if(!mr.ok)return res.status(502).json({error:sub?.message||'Não foi possível consultar o Mercado Pago.'});
  const map={authorized:'ativa',pending:'pendente',paused:'pausada',canceled:'cancelada'};const status=map[sub.status]||'pendente';
  const body={status,mp_status:sub.status,proxima_cobranca_em:sub.next_payment_date||null,inicio_em:sub.auto_recurring?.start_date||null,expira_em:sub.auto_recurring?.end_date||null,ultima_confirmacao_em:status==='ativa'?new Date().toISOString():null};
  const ur=await fetch(`${SUPABASE_URL}/rest/v1/assinaturas?id=eq.${encodeURIComponent(assinaturaId)}`,{method:'PATCH',headers:{...h(token),Prefer:'return=representation'},body:JSON.stringify(body)});const uj=await ur.json();if(!ur.ok)return res.status(403).json({error:'Não foi possível atualizar a assinatura.',detail:uj});
  return res.status(200).json({status,assinatura:uj?.[0]||null});
 }catch(e){return res.status(500).json({error:e.message||'Erro interno.'});}
};
