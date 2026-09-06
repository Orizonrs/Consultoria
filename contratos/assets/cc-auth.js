/* ════════════════════════════════════════════
   cc-auth.js — Orizon Consultoria
   Projeto Supabase: zxivdljbpdpwijtporff
   ════════════════════════════════════════════ */

const SUPABASE_URL      = 'https://zxivdljbpdpwijtporff.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4aXZkbGpicGRwd2lqdHBvcmZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4OTEyNjEsImV4cCI6MjA5NzQ2NzI2MX0.hTbkdMCzdT-NjqpK7jVSykZ6ucdhucrLhISoC1_kDs0';
const LOGIN_URL         = '/contratos/login.html';

document.documentElement.style.visibility = 'hidden';

window.__ccAuthReady = async function () {
  try {
    const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    window._sb = sb;

    // ── Sessão inicial ──
    const { data: { session } } = await sb.auth.getSession();
    if (!session) {
      const origem = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.replace(LOGIN_URL + '?next=' + origem);
      return;
    }

    // ── Expõe token para cc-core usar nos fetches (RLS) ──
    window._ccAccessToken = session.access_token;

    // ── Renova token automaticamente antes de expirar ──
    sb.auth.onAuthStateChange((event, newSession) => {
      if (event === 'TOKEN_REFRESHED' && newSession) {
        window._ccAccessToken = newSession.access_token;
      }
      if (event === 'SIGNED_OUT') {
        window.location.replace(LOGIN_URL);
      }
    });

    document.documentElement.style.visibility = 'visible';

    // ── Preenche nome/email no sidebar ──
    const user = session.user;
    const nomeEl  = document.getElementById('user-nome');
    const emailEl = document.getElementById('user-email');
    const nomeSalvo  = localStorage.getItem('ex_cc_nome_exibicao');
    const cargoSalvo = localStorage.getItem('ex_cc_cargo_exibicao');
    if (nomeEl)  nomeEl.textContent  = nomeSalvo  || user.user_metadata?.nome || user.email.split('@')[0];
    if (emailEl) emailEl.textContent = cargoSalvo || user.email;

    // ── Logout global ──
    window.ccLogout = async () => {
      await sb.auth.signOut();
      window.location.replace(LOGIN_URL);
    };

    // ── Dispara init do core após auth confirmado ──
    if (typeof CC !== 'undefined') {
      CC.init().catch(e => console.error('[CC] init falhou:', e));
    }

  } catch (e) {
    console.error('[cc-auth] Exceção:', e);
    window.location.replace(LOGIN_URL);
  }
};

// ── Roda auth assim que o script é lido ──
// IMPORTANTE: o SDK do Supabase (supabase.min.js) precisa ser carregado
// via <script> normal e bloqueante, ANTES desta tag, no <head> de cada
// página protegida — igual já é feito no login.html. Isso evita a
// "corrida" entre o carregamento dinâmico do SDK e a checagem de sessão,
// que era a causa do flash pelo login.html ao abrir o index.html.
if (window.supabase) {
  window.__ccAuthReady();
} else {
  console.error('[cc-auth] SDK do Supabase não encontrado — adicione a tag <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script> no <head>, ANTES do cc-auth.js.');
  window.location.replace(LOGIN_URL);
}
