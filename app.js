const SUPABASE_URL = "https://zjeclsozvjymuzwyhvqj.supabase.co";
const SUPABASE_KEY = "sb_publishable_WyjaTHvDUwGPCwHaXcdApw_xlssm0TE";
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let user=null, empresa=null, perfil=null, clientes=[], atendimentos=[], movimentacoes=[];

const $=id=>document.getElementById(id);
const money=v=>Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
const phone=s=>String(s||"").replace(/\D/g,"");

function show(view){["authView","setupView","appView"].forEach(x=>$(x).classList.add("hidden"));$(view).classList.remove("hidden")}
function msg(id,t){$(id).textContent=t||""}

async function init(){
  const {data:{session}}=await sb.auth.getSession();
  if(!session){show("authView");return}
  user=session.user; await loadProfile();
}
sb.auth.onAuthStateChange(async (_e,s)=>{if(s){user=s.user;await loadProfile()}else{user=null;show("authView")}});

async function loadProfile(){
  const {data:p}=await sb.from("perfis").select("*").eq("id",user.id).maybeSingle();
  perfil=p;
  if(!p){show("setupView");return}
  const {data:e}=await sb.from("empresas").select("*").eq("id",p.empresa_id).single();
  empresa=e; $("appTitle").textContent=e?.nome_fantasia||e?.nome||"Barbearia Caixa";
  show("appView"); await refresh();
}
async function createSetup(){
  msg("setupMsg","");
  const nome=$("empresaNome").value.trim();
  if(!nome){msg("setupMsg","Informe o nome da barbearia.");return}
  const {data:e,error:ee}=await sb.from("empresas").insert({nome,nome_fantasia:nome,telefone:$("empresaTelefone").value.trim(),owner_id:user.id}).select().single();
  if(ee){msg("setupMsg",ee.message);return}
  const {error:pe}=await sb.from("perfis").insert({id:user.id,empresa_id:e.id,nome:user.email?.split("@")[0]||"Administrador",papel:"admin"});
  if(pe){msg("setupMsg",pe.message);return}
  await loadProfile();
}
async function refresh(){await Promise.all([loadClients(),loadMovs(),loadAtendimentos()]);renderAll()}
async function loadClients(){const r=await sb.from("clientes").select("*").eq("empresa_id",empresa.id).order("nome");clientes=r.data||[]}
async function loadMovs(){const r=await sb.from("barbearia_movimentacoes").select("*").eq("empresa_id",empresa.id).order("data_movimento",{ascending:false}).limit(100);movimentacoes=r.data||[]}
async function loadAtendimentos(){const r=await sb.from("barbearia_atendimentos").select("*").eq("empresa_id",empresa.id).order("atendido_em",{ascending:false}).limit(100);atendimentos=r.data||[]}

function renderAll(){renderMovs();renderClients();fillClientSelect();renderHistory()}
function renderMovs(){
  const ent=movimentacoes.filter(x=>x.tipo==="entrada").reduce((a,x)=>a+Number(x.valor),0);
  const sai=movimentacoes.filter(x=>x.tipo==="saida").reduce((a,x)=>a+Number(x.valor),0);
  $("totalEntradas").textContent=money(ent);$("totalSaidas").textContent=money(sai);$("saldo").textContent=money(ent-sai);
  $("movList").innerHTML=movimentacoes.length?movimentacoes.map(x=>`<div class="row"><div><b>${esc(x.descricao)}</b><div class="muted">${new Date(x.data_movimento).toLocaleString("pt-BR")} · ${esc(x.forma_pagamento||"")}</div></div><strong class="${x.tipo==="entrada"?"positive":"negative"}">${x.tipo==="entrada"?"+":"-"} ${money(x.valor)}</strong></div>`).join(""):`<div class="empty">Nenhuma movimentação ainda.</div>`;
}
function renderClients(){
  const q=($("clienteBusca").value||"").toLowerCase();
  const arr=clientes.filter(c=>(c.nome+" "+(c.telefone||"")).toLowerCase().includes(q));
  $("clientesList").innerHTML=arr.length?arr.map(c=>`<div class="card client-card"><div><b>${esc(c.nome)}</b><div class="muted">${esc(c.telefone||"Sem WhatsApp")}</div></div><div class="actions"><button onclick="editClient('${c.id}')">Editar</button>${c.telefone?`<button onclick="wa('${phone(c.telefone)}','Olá ${esc(c.nome)}, tudo bem?')">WhatsApp</button>`:""}</div></div>`).join(""):`<div class="empty">Nenhum cliente encontrado.</div>`;
}
function fillClientSelect(){ $("atCliente").innerHTML=`<option value="">Cliente não informado</option>`+clientes.map(c=>`<option value="${c.id}">${esc(c.nome)}${c.telefone?" — "+esc(c.telefone):""}</option>`).join("")}
function renderHistory(){
  $("histList").innerHTML=atendimentos.length?atendimentos.map(a=>{const c=clientes.find(x=>x.id===a.cliente_id);return `<div class="card row" style="padding:17px;margin-bottom:10px"><div><b>${esc(a.servico)}</b><div class="muted">${esc(c?.nome||"Cliente avulso")} · ${new Date(a.atendido_em).toLocaleString("pt-BR")}</div><div class="muted">${esc(a.profissional||"")} ${a.observacoes?"· "+esc(a.observacoes):""}</div></div><div style="text-align:right"><strong>${money(a.valor)}</strong><br><button onclick="makeReceipt('${a.id}')">Recibo</button></div></div>`}).join(""):`<div class="empty">Nenhum atendimento registrado.</div>`;
}

