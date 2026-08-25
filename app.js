const SUPABASE_URL = "https://zjeclsozvjymuzwyhvqj.supabase.co";
const SUPABASE_KEY = "sb_publishable_WyjaTHvDUwGPCwHaXcdApw_xlssm0TE";
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let user = null, empresa = null, perfil = null;
let clientes = [], atendimentos = [], movimentacoes = [], servicos = [], horarios = [];

const $ = id => document.getElementById(id);
const money = v => Number(v || 0).toLocaleString("pt-BR", {style:"currency", currency:"BRL"});
const esc = s => String(s ?? "").replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
const phone = s => String(s || "").replace(/\D/g, "");

function show(view) {
  ["authView","setupView","appView"].forEach(x => $(x).classList.add("hidden"));
  $(view).classList.remove("hidden");
}
function msg(id, text) { $(id).textContent = text || ""; }
function setBusy(button, busy, text) {
  if (!button) return;
  button.disabled = busy;
  if (busy) button.dataset.oldText = button.textContent;
  button.textContent = busy ? "Salvando..." : (button.dataset.oldText || text || button.textContent);
}
function openModal(html) {
  $("modalContent").innerHTML = html;
  $("modal").classList.remove("hidden");
}
function closeModal() { $("modal").classList.add("hidden"); }
function dateBR(v) { return v ? new Date(v).toLocaleString("pt-BR") : ""; }

async function init() {
  const {data:{session}} = await sb.auth.getSession();
  if (!session) return show("authView");
  user = session.user;
  await loadProfile();
}
sb.auth.onAuthStateChange(async (_event, session) => {
  if (!session) { user = null; show("authView"); return; }
  user = session.user;
  await loadProfile();
});

async function loadProfile() {
  const {data:p, error:pe} = await sb.from("perfis").select("*").eq("id", user.id).maybeSingle();
  if (pe) return show("authView");
  perfil = p;
  if (!p) return show("setupView");

  const {data:e, error:ee} = await sb.from("empresas").select("*").eq("id", p.empresa_id).single();
  if (ee || !e) { show("setupView"); return; }
  empresa = e;
  show("appView");
  fillEmpresaForm();
  renderBrand();
  await refresh();
}

async function createSetup() {
  msg("setupMsg", "");
  const nome = $("empresaNome").value.trim();
  if (!nome) return msg("setupMsg", "Informe o nome da barbearia.");

  const btn = $("setupBtn");
  setBusy(btn, true);
  const payload = {
    nome,
    nome_fantasia: $("empresaFantasia").value.trim() || nome,
    cnpj: $("empresaCnpj").value.trim() || null,
    telefone: $("empresaTelefone").value.trim() || null,
    whatsapp: $("empresaWhatsapp").value.trim() || null,
    email: $("empresaEmail").value.trim() || user.email || null,
    instagram: $("empresaInstagram").value.trim() || null,
    endereco: $("empresaEndereco").value.trim() || null,
    cidade: $("empresaCidade").value.trim() || null,
    estado: $("empresaEstado").value.trim() || null,
    cep: $("empresaCep").value.trim() || null,
    descricao: $("empresaDescricao").value.trim() || null,
    owner_id: user.id
  };
  const {data:e, error:ee} = await sb.from("empresas").insert(payload).select().single();
  if (ee) { setBusy(btn,false); return msg("setupMsg", ee.message); }

  const {error:pe} = await sb.from("perfis").insert({
    id:user.id, empresa_id:e.id,
    nome:user.email?.split("@")[0] || "Administrador",
    papel:"admin"
  });
  if (pe) { setBusy(btn,false); return msg("setupMsg", pe.message); }

  // Cria os 7 dias automaticamente.
  const rows = Array.from({length:7}, (_,dia) => ({
    empresa_id:e.id, dia_semana:dia, aberto: dia > 0 && dia < 6,
    abertura: dia > 0 && dia < 6 ? "08:00" : null,
    fechamento: dia > 0 && dia < 6 ? "18:00" : null,
    intervalo_inicio: dia > 0 && dia < 6 ? "12:00" : null,
    intervalo_fim: dia > 0 && dia < 6 ? "13:00" : null
  }));
  await sb.from("horarios_funcionamento").upsert(rows, {onConflict:"empresa_id,dia_semana"});

  setBusy(btn,false);
  await loadProfile();
}

