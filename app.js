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

// Exposição somente de leitura para os botões rápidos do Caixa.
window.getQuickServices = () => servicos.filter(s => s.ativo);

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
  if (!( $("modal") && $("modalContent") )) return;
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

function renderAll() {
  renderBrand(); fillEmpresaForm(); renderMovs(); renderClients(); fillClientSelect(); fillServiceSelect(); renderAgenda(); renderHistory(); renderServicos(); renderProdutos(); renderHorarios();
  window.renderQuickServices?.();
}
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

// O restante do aplicativo permanece inalterado; as funções abaixo são as originais.