function openModal(html){$("modalContent").innerHTML=html;$("modal").classList.remove("hidden")}
$("closeModal").onclick=()=>$("modal").classList.add("hidden");
$("modal").onclick=e=>{if(e.target.id==="modal")$("modal").classList.add("hidden")};

$("loginBtn").onclick=async()=>{msg("authMsg","");const {error}=await sb.auth.signInWithPassword({email:$("email").value.trim(),password:$("password").value});if(error)msg("authMsg",error.message)};
$("signupBtn").onclick=async()=>{msg("authMsg","");const email=$("email").value.trim(),password=$("password").value;if(password.length<6){msg("authMsg","A senha precisa ter pelo menos 6 caracteres.");return}const {error}=await sb.auth.signUp({email,password});if(error)msg("authMsg",error.message);else msg("authMsg","Acesso criado. Se o Supabase pedir confirmação de e-mail, confirme e entre novamente.")};
$("logoutBtn").onclick=()=>sb.auth.signOut();
$("setupBtn").onclick=createSetup;

document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>{document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));document.querySelectorAll(".panel").forEach(x=>x.classList.remove("active"));b.classList.add("active");$(b.dataset.tab).classList.add("active")});
$("clienteBusca").oninput=renderClients;

$("novoClienteBtn").onclick=()=>openModal(`<h2>Novo cliente</h2><input id="mNome" placeholder="Nome"><input id="mTel" placeholder="WhatsApp"><input id="mObs" placeholder="Observações"><button onclick="saveClient()">Salvar cliente</button><div id="mMsg" class="msg"></div>`);
window.saveClient=async()=>{const nome=$("mNome").value.trim();if(!nome){$("mMsg").textContent="Informe o nome.";return}const {error}=await sb.from("clientes").insert({empresa_id:empresa.id,nome,telefone:$("mTel").value.trim(),observacoes:$("mObs").value.trim()});if(error){$("mMsg").textContent=error.message;return}$("modal").classList.add("hidden");await refresh()};
window.editClient=async id=>{const c=clientes.find(x=>x.id===id);openModal(`<h2>Editar cliente</h2><input id="mNome" value="${esc(c.nome)}"><input id="mTel" value="${esc(c.telefone||"")}"><input id="mObs" value="${esc(c.observacoes||"")}"><button onclick="updateClient('${id}')">Salvar</button><div id="mMsg" class="msg"></div>`)};
window.updateClient=async id=>{const {error}=await sb.from("clientes").update({nome:$("mNome").value.trim(),telefone:$("mTel").value.trim(),observacoes:$("mObs").value.trim()}).eq("id",id);if(error){$("mMsg").textContent=error.message;return}$("modal").classList.add("hidden");await refresh()};