async function refresh() {
  await Promise.all([loadClients(),loadMovs(),loadAtendimentos(),loadServicos(),loadHorarios()]);
  renderAll();
}

async function loadClients() {
  const r = await sb.from("clientes").select("*").eq("empresa_id",empresa.id).order("nome");
  clientes = r.data || [];
}
async function loadMovs() {
  const r = await sb.from("barbearia_movimentacoes").select("*").eq("empresa_id",empresa.id).order("data_movimento",{ascending:false}).limit(100);
  movimentacoes = r.data || [];
}
async function loadAtendimentos() {
  const r = await sb.from("barbearia_atendimentos").select("*").eq("empresa_id",empresa.id).order("atendido_em",{ascending:false}).limit(100);
  atendimentos = r.data || [];
}
async function loadServicos() {
  const r = await sb.from("servicos_barbearia").select("*").eq("empresa_id",empresa.id).order("nome");
  servicos = r.data || [];
}
async function loadHorarios() {
  const r = await sb.from("horarios_funcionamento").select("*").eq("empresa_id",empresa.id).order("dia_semana");
  horarios = r.data || [];
}

function renderAll() {
  renderMovs(); renderClients(); fillClientSelect(); fillServiceSelect(); renderHistory();
  renderServicos(); renderHorarios(); fillEmpresaForm(); renderBrand();
}

function renderBrand() {
  const name = empresa?.nome_fantasia || empresa?.nome || "Barbearia Caixa";
  $("appTitle").textContent = name;
  if (empresa?.logo_url) {
    $("appLogo").src = empresa.logo_url;
    $("appLogo").classList.remove("hidden");
    $("appScissors").classList.add("hidden");
    $("settingsLogo").src = empresa.logo_url;
    $("settingsLogo").classList.remove("hidden");
  } else {
    $("appLogo").classList.add("hidden");
    $("appScissors").classList.remove("hidden");
    $("settingsLogo").classList.add("hidden");
  }
}

function renderMovs() {
  const ent = movimentacoes.filter(x=>x.tipo==="entrada").reduce((a,x)=>a+Number(x.valor),0);
  const sai = movimentacoes.filter(x=>x.tipo==="saida").reduce((a,x)=>a+Number(x.valor),0);
  $("totalEntradas").textContent = money(ent);
  $("totalSaidas").textContent = money(sai);
  $("saldo").textContent = money(ent-sai);
  $("movList").innerHTML = movimentacoes.length
    ? movimentacoes.map(x=>`<div class="row">
        <div><b>${esc(x.descricao)}</b><div class="muted">${dateBR(x.data_movimento)} · ${esc(x.forma_pagamento||"")}</div></div>
        <strong class="${x.tipo==="entrada"?"positive":"negative"}">${x.tipo==="entrada"?"+":"-"} ${money(x.valor)}</strong>
      </div>`).join("")
    : `<div class="empty">Nenhuma movimentação ainda.</div>`;
}

function renderClients() {
  const q = ($("clienteBusca").value || "").toLowerCase();
  const arr = clientes.filter(c => [c.nome,c.telefone,c.email,c.cpf].join(" ").toLowerCase().includes(q));
  $("clientesList").innerHTML = arr.length ? arr.map(c=>`
    <div class="card client-card">
      <div class="client-main">
        ${c.foto_url ? `<img class="avatar" src="${esc(c.foto_url)}" alt="">` : `<div class="avatar placeholder">👤</div>`}
        <div><b>${esc(c.nome)}</b><div class="muted">${esc(c.telefone||"Sem WhatsApp")} ${c.email?`· ${esc(c.email)}`:""}</div></div>
      </div>
      <div class="actions">
        <button onclick="editClient('${c.id}')">Editar</button>
        ${c.telefone?`<button onclick="wa('${phone(c.telefone)}','Olá ${esc(c.nome)}, tudo bem?')">WhatsApp</button>`:""}
      </div>
    </div>`).join("") : `<div class="empty">Nenhum cliente encontrado.</div>`;
}
function fillClientSelect() {
  $("atCliente").innerHTML = `<option value="">Cliente não informado</option>` +
    clientes.map(c=>`<option value="${c.id}">${esc(c.nome)}${c.telefone?" — "+esc(c.telefone):""}</option>`).join("");
}
function fillServiceSelect() {
  $("atServicoSelect").innerHTML = `<option value="">Selecionar serviço cadastrado...</option>` +
    servicos.filter(s=>s.ativo).map(s=>`<option value="${s.id}" data-nome="${esc(s.nome)}" data-valor="${Number(s.valor)}">${esc(s.nome)} — ${money(s.valor)}</option>`).join("");
}
function renderHistory() {
  $("histList").innerHTML = atendimentos.length ? atendimentos.map(a=>{
    const c = clientes.find(x=>x.id===a.cliente_id);
    return `<div class="card row card-row">
      <div><b>${esc(a.servico)}</b><div class="muted">${esc(c?.nome||"Cliente avulso")} · ${dateBR(a.atendido_em)}</div>
      <div class="muted">${esc(a.profissional||"")} ${a.observacoes?"· "+esc(a.observacoes):""}</div></div>
      <div class="right"><strong>${money(a.valor)}</strong><br><button onclick="makeReceipt('${a.id}')">Recibo</button></div>
    </div>`;
  }).join("") : `<div class="empty">Nenhum atendimento registrado.</div>`;
}

