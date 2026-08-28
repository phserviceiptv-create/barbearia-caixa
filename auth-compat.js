(() => {
  const originalCreateClient = window.supabase?.createClient;
  if (!originalCreateClient || window.__barbeariaSessionFix) return;
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
          await auth.signOut({ scope: 'local' }).catch(() => {});
          return { data: { session: null }, error: null };
        }
      } catch (_) {
        await auth.signOut({ scope: 'local' }).catch(() => {});
        return { data: { session: null }, error: null };
      }
      return result;
    };

    return client;
  };
})();