$("novaMovBtn").onclick=()=>openModal(`<h2>Movimentação</h2><select id="mTipo"><option value="entrada">Entrada</option><option value="saida">Saída</option></select><input id="mDesc" placeholder="Descrição"><input id="mValor" type="number" min="0" step="0.01" placeholder="Valor"><select id="mPag"><option>Pix</option><option>Dinheiro</option><option>Cartão</option><option>Outro</option></select><button onclick="saveMov()">Salvar</button><div id="mMsg" class="msg"></div>`);
window.saveMov=async()=>{const v=Number($("mValor").value);if(!$("mDesc").value.trim()||v<=0){$("mMsg").textContent="Preencha descrição e valor.";return}const {error}=await sb.from("barbearia_movimentacoes").insert({empresa_id:empresa.id,tipo:$("mTipo").value,descricao:$("mDesc").value.trim(),valor:v,forma_pagamento:$("mPag").value,created_by:user.id});if(error){$("mMsg").textContent=error.message;return}$("modal").classList.add("hidden");await refresh()};

$("registrarAtBtn").onclick=async()=>{msg("atMsg","");const clienteId=$("atCliente").value||null,serv=$("atServico").value.trim(),v=Number($("atValor").value);if(!serv||v<0){msg("atMsg","Informe o serviço e o valor.");return}const {data:a,error:ae}=await sb.from("barbearia_atendimentos").insert({empresa_id:empresa.id,cliente_id:clienteId,servico:serv,profissional:$("atProfissional").value.trim(),valor:v,observacoes:$("atObs").value.trim(),created_by:user.id}).select().single();if(ae){msg("atMsg",ae.message);return}const {data:r,error:re}=await sb.from("barbearia_recibos").insert({empresa_id:empresa.id,atendimento_id:a.id,created_by:user.id}).select().single();if(re){msg("atMsg",re.message);return}const {error:me}=await sb.from("barbearia_movimentacoes").insert({empresa_id:empresa.id,cliente_id:clienteId,atendimento_id:a.id,tipo:"entrada",categoria:"atendimento",descricao:serv,valor:v,forma_pagamento:$("atPagamento").value,created_by:user.id});if(me){msg("atMsg",me.message);return}await refresh();makeReceipt(a.id);$("atServico").value="";$("atValor").value="";$("atObs").value=""};

window.makeReceipt=async atId=>{const a=atendimentos.find(x=>x.id===atId);if(!a)return;let {data:r}=await sb.from("barbearia_recibos").select("*").eq("atendimento_id",atId).maybeSingle();if(!r){const z=await sb.from("barbearia_recibos").insert({empresa_id:empresa.id,atendimento_id:atId,created_by:user.id}).select().single();r=z.data}const c=clientes.find(x=>x.id===a.cliente_id);const date=new Date(a.atendido_em).toLocaleString("pt-BR");const text=`*${empresa.nome_fantasia||empresa.nome}*%0A🧾 *Recibo #${r.numero}*%0A%0ACliente: ${c?.nome||"Cliente"}%0AServiço: ${a.servico}%0AValor: ${money(a.valor)}%0AData: ${date}%0A%0AObrigado pela preferência!`;openModal(`<div class="receipt"><h3>${esc(empresa.nome_fantasia||empresa.nome)}</h3><p><b>Recibo #${r.numero}</b></p><p>Cliente: ${esc(c?.nome||"Cliente")}</p><p>Serviço: ${esc(a.servico)}</p><p>Valor: <b>${money(a.valor)}</b></p><p>${date}</p></div><div class="actions" style="margin-top:15px">${c?.telefone?`<button onclick="sendReceipt('${phone(c.telefone)}','${text}')">📲 Enviar pelo WhatsApp</button>`:""}<button class="secondary" onclick="window.print()">🖨️ Imprimir</button></div>`);};
window.sendReceipt=async(ph,text)=>{await sb.from("barbearia_recibos").update({enviado_whatsapp_em:new Date().toISOString()}).eq("id",document.querySelector(".receipt")?document.querySelector(".receipt").dataset?.id||"00000000-0000-0000-0000-000000000000":"00000000-0000-0000-0000-000000000000");window.open(`https://wa.me/${ph}?text=${text}`,"_blank")};
window.wa=(ph,text)=>window.open(`https://wa.me/${ph}?text=${encodeURIComponent(text)}`,"_blank");

init();