function fillEmpresaForm() {
  if (!empresa) return;
  const map = {
    cfgNome:"nome",cfgFantasia:"nome_fantasia",cfgCnpj:"cnpj",cfgTelefone:"telefone",
    cfgWhatsapp:"whatsapp",cfgEmail:"email",cfgInstagram:"instagram",cfgEndereco:"endereco",
    cfgCidade:"cidade",cfgEstado:"estado",cfgCep:"cep",cfgDescricao:"descricao"
  };
  Object.entries(map).forEach(([id,key]) => $(id).value = empresa[key] || "");
}

function renderServicos() {
  $("servicosList").innerHTML = servicos.length ? servicos.map(s=>`
    <div class="service-row">
      <div><b>${esc(s.nome)}</b><div class="muted">${money(s.valor)} · ${s.duracao_minutos} min ${s.descricao?`· ${esc(s.descricao)}`:""}</div></div>
      <div class="actions">
        <span class="pill">${s.ativo?"Ativo":"Inativo"}</span>
        <button onclick="toggleService('${s.id}',${!s.ativo})">${s.ativo?"Desativar":"Ativar"}</button>
        <button onclick="deleteService('${s.id}')">Excluir</button>
      </div>
    </div>`).join("") : `<div class="empty">Nenhum serviço cadastrado.</div>`;
}

const dayNames = ["Domingo","Segunda-feira","Terça-feira","Quarta-feira","Quinta-feira","Sexta-feira","Sábado"];
function renderHorarios() {
  $("horariosList").innerHTML = dayNames.map((name,i)=>{
    const h = horarios.find(x=>Number(x.dia_semana)===i) || {aberto:false,abertura:"08:00",fechamento:"18:00",intervalo_inicio:"12:00",intervalo_fim:"13:00"};
    return `<div class="hours-row">
      <label class="day-check"><input type="checkbox" class="h-open" data-day="${i}" ${h.aberto?"checked":""}> <b>${name}</b></label>
      <input type="time" class="h-start" data-day="${i}" value="${h.abertura||""}">
      <input type="time" class="h-end" data-day="${i}" value="${h.fechamento||""}">
      <input type="time" class="h-break-start" data-day="${i}" value="${h.intervalo_inicio||""}">
      <input type="time" class="h-break-end" data-day="${i}" value="${h.intervalo_fim||""}">
    </div>`;
  }).join("");
}

$("closeModal").onclick = closeModal;
$("modal").onclick = e => { if(e.target.id==="modal") closeModal(); };

$("loginBtn").onclick = async () => {
  msg("authMsg","");
  const {error} = await sb.auth.signInWithPassword({email:$("email").value.trim(),password:$("password").value});
  if(error) msg("authMsg",error.message);
};
$("signupBtn").onclick = async () => {
  msg("authMsg","");
  const email=$("email").value.trim(), password=$("password").value;
  if(password.length<6) return msg("authMsg","A senha precisa ter pelo menos 6 caracteres.");
  const {error} = await sb.auth.signUp({email,password});
  if(error) msg("authMsg",error.message);
  else msg("authMsg","Acesso criado. Entre novamente se necessário.");
};
$("logoutBtn").onclick = () => sb.auth.signOut();
$("setupBtn").onclick = createSetup;

