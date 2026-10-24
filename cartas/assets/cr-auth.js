/** cr-auth.js — cliente Supabase único + proteção de páginas (RT-03) */
window._sb = supabase.createClient(window.CR_CONFIG.SB_URL, window.CR_CONFIG.SB_KEY);
(async () => {
  const { data: { session } } = await window._sb.auth.getSession();
  if (/login\.html$/.test(location.pathname)) { if (session) location.replace('index.html'); return; }
  if (!session) location.replace('login.html?next=' + encodeURIComponent((location.pathname.split('/').pop() || 'index.html') + location.search));
})();
