/**
 * supabase-config.js — Orizon ATS
 * ─────────────────────────────────
 * Coloque este arquivo na RAIZ do projeto.
 * Todos os HTMLs que precisam do Supabase incluem:
 *   <script src="../supabase-config.js"></script>
 */

const ORIZON_SB_URL = 'https://zxivdljbpdpwijtporff.supabase.co';
const ORIZON_SB_KEY = 'sb_publishable_tLn7etguMZxi9k_AfxVU_Q_-Kei11r-';

// ─── Helpers globais ─────────────────────────────────────────────

function sbHeaders(extra = {}) {
  let token = ORIZON_SB_KEY;
  try {
    // Lê o contexto salvo pelo disc-admin.html (orizon_ctx_v3)
    const ctx = JSON.parse(localStorage.getItem('orizon_ctx_v3') || 'null');
    if (ctx && ctx.usuario && ctx.usuario.access_token) {
      token = ctx.usuario.access_token;
    }
  } catch(e) {}
  return {
    'apikey': ORIZON_SB_KEY,
    'Authorization': 'Bearer ' + token,
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
    // Lê o token da sessão ativa (salvo pelo disc-admin.html)
    let sb_token = ORIZON_SB_KEY;
    let usuario  = null;
    try {
      const ctx3 = JSON.parse(localStorage.getItem('orizon_ctx_v3') || 'null');
      if (ctx3 && ctx3.usuario && ctx3.usuario.access_token) {
        sb_token = ctx3.usuario.access_token;
        usuario  = ctx3.usuario;
      }
    } catch(e) {}

    const ctx = {
      sb_url   : ORIZON_SB_URL,
      sb_key   : ORIZON_SB_KEY,
      sb_token : sb_token,       // token autenticado quando disponível
      pipe_key : 'orizon_pipeline_v1',
      usuario  : usuario
    };
    localStorage.setItem('orizon_ctx_v1', JSON.stringify(ctx));
    try {
      window.parent.postMessage({
        tipo    : 'orizon_ctx',
        sb_url  : ORIZON_SB_URL,
        sb_key  : ORIZON_SB_KEY,
        sb_token: sb_token,
        usuario : usuario
      }, '*');
    } catch(e) {}
  } catch(e) {
    console.warn('supabase-config: não foi possível gravar orizon_ctx_v1', e);
  }
})();

window.ORIZON_SB_URL = ORIZON_SB_URL;
window.ORIZON_SB_KEY = ORIZON_SB_KEY;
window.sbHeaders  = sbHeaders;
window.sbGet      = sbGet;
window.sbPost     = sbPost;
window.sbPatch    = sbPatch;
window.sbDelete   = sbDelete;