document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>{
  document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));
  document.querySelectorAll(".panel").forEach(x=>x.classList.remove("active"));
  b.classList.add("active"); $(b.dataset.tab).classList.add("active");
});
$("clienteBusca").oninput = renderClients;

$("novoClienteBtn").onclick = () => openModal(`
  <h2>Novo cliente</h2>
  <div class="grid2">
    <input id="mNome" placeholder="Nome *">
    <input id="mTel" placeholder="WhatsApp / telefone">
    <input id="mEmail" placeholder="E-mail">
    <input id="mCpf" placeholder="CPF">
    <input id="mNascimento" type="date" placeholder="Data de nascimento">
    <input id="mEndereco" placeholder="Endereço">
  </div>
  <textarea id="mPreferencias" placeholder="Preferências do cliente"></textarea>
  <textarea id="mObs" placeholder="Observações"></textarea>
  <input id="mFoto" type="file" accept="image/*">
  <button onclick="saveClient()">Salvar cliente</button><div id="mMsg" class="msg"></div>
`);
window.saveClient = async () => {
  const nome=$("mNome").value.trim();
  if(!nome) return msg("mMsg","Informe o nome.");
  const {error}=await sb.from("clientes").insert({
    empresa_id:empresa.id,nome,telefone:$("mTel").value.trim()||null,email:$("mEmail").value.trim()||null,
    cpf:$("mCpf").value.trim()||null,data_nascimento:$("mNascimento").value||null,endereco:$("mEndereco").value.trim()||null,
    preferencias:$("mPreferencias").value.trim()||null,observacoes:$("mObs").value.trim()||null
  });
  if(error) return msg("mMsg",error.message);
  closeModal(); await refresh();
};
window.editClient = id => {
  const c=clientes.find(x=>x.id===id);
  openModal(`
    <h2>Editar cliente</h2>
    <div class="grid2">
      <input id="mNome" value="${esc(c.nome)}" placeholder="Nome *">
      <input id="mTel" value="${esc(c.telefone||"")}" placeholder="WhatsApp / telefone">
      <input id="mEmail" value="${esc(c.email||"")}" placeholder="E-mail">
      <input id="mCpf" value="${esc(c.cpf||"")}" placeholder="CPF">
      <input id="mNascimento" type="date" value="${esc(c.data_nascimento||"")}">
      <input id="mEndereco" value="${esc(c.endereco||"")}" placeholder="Endereço">
    </div>
    <textarea id="mPreferencias" placeholder="Preferências">${esc(c.preferencias||"")}</textarea>
    <textarea id="mObs" placeholder="Observações">${esc(c.observacoes||"")}</textarea>
    <button onclick="updateClient('${id}')">Salvar alterações</button><div id="mMsg" class="msg"></div>
  `);
};
window.updateClient = async id => {
  const {error}=await sb.from("clientes").update({
    nome:$("mNome").value.trim(),telefone:$("mTel").value.trim()||null,email:$("mEmail").value.trim()||null,
    cpf:$("mCpf").value.trim()||null,data_nascimento:$("mNascimento").value||null,endereco:$("mEndereco").value.trim()||null,
    preferencias:$("mPreferencias").value.trim()||null,observacoes:$("mObs").value.trim()||null
  }).eq("id",id);
  if(error) return msg("mMsg",error.message);
  closeModal(); await refresh();
};

$("novaMovBtn").onclick=()=>openModal(`
  <h2>Movimentação</h2>
  <select id="mTipo"><option value="entrada">Entrada</option><option value="saida">Saída</option></select>
  <input id="mDesc" placeholder="Descrição">
  <input id="mValor" type="number" min="0" step="0.01" placeholder="Valor">
  <select id="mPag"><option>Pix</option><option>Dinheiro</option><option>Cartão</option><option>Outro</option></select>
  <button onclick="saveMov()">Salvar</button><div id="mMsg" class="msg"></div>
`);
window.saveMov=async()=>{
  const v=Number($("mValor").value);
  if(!$("mDesc").value.trim()||v<=0) return msg("mMsg","Preencha descrição e valor.");
  const {error}=await sb.from("barbearia_movimentacoes").insert({
    empresa_id:empresa.id,tipo:$("mTipo").value,categoria:"manual",descricao:$("mDesc").value.trim(),
    valor:v,forma_pagamento:$("mPag").value,created_by:user.id
  });
  if(error) return msg("mMsg",error.message);
  closeModal(); await refresh();
};

