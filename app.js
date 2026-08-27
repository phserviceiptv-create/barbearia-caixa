const SUPABASE_URL = "https://zjeclsozvjymuzwyhvqj.supabase.co";
const SUPABASE_KEY = "sb_publishable_WyjaTHvDUwGPCwHaXcdApw_xlssm0TE";
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let user = null, empresa = null, perfil = null;
let clientes = [], atendimentos = [], movimentacoes = [], servicos = [], horarios = [], produtos = [], agendamentos = [];

const $ = id => document.getElementById(id);
const money = v => Number(v || 0).toLocaleString("pt-BR", {style:"currency", currency:"BRL"});
const esc = s => String(s ?? "").replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
const phone = s => String(s || "").replace(/\D/g, "");
const todayISO = () => new Date().toISOString().slice(0,10);
const dateBR = v => v ? new Date(v).toLocaleString("pt-BR") : "";
const dateOnlyBR = v => v ? new Date(v + "T12:00:00").toLocaleDateString("pt-BR") : "";

function show(view) {
  ["authView","setupView","appView"].forEach(x => $(x)?.classList.add("hidden"));
  $(view)?.classList.remove("hidden");
}
function msg(id, text) { if ($(id)) $(id).textContent = text || ""; }
function setBusy(button, busy, text) {
  if (!button) return;
  button.disabled = busy;
  if (busy) button.dataset.oldText = button.textContent;
  button.textContent = busy ? "Salvando..." : (button.dataset.oldText || text || button.textContent);
}
function openModal(html) {
  if (!$("modal") || !$("modalContent")) return;
  $("modalContent").innerHTML = html;
  $("modal").classList.remove("hidden");
}
function closeModal() { $("modal")?.classList.add("hidden"); }
function wa(number, text) {
  const n = phone(number);
  if (!n) return;
  window.open(`https://wa.me/${n}?text=${encodeURIComponent(text || "")}`, "_blank");
}

async function init() {
  try {
    const {data:{session}} = await sb.auth.getSession();
    if (!session) return show("authView");
    user = session.user;
    await loadProfile();
  } catch (e) {
    msg("authMsg", e?.message || "Erro ao iniciar o sistema.");
  }
}

sb.auth.onAuthStateChange(async (_event, session) => {
  if (!session) {
    user = null; empresa = null; perfil = null;
    show("authView");
    return;
  }
  user = session.user;
  await loadProfile();
});

async function loadProfile() {
  const {data:p, error:pe} = await sb.from("perfis").select("*").eq("id", user.id).maybeSingle();
  if (pe) return msg("authMsg", pe.message);
  perfil = p;
  if (!p) return show("setupView");

  const {data:e, error:ee} = await sb.from("empresas").select("*").eq("id", p.empresa_id).single();
  if (ee || !e) return show("setupView");
  empresa = e;
  show("appView");
  await refresh();
}

async function createSetup() {
  msg("setupMsg", "");
  const nome = $("empresaNome")?.value.trim();
  if (!nome) return msg("setupMsg", "Informe o nome da barbearia.");
  const btn = $("setupBtn");
  setBusy(btn, true);

  const payload = {
    nome,
    nome_fantasia: $("empresaFantasia")?.value.trim() || nome,
    cnpj: $("empresaCnpj")?.value.trim() || null,
    telefone: $("empresaTelefone")?.value.trim() || null,
    whatsapp: $("empresaWhatsapp")?.value.trim() || null,
    email: $("empresaEmail")?.value.trim() || user.email || null,
    instagram: $("empresaInstagram")?.value.trim() || null,
    endereco: $("empresaEndereco")?.value.trim() || null,
    cidade: $("empresaCidade")?.value.trim() || null,
    estado: $("empresaEstado")?.value.trim() || null,
    cep: $("empresaCep")?.value.trim() || null,
    descricao: $("empresaDescricao")?.value.trim() || null,
    owner_id: user.id
  };
  const {data:e, error:ee} = await sb.from("empresas").insert(payload).select().single();
  if (ee) { setBusy(btn,false); return msg("setupMsg", ee.message); }
  const {error:pe} = await sb.from("perfis").insert({id:user.id, empresa_id:e.id, nome:user.email?.split("@")[0] || "Administrador", papel:"admin"});
  if (pe) { setBusy(btn,false); return msg("setupMsg", pe.message); }
  const rows = Array.from({length:7}, (_,dia) => ({empresa_id:e.id, dia_semana:dia, aberto: dia > 0 && dia < 6, abertura: dia > 0 && dia < 6 ? "08:00" : null, fechamento: dia > 0 && dia < 6 ? "18:00" : null, intervalo_inicio: dia > 0 && dia < 6 ? "12:00" : null, intervalo_fim: dia > 0 && dia < 6 ? "13:00" : null}));
  const hr = await sb.from("horarios_funcionamento").upsert(rows, {onConflict:"empresa_id,dia_semana"});
  if (hr.error) { setBusy(btn,false); return msg("setupMsg", hr.error.message); }
  setBusy(btn,false); await loadProfile();
}

