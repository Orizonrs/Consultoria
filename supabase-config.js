/**
 * supabase-config.js — Orizon ATS
 * ─────────────────────────────────
 * Coloque este arquivo na RAIZ do projeto.
 * Todos os HTMLs que precisam do Supabase incluem:
 *   <script src="../supabase-config.js"></script>
 */

const ORIZON_SB_URL = 'https://zxivdljbpdpwijtporff.supabase.co';
const ORIZON_SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4aXZkbGpicGRwd2lqdHBvcmZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4OTEyNjEsImV4cCI6MjA5NzQ2NzI2MX0.hTbkdMCzdT-NjqpK7jVSykZ6ucdhucrLhISoC1_kDs0';

// ─── Helpers globais ─────────────────────────────────────────────

function sbHeaders(extra = {}) {
  return {
    'apikey': ORIZON_SB_KEY,
    'Authorization': 'Bearer ' + ORIZON_SB_KEY,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
    ...extra
  };
}

async function sbGet(tabela, query = '') {
  const url = `${ORIZON_SB_URL}/rest/v1/${tabela}${query ? '?' + query : ''}`;
  const r = await fetch(url, { headers: sbHeaders() });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

async function sbPost(tabela, dados) {
  const r = await fetch(`${ORIZON_SB_URL}/rest/v1/${tabela}`, {
    method: 'POST',
    headers: sbHeaders(),
    body: JSON.stringify(dados)
  });
  if (!r.ok) throw new Error(await r.text());
  const res = await r.json();
  return Array.isArray(res) ? res[0] : res;
}

async function sbPatch(tabela, id, dados) {
  const r = await fetch(`${ORIZON_SB_URL}/rest/v1/${tabela}?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: sbHeaders(),
    body: JSON.stringify(dados)
  });
  if (!r.ok) throw new Error(await r.text());
}

async function sbDelete(tabela, id) {
  const r = await fetch(`${ORIZON_SB_URL}/rest/v1/${tabela}?id=eq.${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: sbHeaders()
  });
  if (!r.ok) throw new Error(await r.text());
}

// ─── Propaga contexto para todos os módulos ───────────────────────
(function propagarCtx() {
  try {
    const ctx = { sb_url: ORIZON_SB_URL, sb_key: ORIZON_SB_KEY, pipe_key: 'orizon_pipeline_v1' };
    localStorage.setItem('orizon_ctx_v1', JSON.stringify(ctx));
    try {
      window.parent.postMessage({ tipo: 'orizon_ctx', sb_url: ORIZON_SB_URL, sb_key: ORIZON_SB_KEY }, '*');
    } catch(e) {}
  } catch(e) {
    console.warn('supabase-config: não foi possível gravar orizon_ctx_v1', e);
  }
})();

window.ORIZON_SB_URL = ORIZON_SB_URL;
window.ORIZON_SB_KEY = ORIZON_SB_KEY;
window.sbHeaders = sbHeaders;
window.sbGet     = sbGet;
window.sbPost    = sbPost;
window.sbPatch   = sbPatch;
window.sbDelete  = sbDelete;