$("atServicoSelect").onchange=()=>{
  const o=$("atServicoSelect").selectedOptions[0];
  if(!o?.value) return;
  $("atServico").value=o.dataset.nome||"";
  $("atValor").value=o.dataset.valor||"";
};

$("registrarAtBtn").onclick=async()=>{
  msg("atMsg","");
  const clienteId=$("atCliente").value||null;
  const serv=$("atServico").value.trim();
  const v=Number($("atValor").value);
  if(!serv||v<0) return msg("atMsg","Informe o serviço e o valor.");
  const btn=$("registrarAtBtn"); setBusy(btn,true);
  const {data:a,error:ae}=await sb.from("barbearia_atendimentos").insert({
    empresa_id:empresa.id,cliente_id:clienteId,servico:serv,profissional:$("atProfissional").value.trim()||null,
    valor:v,observacoes:$("atObs").value.trim()||null,created_by:user.id
  }).select().single();
  if(ae){setBusy(btn,false);return msg("atMsg",ae.message);}
  const {data:r,error:re}=await sb.from("barbearia_recibos").insert({empresa_id:empresa.id,atendimento_id:a.id,created_by:user.id}).select().single();
  if(re){setBusy(btn,false);return msg("atMsg",re.message);}
  const {error:me}=await sb.from("barbearia_movimentacoes").insert({
    empresa_id:empresa.id,cliente_id:clienteId,atendimento_id:a.id,tipo:"entrada",categoria:"atendimento",
    descricao:serv,valor:v,forma_pagamento:$("atPagamento").value,created_by:user.id
  });
  if(me){setBusy(btn,false);return msg("atMsg",me.message);}
  setBusy(btn,false);
  await refresh(); makeReceipt(a.id,r);
  $("atServico").value=""; $("atValor").value=""; $("atObs").value="";
};

window.makeReceipt=async(atId, receipt=null)=>{
  const a=atendimentos.find(x=>x.id===atId);
  if(!a) return;
  if(!receipt) {
    const z=await sb.from("barbearia_recibos").select("*").eq("atendimento_id",atId).maybeSingle();
    receipt=z.data;
  }
  if(!receipt) return;
  const c=clientes.find(x=>x.id===a.cliente_id);
  const date=dateBR(a.atendido_em);
  const text=[
    `*${empresa.nome_fantasia||empresa.nome}*`,
    `🧾 *Recibo #${receipt.numero}*`,
    "",
    `Cliente: ${c?.nome||"Cliente"}`,
    `Serviço: ${a.servico}`,
    `Valor: ${money(a.valor)}`,
    `Data: ${date}`,
    "",
    "Obrigado pela preferência!"
  ].join("\n");
  openModal(`
    <div class="receipt">
      ${empresa.logo_url?`<img class="receipt-logo" src="${esc(empresa.logo_url)}" alt="">`:""}
      <h3>${esc(empresa.nome_fantasia||empresa.nome)}</h3>
      <p><b>Recibo #${esc(receipt.numero)}</b></p>
      <p>Cliente: ${esc(c?.nome||"Cliente")}</p>
      <p>Serviço: ${esc(a.servico)}</p>
      <p>Valor: <b>${money(a.valor)}</b></p>
      <p>${esc(date)}</p>
    </div>
    <div class="actions" style="margin-top:15px">
      ${c?.telefone?`<button onclick="sendReceipt('${phone(c.telefone)}',${JSON.stringify(text)})">📲 WhatsApp</button>`:""}
      <button class="secondary" onclick="window.print()">🖨️ Imprimir</button>
    </div>
  `);
};
window.sendReceipt=async(ph,text)=>{
  window.open(`https://wa.me/${ph}?text=${encodeURIComponent(text)}`,"_blank");
};

window.wa=(ph,text)=>window.open(`https://wa.me/${ph}?text=${encodeURIComponent(text)}`,"_blank");