async function refresh() {
  await Promise.all([loadClients(),loadMovs(),loadAtendimentos(),loadServicos(),loadHorarios(),loadProdutos(),loadAgendamentos()]);
  renderAll();
}
async function loadClients() { const r = await sb.from("clientes").select("*").eq("empresa_id",empresa.id).order("nome"); clientes = r.data || []; }
async function loadMovs() { const r = await sb.from("barbearia_movimentacoes").select("*").eq("empresa_id",empresa.id).order("data_movimento",{ascending:false}).limit(100); movimentacoes = r.data || []; }
async function loadAtendimentos() { const r = await sb.from("barbearia_atendimentos").select("*").eq("empresa_id",empresa.id).order("atendido_em",{ascending:false}).limit(100); atendimentos = r.data || []; }
async function loadServicos() { const r = await sb.from("servicos_barbearia").select("*").eq("empresa_id",empresa.id).order("nome"); servicos = r.data || []; }
async function loadHorarios() { const r = await sb.from("horarios_funcionamento").select("*").eq("empresa_id",empresa.id).order("dia_semana"); horarios = r.data || []; }
async function loadProdutos() { const r = await sb.from("produtos").select("*").eq("empresa_id",empresa.id).order("nome"); produtos = r.data || []; }
async function loadAgendamentos() { const r = await sb.from("agendamentos").select("*").eq("empresa_id",empresa.id).order("inicio",{ascending:true}).limit(200); agendamentos = r.data || []; }

