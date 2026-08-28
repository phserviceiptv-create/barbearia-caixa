/* Primeiro acesso: fluxo robusto de criação da barbearia. */
(() => {
  const SUPABASE_URL = "https://zjeclsozvjymuzwyhvqj.supabase.co";
  const SUPABASE_KEY = "sb_publishable_WyjaTHvDUwGPCwHaXcdApw_xlssm0TE";
  let bound = false;

  const $ = id => document.getElementById(id);
  const text = (id, value) => { const el = $(id); if (el) el.textContent = value || ""; };
  const value = id => $(id)?.value?.trim() || null;
  const client = () => window.sb || (window.supabase && window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY));

  function showAuth(message) {
    ["authView", "setupView", "appView"].forEach(id => $(id)?.classList.add("hidden"));
    $("authView")?.classList.remove("hidden");
    text("authMsg", message);
  }

  async function withTimeout(promise, ms, message) {
    let timer;
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(message)), ms);
    });
    try { return await Promise.race([promise, timeout]); }
    finally { clearTimeout(timer); }
  }

  async function create() {
    const btn = $("setupBtn");
    if (!btn || btn.dataset.setupFixBusy === "1") return;

    text("setupMsg", "");
    const nome = value("empresaNome");
    if (!nome) return text("setupMsg", "Informe o nome da barbearia.");

    const sb = client();
    if (!sb) return text("setupMsg", "Não foi possível conectar ao sistema. Recarregue a página.");

    btn.dataset.setupFixBusy = "1";
    btn.disabled = true;
    const oldText = btn.textContent;
    btn.textContent = "Criando...";

    try {
      const sessionResult = await withTimeout(sb.auth.getSession(), 8000, "A conexão demorou demais. Recarregue a página e tente novamente.");
      const session = sessionResult?.data?.session;
      if (!session?.user?.id) {
        await sb.auth.signOut({ scope: "local" }).catch(() => {});
        showAuth("Sua sessão não é válida. Entre novamente para cadastrar a barbearia.");
        return;
      }

      const userResult = await withTimeout(sb.auth.getUser(), 8000, "Não foi possível validar seu acesso. Tente novamente.");
      if (userResult?.error || !userResult?.data?.user?.id) {
        await sb.auth.signOut({ scope: "local" }).catch(() => {});
        showAuth("Sua sessão expirou. Entre novamente para continuar.");
        return;
      }

      const { data, error } = await withTimeout(
        sb.rpc("criar_barbearia", {
          p_nome: nome,
          p_nome_fantasia: value("empresaFantasia") || nome,
          p_cnpj: value("empresaCnpj"),
          p_telefone: value("empresaTelefone"),
          p_whatsapp: value("empresaWhatsapp"),
          p_email: value("empresaEmail") || userResult.data.user.email || null,
          p_instagram: value("empresaInstagram"),
          p_endereco: value("empresaEndereco"),
          p_cidade: value("empresaCidade"),
          p_estado: value("empresaEstado"),
          p_cep: value("empresaCep"),
          p_descricao: value("empresaDescricao")
        }),
        12000,
        "O cadastro demorou mais que o esperado. Tente novamente."
      );

      if (error) throw new Error(error.message || "Não foi possível criar a barbearia.");
      if (!data) throw new Error("O sistema não confirmou a criação da barbearia.");

      text("setupMsg", "Barbearia criada com sucesso. Abrindo o sistema...");
      if (typeof window.loadProfile === "function") {
        await window.loadProfile();
      } else {
        window.location.reload();
      }
    } catch (err) {
      console.error("[Barbearia Caixa] erro no primeiro acesso:", err);
      text("setupMsg", err?.message || "Não foi possível criar a barbearia. Tente novamente.");
    } finally {
      btn.dataset.setupFixBusy = "0";
      btn.disabled = false;
      btn.textContent = oldText;
    }
  }

  function bind() {
    const btn = $("setupBtn");
    if (!btn) return setTimeout(bind, 100);
    if (bound) return;
    bound = true;

    /* Captura antes dos handlers antigos e substitui o fluxo antigo. */
    btn.addEventListener("click", e => {
      e.preventDefault();
      e.stopImmediatePropagation();
      create();
    }, true);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind);
  else bind();
})();