$("saveEmpresaBtn").onclick=async()=>{
  msg("empresaMsg","");
  const nome=$("cfgNome").value.trim();
  if(!nome) return msg("empresaMsg","O nome é obrigatório.");
  const payload={
    nome,nome_fantasia:$("cfgFantasia").value.trim()||null,cnpj:$("cfgCnpj").value.trim()||null,
    telefone:$("cfgTelefone").value.trim()||null,whatsapp:$("cfgWhatsapp").value.trim()||null,
    email:$("cfgEmail").value.trim()||null,instagram:$("cfgInstagram").value.trim()||null,
    endereco:$("cfgEndereco").value.trim()||null,cidade:$("cfgCidade").value.trim()||null,
    estado:$("cfgEstado").value.trim()||null,cep:$("cfgCep").value.trim()||null,descricao:$("cfgDescricao").value.trim()||null
  };
  const {data,e,error}=await sb.from("empresas").update(payload).eq("id",empresa.id).select().single();
  if(error) return msg("empresaMsg",error.message);
  empresa=e; renderBrand(); msg("empresaMsg","Estabelecimento salvo.");
};

$("logoInput").onchange=async()=>{
  const file=$("logoInput").files[0];
  if(!file) return;
  msg("logoMsg","Enviando logo...");
  const ext=(file.name.split(".").pop()||"png").toLowerCase();
  const path=`${empresa.id}/logo-${Date.now()}.${ext}`;
  const {error:up}=await sb.storage.from("barbearia-logos").upload(path,file,{upsert:true,contentType:file.type});
  if(up) return msg("logoMsg",up.message);
  const {data}=sb.storage.from("barbearia-logos").getPublicUrl(path);
  const {data:e,error}=await sb.from("empresas").update({logo_url:data.publicUrl}).eq("id",empresa.id).select().single();
  if(error) return msg("logoMsg",error.message);
  empresa=e; renderBrand(); msg("logoMsg","Logo salva.");
};

$("addServicoBtn").onclick=async()=>{
  msg("servicoMsg","");
  const nome=$("svcNome").value.trim(), valor=Number($("svcValor").value), duracao=Number($("svcDuracao").value);
  if(!nome||valor<0||duracao<=0) return msg("servicoMsg","Preencha serviço, valor e duração.");
  const {error}=await sb.from("servicos_barbearia").insert({
    empresa_id:empresa.id,nome,valor,duracao_minutos:duracao,descricao:$("svcDescricao").value.trim()||null,ativo:true
  });
  if(error) return msg("servicoMsg",error.message);
  $("svcNome").value="";$("svcValor").value="";$("svcDuracao").value="";$("svcDescricao").value="";
  await loadServicos(); renderServicos(); fillServiceSelect(); msg("servicoMsg","Serviço adicionado.");
};
window.toggleService=async(id,ativo)=>{
  const {error}=await sb.from("servicos_barbearia").update({ativo}).eq("id",id);
  if(error) return alert(error.message);
  await loadServicos(); renderServicos(); fillServiceSelect();
};
window.deleteService=async id=>{
  if(!confirm("Excluir este serviço?")) return;
  const {error}=await sb.from("servicos_barbearia").delete().eq("id",id);
  if(error) return alert(error.message);
  await loadServicos(); renderServicos(); fillServiceSelect();
};

$("saveHorariosBtn").onclick=async()=>{
  msg("horariosMsg","");
  const rows=dayNames.map((_,i)=>{
    const open=document.querySelector(`.h-open[data-day="${i}"]`).checked;
    return {
      empresa_id:empresa.id,dia_semana:i,aberto:open,
      abertura:open?document.querySelector(`.h-start[data-day="${i}"]`).value||null:null,
      fechamento:open?document.querySelector(`.h-end[data-day="${i}"]`).value||null:null,
      intervalo_inicio:open?document.querySelector(`.h-break-start[data-day="${i}"]`).value||null:null,
      intervalo_fim:open?document.querySelector(`.h-break-end[data-day="${i}"]`).value||null:null
    };
  });
  const {error}=await sb.from("horarios_funcionamento").upsert(rows,{onConflict:"empresa_id,dia_semana"});
  if(error) return msg("horariosMsg",error.message);
  await loadHorarios(); renderHorarios(); msg("horariosMsg","Horários salvos.");
};

init();
