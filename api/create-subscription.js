const PLANOS={
  mensal:{label:'Mensal',valor:29.90,frequency:1},
  trimestral:{label:'Trimestral',valor:79.90,frequency:3},
  semestral:{label:'Semestral',valor:149.90,frequency:6},
  anual:{label:'Anual',valor:249.90,frequency:12}
};
const SUPABASE_URL=process.env.SUPABASE_URL||'https://zjeclsozvjymuzwyhvqj.supabase.co';
const SUPABASE_KEY=process.env.SUPABASE_ANON_KEY||'sb_publishable_WyjaTHvDUwGPCwHaXcdApw_xlssm0TE';
function headers(token){return {'apikey':SUPABASE_KEY,'Authorization':`Bearer ${token}`,'Content-Type':'application/json'};}
module.exports=async(req,res)=>{
 if(req.method!=='POST')return res.status(405).json({error:'Método não permitido'});
 const token=(req.headers.authorization||'').replace(/^Bearer\s+/i,'');
 if(!token)return res.status(401).json({error:'Sessão não encontrada.'});
 const mp=process.env.MP_ACCESS_TOKEN;
 if(!mp)return res.status(503).json({error:'Pagamento ainda não configurado. Falta a credencial segura do Mercado Pago.'});
 try{
  const me=await fetch(`${SUPABASE_URL}/auth/v1/user`,{headers:headers(token)});if(!me.ok)return res.status(401).json({error:'Sessão inválida.'});
  const user=await me.json();const plan=PLANOS[req.body?.plan];if(!plan)return res.status(400).json({error:'Plano inválido.'});
  const pr=await fetch(`${SUPABASE_URL}/rest/v1/perfis?id=eq.${encodeURIComponent(user.id)}&select=empresa_id`,{headers:headers(token)});const profiles=await pr.json();const empresaId=profiles?.[0]?.empresa_id;if(!empresaId)return res.status(400).json({error:'Cadastre sua barbearia antes de contratar o PRO.'});
  const base=`https://${req.headers.host}`;
  const payload={reason:`Barbearia Caixa PRO - ${plan.label}`,external_reference:`${empresaId}:${user.id}:${req.body.plan}`,payer_email:user.email,auto_recurring:{frequency:plan.frequency,frequency_type:'months',transaction_amount:plan.valor,currency_id:'BRL'},back_url:`${base}/?modo=pago`,status:'pending'};
  const mr=await fetch('https://api.mercadopago.com/preapproval',{method:'POST',headers:{Authorization:`Bearer ${mp}`,'Content-Type':'application/json'},body:JSON.stringify(payload)});const mj=await mr.json();if(!mr.ok)return res.status(502).json({error:mj?.message||'Mercado Pago recusou a criação da assinatura.'});
  const row={empresa_id:empresaId,usuario_id:user.id,plano:req.body.plan,valor:plan.valor,status:'pendente',mp_preapproval_id:mj.id,mp_status:mj.status,proxima_cobranca_em:mj.next_payment_date||null};
  const ir=await fetch(`${SUPABASE_URL}/rest/v1/assinaturas`,{method:'POST',headers:{...headers(token),Prefer:'return=representation'},body:JSON.stringify(row)});const ij=await ir.json();if(!ir.ok)return res.status(502).json({error:'Assinatura criada no Mercado Pago, mas não foi possível registrar no aplicativo.',detail:ij});
  return res.status(200).json({checkout_url:mj.init_point,assinatura:ij?.[0]||null});
 }catch(e){return res.status(500).json({error:e.message||'Erro interno.'});}
};
