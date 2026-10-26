/** cr-auth.js — cliente único (Supabase real ou demonstração) + proteção de páginas */
window._sb = window.CR_CONFIG.DEMO ? window.CABDemo.client() : supabase.createClient(window.CR_CONFIG.SB_URL, window.CR_CONFIG.SB_KEY);
(async () => {
  const { data: { session } } = await window._sb.auth.getSession();
  if (/login\.html$/.test(location.pathname)) { if (session) location.replace('index.html'); return; }
  if (!session) location.replace('login.html?next=' + encodeURIComponent((location.pathname.split('/').pop() || 'index.html') + location.search));
})();
