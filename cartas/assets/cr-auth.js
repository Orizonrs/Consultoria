/**
 * cr-auth.js — Orizon Consultoria
 * Inicializa Supabase e protege páginas autenticadas.
 */

const SB_URL = 'https://yunoxkembhskpnprffoi.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1bm94a2VtYmhza3BucHJmZm9pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5Nzg2MzksImV4cCI6MjA5NDU1NDYzOX0.WhkzrBCHThvJaMuLeo6oVPjrWvc_MvfCoyz9B90-Yms';

window._sb = supabase.createClient(SB_URL, SB_KEY);

// Página de login — redireciona para index.html se já logado
const isLoginPage = window.location.pathname.endsWith('login.html');

(async () => {
  const { data: { session } } = await window._sb.auth.getSession();

  if (isLoginPage) {
    if (session) {
      // Já está logado, vai para o hub
      window.location.replace('index.html');
    }
    return;
  }

  // Páginas protegidas — redireciona para login se não logado
  if (!session) {
    window.location.replace('login.html');
  }
})();
