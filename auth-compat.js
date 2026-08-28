(() => {
  const originalCreateClient = window.supabase?.createClient;
  if (originalCreateClient && !window.__barbeariaSessionFix) {
    window.__barbeariaSessionFix = true;
    window.supabase.createClient = (...args) => {
      const client = originalCreateClient(...args);
      const auth = client.auth;
      const originalGetSession = auth.getSession.bind(auth);
      auth.getSession = async (...sessionArgs) => {
        const result = await originalGetSession(...sessionArgs);
        if (!result?.data?.session) return result;
        try {
          const checked = await auth.getUser();
          if (checked?.error || !checked?.data?.user) {
            await auth.signOut({ scope: 'local' });
            return { data: { session: null }, error: null };
          }
        } catch (_) {
          await auth.signOut({ scope: 'local' });
          return { data: { session: null }, error: null };
        }
        return result;
      };
    };
  }
})();

(() => {
  const ALIAS = "phserviceiptv@gmail.com";
  const REAL_EMAIL = "phservicefortal@gmail.com";
  const SUPABASE_URL = "https://zjeclsozvjymuzwyhvqj.supabase.co";
  const SUPABASE_KEY = "sb_publishable_WyjaTHvDUwGPCwHaXcdApw_xlssm0TE";

  function wireLoginAlias() {
    const btn = document.getElementById("loginBtn");
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const msg = document.getElementById("authMsg");
    if (!btn || !emailInput || !passwordInput) return setTimeout(wireLoginAlias, 100);
    if (btn.dataset.aliasLoginReady === "1") return;
    btn.dataset.aliasLoginReady = "1";

    btn.addEventListener("click", async (event) => {
      if ((emailInput.value || "").trim().toLowerCase() !== ALIAS) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      msg && (msg.textContent = "Entrando...");
      btn.disabled = true;
      try {
        const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        const { error } = await client.auth.signInWithPassword({
          email: REAL_EMAIL,
          password: passwordInput.value
        });
        if (error) {
          if (msg) msg.textContent = "Senha inválida. Confira a senha e tente novamente.";
          btn.disabled = false;
          return;
        }
        if (msg) msg.textContent = "";
      } catch (error) {
        if (msg) msg.textContent = "Não foi possível entrar. Tente novamente.";
        btn.disabled = false;
      }
    }, true);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", wireLoginAlias);
  else wireLoginAlias();
})();