function renderAll() { renderBrand(); fillEmpresaForm(); renderMovs(); renderClients(); fillClientSelect(); fillServiceSelect(); renderAgenda(); renderHistory(); renderServicos(); renderProdutos(); renderHorarios(); }
function renderBrand() {
  if (!$("appTitle")) return;
  const name = empresa?.nome_fantasia || empresa?.nome || "Barbearia Caixa";
  $("appTitle").textContent = name;
  if (empresa?.logo_url) { $("appLogo")?.classList.remove("hidden"); if ($("appLogo")) $("appLogo").src = empresa.logo_url; $("appScissors")?.classList.add("hidden"); if ($("settingsLogo")) { $("settingsLogo").src = empresa.logo_url; $("settingsLogo").classList.remove("hidden"); } $("logoPlaceholder")?.classList.add("hidden"); }
  else { $("appLogo")?.classList.add("hidden"); $("appScissors")?.classList.remove("hidden"); $("settingsLogo")?.classList.add("hidden"); $("logoPlaceholder")?.classList.remove("hidden"); }
}
function renderMovs() {
  if (!$("movList")) return;
  const ent = movimentacoes.filter(x=>x.tipo==="entrada").reduce((a,x)=>a+Number(x.valor||0),0);
  const sai = movimentacoes.filter(x=>x.tipo==="saida").reduce((a,x)=>a+Number(x.valor||0),0);
  if ($("totalEntradas")) $("totalEntradas").textContent = money(ent); if ($("totalSaidas")) $("totalSaidas").textContent = money(sai); if ($("saldo")) $("saldo").textContent = money(ent-sai);
  $("movList").innerHTML = movimentacoes.length ? movimentacoes.map(x=>`<div class="row"><div><b>${esc(x.descricao)}</b><div class="muted">${dateBR(x.data_movimento)} · ${esc(x.forma_pagamento||"")}</div></div><strong class="${x.tipo==="entrada"?"positive":"negative"}">${x.tipo==="entrada"?"+":"-"} ${money(x.valor)}</strong></div>`).join("") : `<div class="empty">Nenhuma movimentação ainda.</div>`;
}
function renderClients() { if (!$("clientesList")) return; const q = ($("clienteBusca")?.value || "").toLowerCase(); const arr = clientes.filter(c => [c.nome,c.telefone,c.email,c.cpf].join(" ").toLowerCase().includes(q)); $("clientesList").innerHTML = arr.length ? arr.map(c=>`<div class="card client-card"><div class="client-main">${c.foto_url ? `<img class="avatar" src="${esc(c.foto_url)}" alt="">` : `<div class="avatar placeholder">👤</div>`}<div><b>${esc(c.nome)}</b><div class="muted">${esc(c.telefone||"Sem WhatsApp")} ${c.email?`· ${esc(c.email)}`:""}</div></div></div><div class="actions"><button onclick="editClient('${c.id}')">Editar</button>${c.telefone?`<button onclick="wa('${phone(c.telefone)}','Olá ${esc(c.nome)}, tudo bem?')">WhatsApp</button>`:""}</div></div>`).join("") : `<div class="empty">Nenhum cliente encontrado.</div>`; }
function fillClientSelect() { if (!$("atCliente")) return; $("atCliente").innerHTML = `<option value="">Cliente não informado</option>` + clientes.map(c=>`<option value="${c.id}">${esc(c.nome)}${c.telefone?" — "+esc(c.telefone):""}</option>`).join(""); }
function fillServiceSelect() { if (!$("atServicoSelect")) return; $("atServicoSelect").innerHTML = `<option value="">Selecionar serviço cadastrado...</option>` + servicos.filter(s=>s.ativo).map(s=>`<option value="${s.id}" data-nome="${esc(s.nome)}" data-valor="${Number(s.valor)}">${esc(s.nome)} — ${money(s.valor)}</option>`).join(""); }
function renderHistory() {
  if (!$("histList")) return;
  $("histList").innerHTML = atendimentos.length ? atendimentos.map(a=>{ const c = clientes.find(x=>x.id===a.cliente_id); return `<div class="card row card-row"><div><b>${esc(a.servico)}</b><div class="muted">${esc(c?.nome||"Cliente avulso")} · ${dateBR(a.atendido_em)}</div><div class="muted">${esc(a.profissional||"")} ${a.observacoes?"· "+esc(a.observacoes):""}</div></div><div class="right"><strong>${money(a.valor)}</strong><br><button onclick="makeReceipt('${a.id}')">Recibo</button></div></div>`; }).join("") : `<div class="empty">Nenhum atendimento registrado.</div>`;
}
function renderAgenda() {
  if (!$("agendaList") || !$("agendaData")) return;
  const selected = $("agendaData").value || todayISO(); const dayStart = new Date(selected+"T00:00:00"); const dayEnd = new Date(selected+"T23:59:59");
  const arr = agendamentos.filter(a => { const d = new Date(a.inicio); return d >= dayStart && d <= dayEnd; });
  $("agendaList").innerHTML = arr.length ? arr.map(a=>{ const c = clientes.find(x=>x.id===a.cliente_id); const s = servicos.find(x=>x.id===a.servico_id); const status = a.status || "agendado"; return `<div class="card appointment-row"><div class="appointment-time">${new Date(a.inicio).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}</div><div class="appointment-main"><b>${esc(c?.nome||"Cliente")}</b><span>${esc(s?.nome||"Serviço")}</span><small>${esc(a.profissional||"")} ${a.observacoes?"· "+esc(a.observacoes):""}</small></div><span class="status ${esc(status)}">${esc(status)}</span><div class="actions">${c?.telefone?`<button onclick="wa('${phone(c.telefone)}','Olá ${esc(c.nome)}, confirmando seu horário na ${esc(empresa.nome_fantasia||empresa.nome)}.')">WhatsApp</button>`:""}${status==="agendado"?`<button onclick="finishAppointment('${a.id}')">Concluir</button><button onclick="cancelAppointment('${a.id}')">Cancelar</button>`:""}</div></div>`; }).join("") : `<div class="empty">Nenhum agendamento para ${dateOnlyBR(selected)}.</div>`;
}
function fillEmpresaForm() { if (!empresa) return; const map={cfgNome:"nome",cfgFantasia:"nome_fantasia",cfgCnpj:"cnpj",cfgTelefone:"telefone",cfgWhatsapp:"whatsapp",cfgEmail:"email",cfgInstagram:"instagram",cfgEndereco:"endereco",cfgCidade:"cidade",cfgEstado:"estado",cfgCep:"cep",cfgDescricao:"descricao"}; Object.entries(map).forEach(([id,key])=>{if($(id))$(id).value=empresa[key]||"";}); }
function renderServicos() { if(!$("servicosList"))return; $("servicosList").innerHTML=servicos.length?servicos.map(s=>`<div class="service-row"><div><b>${esc(s.nome)}</b><div class="muted">${money(s.valor)} · ${s.duracao_minutos||0} min ${s.descricao?"· "+esc(s.descricao):""}</div></div><div class="actions"><span class="pill">${s.ativo?"Ativo":"Inativo"}</span><button onclick="toggleService('${s.id}',${!s.ativo})">${s.ativo?"Desativar":"Ativar"}</button><button onclick="deleteService('${s.id}')">Excluir</button></div></div>`).join(""): `<div class="empty">Nenhum serviço cadastrado.</div>`; }
function renderProdutos() { if(!$("produtosList"))return; $("produtosList").innerHTML=produtos.length?produtos.map(p=>`<div class="service-row"><div><b>${esc(p.nome)}</b><div class="muted">${money(p.preco)} ${p.custo!=null?"· Custo "+money(p.custo):""}</div></div><div class="actions"><span class="pill">${p.ativo?"Ativo":"Inativo"}</span><button onclick="toggleProduto('${p.id}',${!p.ativo})">${p.ativo?"Desativar":"Ativar"}</button><button onclick="deleteProduto('${p.id}')">Excluir</button></div></div>`).join(""): `<div class="empty">Nenhum produto cadastrado.</div>`; }
const dayNames=["Domingo","Segunda-feira","Terça-feira","Quarta-feira","Quinta-feira","Sexta-feira","Sábado"];
function renderHorarios(){if(!$("horariosList"))return;$("horariosList").innerHTML=dayNames.map((name,i)=>{const h=horarios.find(x=>Number(x.dia_semana)===i)||{};return `<div class="hours-row"><label class="day-check"><input type="checkbox" class="h-open" data-day="${i}" ${h.aberto?"checked":""}> <b>${name}</b></label><input type="time" class="h-start" data-day="${i}" value="${h.abertura||""}"><input type="time" class="h-end" data-day="${i}" value="${h.fechamento||""}"><input type="time" class="h-break-start" data-day="${i}" value="${h.intervalo_inicio||""}"><input type="time" class="h-break-end" data-day="${i}" value="${h.intervalo_fim||""}></div>`;}).join("");}
async function saveEmpresa(){msg("empresaMsg","");const btn=$("saveEmpresaBtn");setBusy(btn,true);const updates={nome:$("cfgNome")?.value.trim(),nome_fantasia:$("cfgFantasia")?.value.trim()||$("cfgNome")?.value.trim(),cnpj:$("cfgCnpj")?.value.trim()||null,telefone:$("cfgTelefone")?.value.trim()||null,whatsapp:$("cfgWhatsapp")?.value.trim()||null,email:$("cfgEmail")?.value.trim()||null,instagram:$("cfgInstagram")?.value.trim()||null,endereco:$("cfgEndereco")?.value.trim()||null,cidade:$("cfgCidade")?.value.trim()||null,estado:$("cfgEstado")?.value.trim()||null,cep:$("cfgCep")?.value.trim()||null,descricao:$("cfgDescricao")?.value.trim()||null};if(!updates.nome){setBusy(btn,false);return msg("empresaMsg","Informe o nome da barbearia.");}const r=await sb.from("empresas").update(updates).eq("id",empresa.id).select().single();if(r.error){setBusy(btn,false);return msg("empresaMsg",r.error.message);}empresa=r.data;renderAll();setBusy(btn,false);msg("empresaMsg","Informações salvas.");}
async function saveLogo(file){if(!file||!empresa)return;msg("logoMsg","Processando logo...");const dataUrl=await resizeImage(file,420,420,.82);const r=await sb.from("empresas").update({logo_url:dataUrl}).eq("id",empresa.id).select().single();if(r.error){msg("logoMsg",r.error.message);return;}empresa=r.data;renderBrand();msg("logoMsg","Logo salva.");}
function resizeImage(file,maxW,maxH,quality){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>{const img=new Image();img.onload=()=>{const scale=Math.min(1,maxW/img.width,maxH/img.height);const c=document.createElement("canvas");c.width=Math.round(img.width*scale);c.height=Math.round(img.height*scale);c.getContext("2d").drawImage(img,0,0,c.width,c.height);resolve(c.toDataURL("image/jpeg",quality));};img.onerror=reject;img.src=reader.result;};reader.onerror=reject;reader.readAsDataURL(file);});}
async function addServico(){msg("servicoMsg","");const nome=$("svcNome")?.value.trim(),valor=Number($("svcValor")?.value),dur=Number($("svcDuracao")?.value);if(!nome||valor<0||!dur)return msg("servicoMsg","Preencha serviço, valor e duração.");const r=await sb.from("servicos_barbearia").insert({empresa_id:empresa.id,nome,valor,duracao_minutos:dur,descricao:$("svcDescricao")?.value.trim()||null,ativo:true}).select().single();if(r.error)return msg("servicoMsg",r.error.message);["svcNome","svcValor","svcDuracao","svcDescricao"].forEach(id=>{if($(id))$(id).value="";});await loadServicos();fillServiceSelect();renderServicos();window.renderQuickServices?.();msg("servicoMsg","Serviço adicionado.");}
async function toggleService(id,ativo){const r=await sb.from("servicos_barbearia").update({ativo}).eq("id",id).eq("empresa_id",empresa.id);if(r.error)return alert(r.error.message);await loadServicos();fillServiceSelect();renderServicos();window.renderQuickServices?.();}
async function deleteService(id){if(!confirm("Excluir este serviço?"))return;const r=await sb.from("servicos_barbearia").delete().eq("id",id).eq("empresa_id",empresa.id);if(r.error)return alert(r.error.message);await loadServicos();fillServiceSelect();renderServicos();window.renderQuickServices?.();}
async function addProduto(){msg("produtoMsg","");const nome=$("prodNome")?.value.trim(),preco=Number($("prodPreco")?.value);if(!nome||preco<0)return msg("produtoMsg","Preencha produto e preço.");const r=await sb.from("produtos").insert({empresa_id:empresa.id,nome,preco,custo:Number($("prodCusto")?.value)||0,descricao:$("prodDescricao")?.value.trim()||null,ativo:true,controla_estoque:false,disponivel_balcao:true,disponivel_delivery:false}).select().single();if(r.error)return msg("produtoMsg",r.error.message);["prodNome","prodPreco","prodCusto","prodDescricao"].forEach(id=>{if($(id))$(id).value="";});await loadProdutos();renderProdutos();msg("produtoMsg","Produto adicionado.");}
async function toggleProduto(id,ativo){const r=await sb.from("produtos").update({ativo}).eq("id",id).eq("empresa_id",empresa.id);if(r.error)return alert(r.error.message);await loadProdutos();renderProdutos();}
async function deleteProduto(id){if(!confirm("Excluir este produto?"))return;const r=await sb.from("produtos").delete().eq("id",id).eq("empresa_id",empresa.id);if(r.error)return alert(r.error.message);await loadProdutos();renderProdutos();}
async function saveHorarios(){msg("horariosMsg","");const rows=dayNames.map((_,i)=>({empresa_id:empresa.id,dia_semana:i,aberto:$(`.h-open[data-day="${i}"]`)?.checked||false,abertura:$(`.h-start[data-day="${i}"]`)?.value||null,fechamento:$(`.h-end[data-day="${i}"]`)?.value||null,intervalo_inicio:$(`.h-break-start[data-day="${i}"]`)?.value||null,intervalo_fim:$(`.h-break-end[data-day="${i}"]`)?.value||null}));const r=await sb.from("horarios_funcionamento").upsert(rows,{onConflict:"empresa_id,dia_semana"});if(r.error)return msg("horariosMsg",r.error.message);await loadHorarios();renderHorarios();msg("horariosMsg","Horários salvos.");}
function openClientModal(c){openModal(`<h2>${c?.id?"Editar cliente":"Novo cliente"}</h2><div class="grid2"><input id="mNome" placeholder="Nome *" value="${esc(c?.nome||"")}"><input id="mTel" placeholder="WhatsApp / telefone" value="${esc(c?.telefone||"")}"><input id="mEmail" placeholder="E-mail" value="${esc(c?.email||"")}"><input id="mCpf" placeholder="CPF" value="${esc(c?.cpf||"")}"><input id="mNascimento" type="date" value="${esc(c?.data_nascimento||"")}"><input id="mEndereco" placeholder="Endereço" value="${esc(c?.endereco||"")}"></div><textarea id="mObs" placeholder="Observações">${esc(c?.observacoes||"")}</textarea><button id="saveClientModal">${c?.id?"Salvar alterações":"Cadastrar cliente"}</button><div id="modalMsg" class="msg"></div>`);$("saveClientModal")?.addEventListener("click",async()=>{const data={nome:$("mNome")?.value.trim(),telefone:$("mTel")?.value.trim()||null,email:$("mEmail")?.value.trim()||null,cpf:$("mCpf")?.value.trim()||null,data_nascimento:$("mNascimento")?.value||null,endereco:$("mEndereco")?.value.trim()||null,observacoes:$("mObs")?.value.trim()||null};if(!data.nome)return msg("modalMsg","Informe o nome.");const r=c?.id?await sb.from("clientes").update(data).eq("id",c.id).eq("empresa_id",empresa.id).select().single():await sb.from("clientes").insert({...data,empresa_id:empresa.id}).select().single();if(r.error)return msg("modalMsg",r.error.message);closeModal();await loadClients();fillClientSelect();renderClients();});}
function editClient(id){openClientModal(clientes.find(c=>c.id===id));}
async function saveMovement(){const data={tipo:$("mTipo")?.value,descricao:$("mDesc")?.value.trim(),valor:Number($("mValor")?.value),forma_pagamento:$("mForma")?.value,categoria:$("mCategoria")?.value.trim()||"Manual",empresa_id:empresa.id,created_by:user.id};if(!data.descricao||data.valor<=0)return msg("modalMsg","Informe descrição e valor.");const r=await sb.from("barbearia_movimentacoes").insert(data);if(r.error)return msg("modalMsg",r.error.message);closeModal();await loadMovs();renderMovs();}
function openMovementModal(){openModal(`<h2>Nova movimentação</h2><label>Tipo<select id="mTipo"><option value="entrada">Entrada</option><option value="saida">Saída</option></select></label><label>Descrição<input id="mDesc" placeholder="Ex.: Venda, aluguel, material"></label><label>Valor<input id="mValor" type="number" min="0" step="0.01" placeholder="0,00"></label><label>Pagamento<select id="mForma"><option>Pix</option><option>Dinheiro</option><option>Cartão</option><option>Outro</option></select></label><label>Categoria<input id="mCategoria" placeholder="Categoria"></label><button id="saveMovementBtn">Salvar movimentação</button><div id="modalMsg" class="msg"></div>`);$("saveMovementBtn")?.addEventListener("click",saveMovement);}
function appointmentForm(){return `<h2>Novo agendamento</h2><label>Cliente<select id="agCliente"><option value="">Selecionar cliente...</option>${clientes.map(c=>`<option value="${c.id}">${esc(c.nome)}</option>`).join("")}</select></label><label>Serviço<select id="agServico"><option value="">Selecionar serviço...</option>${servicos.filter(s=>s.ativo).map(s=>`<option value="${s.id}">${esc(s.nome)} — ${money(s.valor)}</option>`).join("")}</select></label><div class="grid2"><label>Data<input id="agData" type="date" value="${$("agendaData")?.value||todayISO()}"></label><label>Horário<input id="agHora" type="time" value="09:00"></label></div><label>Profissional<input id="agProfissional" placeholder="Nome do barbeiro"></label><textarea id="agObs" placeholder="Observação"></textarea><button id="saveAgendamentoBtn">Salvar agendamento</button><div id="modalMsg" class="msg"></div>`;}
function openAppointmentModal(){openModal(appointmentForm());$("saveAgendamentoBtn")?.addEventListener("click",async()=>{const cliente=$("agCliente")?.value||null,servico=$("agServico")?.value||null,data=$("agData")?.value,hora=$("agHora")?.value;if(!data||!hora)return msg("modalMsg","Informe data e horário.");const s=servicos.find(x=>x.id===servico),start=new Date(`${data}T${hora}:00`);const end=new Date(start.getTime()+Number(s?.duracao_minutos||30)*60000);const r=await sb.from("agendamentos").insert({empresa_id:empresa.id,cliente_id:cliente,servico_id:servico,profissional:$("agProfissional")?.value.trim()||null,inicio:start.toISOString(),fim:end.toISOString(),status:"agendado",observacoes:$("agObs")?.value.trim()||null,created_by:user.id}).select().single();if(r.error)return msg("modalMsg",r.error.message);if($("agendaData"))$("agendaData").value=data;closeModal();await loadAgendamentos();renderAgenda();});}
async function updateAppointment(id,status){const r=await sb.from("agendamentos").update({status,updated_at:new Date().toISOString()}).eq("id",id).eq("empresa_id",empresa.id);if(r.error)return alert(r.error.message);await loadAgendamentos();renderAgenda();}
function finishAppointment(id){updateAppointment(id,"concluido");}
function cancelAppointment(id){if(confirm("Cancelar este agendamento?"))updateAppointment(id,"cancelado");}
async function registerAttendance(){msg("atMsg","");const serviceSelect=$("atServicoSelect");const opt=serviceSelect?.options[serviceSelect?.selectedIndex];const servico=$("atServico")?.value.trim()||opt?.dataset?.nome||"";const valor=Number($("atValor")?.value)||Number(opt?.dataset?.valor||0);if(!servico||valor<=0)return msg("atMsg","Informe o serviço e o valor.");const payload={empresa_id:empresa.id,cliente_id:$("atCliente")?.value||null,servico,profissional:$("atProfissional")?.value.trim()||null,valor,observacoes:$("atObs")?.value.trim()||null,atendido_em:new Date().toISOString(),created_by:user.id};const r=await sb.from("barbearia_atendimentos").insert(payload).select().single();if(r.error)return msg("atMsg",r.error.message);const mov=await sb.from("barbearia_movimentacoes").insert({empresa_id:empresa.id,cliente_id:payload.cliente_id,atendimento_id:r.data.id,tipo:"entrada",categoria:"Atendimento",descricao:servico,valor,forma_pagamento:$("atPagamento")?.value,data_movimento:payload.atendido_em,created_by:user.id});if(mov.error)console.warn(mov.error);await sb.from("barbearia_recibos").insert({empresa_id:empresa.id,atendimento_id:r.data.id,created_by:user.id});const atendimento=r.data;["atServico","atProfissional","atValor","atObs"].forEach(id=>{if($(id))$(id).value="";});await Promise.all([loadAtendimentos(),loadMovs()]);renderHistory();renderMovs();makeReceipt(atendimento.id);}
function makeReceipt(id){const a=atendimentos.find(x=>x.id===id);if(!a)return;const c=clientes.find(x=>x.id===a.cliente_id);const address=[empresa.endereco,empresa.cidade,empresa.estado,empresa.cep].filter(Boolean).join(" · ");openModal(`<div class="receipt">${empresa.logo_url?`<img class="receipt-logo" src="${esc(empresa.logo_url)}" alt="Logo">`:""}<h3>${esc(empresa.nome_fantasia||empresa.nome||"Barbearia Caixa")}</h3>${address?`<div class="center-text muted">${esc(address)}</div>`:""}${empresa.whatsapp?`<div class="center-text muted">${esc(empresa.whatsapp)}</div>`:""}<hr><p><b>Cliente:</b> ${esc(c?.nome||"Cliente avulso")}</p><p><b>Serviço:</b> ${esc(a.servico)}</p>${a.profissional?`<p><b>Profissional:</b> ${esc(a.profissional)}</p>`:""}<p><b>Data:</b> ${esc(dateBR(a.atendido_em))}</p><p class="receipt-total"><b>Total:</b> ${money(a.valor)}</p><p class="center-text muted">Obrigado pela preferência!</p></div><div class="actions receipt-actions"><button id="printReceiptBtn">Imprimir</button>${c?.telefone?`<button id="waReceiptBtn">Enviar WhatsApp</button>`:""}</div>`);$("printReceiptBtn")?.addEventListener("click",()=>window.print());if(c?.telefone)$("waReceiptBtn")?.addEventListener("click",()=>wa(c.telefone,receiptText(a,c)));}
function receiptText(a,c){return `*${empresa.nome_fantasia||empresa.nome}*\nCliente: ${c?.nome||"Cliente avulso"}\nServiço: ${a.servico}\nValor: ${money(a.valor)}\nData: ${dateBR(a.atendido_em)}\nObrigado pela preferência!`;}
function bindEvents(){
  $("closeModal")?.addEventListener("click",closeModal);$("modal")?.addEventListener("click",e=>{if(e.target.id==="modal")closeModal();});
  $("loginBtn")?.addEventListener("click",async()=>{msg("authMsg","");const {error}=await sb.auth.signInWithPassword({email:$("email")?.value.trim(),password:$("password")?.value});if(error)msg("authMsg",error.message);});
  $("signupBtn")?.addEventListener("click",async()=>{msg("authMsg","");const email=$("email")?.value.trim(),password=$("password")?.value||"";if(!email)return msg("authMsg","Informe o e-mail.");if(password.length<6)return msg("authMsg","A senha precisa ter pelo menos 6 caracteres.");const {data,error}=await sb.auth.signUp({email,password});if(error)return msg("authMsg",error.message);if(data.session){user=data.user;return loadProfile();}msg("authMsg","Acesso criado. Confira seu e-mail se a confirmação estiver ativa e depois entre.");});
  $("logoutBtn")?.addEventListener("click",()=>sb.auth.signOut());$("setupBtn")?.addEventListener("click",createSetup);$("novaMovBtn")?.addEventListener("click",openMovementModal);$("novoClienteBtn")?.addEventListener("click",()=>openClientModal(null));$("novoAgendamentoBtn")?.addEventListener("click",openAppointmentModal);$("agendaHojeBtn")?.addEventListener("click",()=>{if($("agendaData"))$("agendaData").value=todayISO();renderAgenda();});$("agendaData")?.addEventListener("change",renderAgenda);$("registrarAtBtn")?.addEventListener("click",registerAttendance);$("clienteBusca")?.addEventListener("input",renderClients);
  $("atServicoSelect")?.addEventListener("change",()=>{const o=$("atServicoSelect")?.options[$("atServicoSelect")?.selectedIndex];if(o?.dataset?.nome){if($("atServico"))$("atServico").value=o.dataset.nome;if($("atValor"))$("atValor").value=o.dataset.valor||"";}});
  $("saveEmpresaBtn")?.addEventListener("click",saveEmpresa);$("logoInput")?.addEventListener("change",e=>saveLogo(e.target.files[0]));$("addServicoBtn")?.addEventListener("click",addServico);$("addProdutoBtn")?.addEventListener("click",addProduto);$("saveHorariosBtn")?.addEventListener("click",saveHorarios);
  document.querySelectorAll(".tab").forEach(b=>b.addEventListener("click",()=>{document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));document.querySelectorAll(".panel").forEach(x=>x.classList.remove("active"));b.classList.add("active");const panel=$(b.dataset.tab);if(panel)panel.classList.add("active");}));
  if($("agendaData"))$("agendaData").value=todayISO();
}
document.addEventListener("DOMContentLoaded",()=>{bindEvents();init();});
