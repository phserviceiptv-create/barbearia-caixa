/* Correcoes de sessao, exposicao de estado e validacao do primeiro acesso. */
(function(){
  const SUPABASE_URL='https://zjeclsozvjymuzwyhvqj.supabase.co';
  const SUPABASE_KEY='sb_publishable_WyjaTHvDUwGPCwHaXcdApw_xlssm0TE';
  let lastUserId=null;
  let sessionChecked=false;
  let sessionValid=false;

  function show(id){
    ['authView','setupView','appView'].forEach(x=>document.getElementById(x)?.classList.add('hidden'));
    document.getElementById(id)?.classList.remove('hidden');
  }
  function setMsg(id,text){const el=document.getElementById(id);if(el)el.textContent=text||'';}
  function lockSetup(){const b=document.getElementById('setupBtn');if(b){b.disabled=true;b.dataset.runtimeLocked='1';}}
  function unlockSetup(){const b=document.getElementById('setupBtn');if(b){b.disabled=false;b.dataset.runtimeLocked='0';}}

  async function validateSession(){
    try{
      const client=window.sb || window.supabase?.createClient(SUPABASE_URL,SUPABASE_KEY);
      if(!client){sessionChecked=true;sessionValid=false;return null;}
      window.sb=client;
      const r=await client.auth.getUser();
      if(r.error || !r.data?.user){
        await client.auth.signOut({scope:'local'}).catch(()=>{});
        lastUserId=null;sessionChecked=true;sessionValid=false;
        return null;
      }
      window.user=r.data.user;
      if(typeof user!=='undefined') user=r.data.user;
      sessionChecked=true;sessionValid=true;
      return r.data.user;
    }catch(_){
      try{await window.sb?.auth.signOut({scope:'local'});}catch(__){}
      lastUserId=null;sessionChecked=true;sessionValid=false;
      return null;
    }
  }

  async function syncEmpresa(){
    const u=await validateSession();
    if(!u) return null;
    try{
      const p=await sb.from('perfis').select('empresa_id').eq('id',u.id).maybeSingle();
      if(p.error || !p.data?.empresa_id){window.empresa=null;return null;}
      const e=await sb.from('empresas').select('*').eq('id',p.data.empresa_id).maybeSingle();
      if(e.error || !e.data){window.empresa=null;return null;}
      window.empresa=e.data;
      try{empresa=e.data;}catch(_){}
      const s=await sb.from('assinaturas').select('*').eq('empresa_id',e.data.id).order('created_at',{ascending:false}).limit(1).maybeSingle();
      window.assinatura=s.data||null;
      return e.data;
    }catch(_){return null;}
  }

  function bindSetupGuard(){
    const btn=document.getElementById('setupBtn');
    if(!btn || btn.dataset.runtimeGuard==='1') return;
    btn.dataset.runtimeGuard='1';
    lockSetup();
    btn.addEventListener('click',function(e){
      if(!sessionChecked || !sessionValid){
        e.preventDefault();e.stopImmediatePropagation();
        setMsg('setupMsg','Sua sessão não é válida. Entre novamente para cadastrar a barbearia.');
        show('authView');setMsg('authMsg','Entre novamente para continuar.');
      }
    },true);
  }

  async function boot(){
    window.sb=window.sb || window.supabase?.createClient(SUPABASE_URL,SUPABASE_KEY);
    bindSetupGuard();
    lockSetup();
    const u=await validateSession();
    if(!u){
      show('authView');
      setMsg('authMsg','Sua sessão anterior não é mais válida. Entre novamente.');
      return;
    }
    unlockSetup();
    await syncEmpresa();
    if(lastUserId!==u.id){lastUserId=u.id;window.dispatchEvent(new CustomEvent('barbearia:state-ready'));}
  }

  document.addEventListener('DOMContentLoaded',()=>{
    bindSetupGuard();
    setTimeout(boot,150);
    setInterval(()=>{
      bindSetupGuard();
      if(document.getElementById('appView') && !document.getElementById('appView').classList.contains('hidden')) syncEmpresa();
    },3000);
  });
})();
