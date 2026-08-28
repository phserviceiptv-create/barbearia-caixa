(() => {
  const SUPABASE_URL = "https://zjeclsozvjymuzwyhvqj.supabase.co";
  const SUPABASE_KEY = "sb_publishable_WyjaTHvDUwGPCwHaXcdApw_xlssm0TE";

  function getClient() {
    if (window.__barbeariaAuthClient) return window.__barbeariaAuthClient;
    window.__barbeariaAuthClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    return window.__barbeariaAuthClient;
  }

  function setMsg(text) {
    const el = document.getElementById("authMsg");
    if (el) el.textContent = text || "";
  }

  function go(view) {
    ["authView", "setupView", "appView"].forEach(id => document.getElementById(id)?.classList.add("hidden"));
    document.getElementById(view)?.classList.remove("hidden");
  }

  async function login() {
    const email = document.getElementById("email")?.value.trim().toLowerCase();
    const password = document.getElementById("password")?.value || "";
    const btn = document.getElementById("loginBtn");
    if (!email) return setMsg("Informe o e-mail.");
    if (!password) return setMsg("Informe a senha.");
    if (btn) btn.disabled = true;
    setMsg("Entrando...");
    try {
      const { data, error } = await getClient().auth.signInWithPassword({ email, password });
      if (error) return setMsg(error.message || "Não foi possível entrar.");
      if (!data?.session) return setMsg("Não foi possível criar a sessão. Tente novamente.");
      setMsg("");
      window.location.reload();
    } catch (e) {
      setMsg(e?.message || "Não foi possível entrar. Tente novamente.");
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  async function signup() {
    const email = document.getElementById("email")?.value.trim().toLowerCase();
    const password = document.getElementById("password")?.value || "";
    const btn = document.getElementById("signupBtn");
    if (!email) return setMsg("Informe o e-mail que será usado no acesso.");
    if (!/^\S+@\S+\.\S+$/.test(email)) return setMsg("Informe um e-mail válido.");
    if (password.length < 6) return setMsg("A senha precisa ter pelo menos 6 caracteres.");
    if (btn) btn.disabled = true;
    setMsg("Criando acesso...");
    try {
      const { data, error } = await getClient().auth.signUp({ email, password });
      if (error) return setMsg(error.message || "Não foi possível criar o acesso.");
      if (!data?.user) return setMsg("Não foi possível criar o acesso. Tente novamente.");

      if (data.session) {
        setMsg("Acesso criado. Abrindo o primeiro acesso...");
        go("setupView");
        window.dispatchEvent(new CustomEvent("barbearia:auth-created", { detail: data.user }));
        setTimeout(() => window.location.reload(), 250);
        return;
      }

      setMsg("Acesso criado. Abra o e-mail de confirmação enviado pelo sistema e confirme seu endereço. Depois, volte aqui e clique em Entrar.");
    } catch (e) {
      setMsg(e?.message || "Não foi possível criar o acesso. Tente novamente.");
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  function bind() {
    const loginBtn = document.getElementById("loginBtn");
    const signupBtn = document.getElementById("signupBtn");
    if (!loginBtn || !signupBtn) return setTimeout(bind, 100);
    if (loginBtn.dataset.authFlowFix === "1") return;
    loginBtn.dataset.authFlowFix = "1";
    signupBtn.dataset.authFlowFix = "1";

    loginBtn.addEventListener("click", e => {
      e.preventDefault();
      e.stopImmediatePropagation();
      login();
    }, true);

    signupBtn.addEventListener("click", e => {
      e.preventDefault();
      e.stopImmediatePropagation();
      signup();
    }, true);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind);
  else bind();
})();
