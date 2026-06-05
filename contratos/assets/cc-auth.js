/* ════════════════════════════════════════════
   cc-auth.js — Orizon Consultoria
   ════════════════════════════════════════════ */

const SUPABASE_URL      = 'https://yunoxkembhskpnprffoi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1bm94a2VtYmhza3BucHJmZm9pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5Nzg2MzksImV4cCI6MjA5NDU1NDYzOX0.WhkzrBCHThvJaMuLeo6oVPjrWvc_MvfCoyz9B90-Yms';

window.__ccAuthReady = async function () {
  try {
    const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    window._sb = sb;

    const res = await sb.auth.getSession();
    const session = res.data?.session || null;

    if (!session) {
      const origem = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.replace('/contratos/login.html?next=' + origem);
      return;
    }

    const user = session.user;
    const nomeEl  = document.getElementById('user-nome');
    const emailEl = document.getElementById('user-email');
    if (nomeEl)  nomeEl.textContent  = user.user_metadata?.nome || user.email.split('@')[0];
    if (emailEl) emailEl.textContent = user.email;

    window.ccLogout = async () => {
      await sb.auth.signOut();
      window.location.replace('/contratos/login.html');
    };

    if (typeof window.__ccAuthReady._callback === 'function') {
      window.__ccAuthReady._callback(sb, session);
    }

  } catch(e) {
    console.error('[cc-auth] Exceção:', e);
    window.location.replace('/contratos/login.html');
  }
};

(function() {
  const s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
  s.onload  = () => window.__ccAuthReady();
  s.onerror = () => {
    console.error('[cc-auth] SDK não carregou');
    window.location.replace('/contratos/login.html');
  };
  document.head.appendChild(s);
})();
