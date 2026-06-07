/**
 * cr-utils.js — Orizon Consultoria
 * Utilitários compartilhados entre TODAS as páginas.
 */

const _DISPLAY_NAME_KEY = 'cr_display_name';

// ── Iniciais ─────────────────────────────────────────────────
function _iniciais(nm) {
  const p = nm.trim().split(/\s+/);
  return p.length >= 2
    ? (p[0][0] + p[p.length - 1][0]).toUpperCase()
    : p[0].slice(0, 2).toUpperCase();
}

// ── Aplica nome + iniciais na sidebar ────────────────────────
function _aplicarNome(nome) {
  const elNome = document.getElementById('user-nome');
  const elAv   = document.getElementById('sb-av-init');
  if (elNome) elNome.textContent = nome;
  if (elAv)   elAv.textContent   = _iniciais(nome);
}

// ── Anexa clique no nome para editar (chama sempre) ──────────
function _bindEditarNome() {
  const el = document.getElementById('user-nome');
  if (!el || el._crBound) return;
  el._crBound = true;
  el.title  = 'Clique para alterar seu nome';
  el.style.cursor = 'pointer';
  el.addEventListener('click', window.editDisplayName);
}

// ── Editar nome de exibição ───────────────────────────────────
window.editDisplayName = function() {
  const atual = localStorage.getItem(_DISPLAY_NAME_KEY) || '';
  const novo  = window.prompt('Como você quer ser chamado(a)?', atual);
  if (novo === null) return;
  const trimmed = novo.trim();
  if (trimmed) {
    localStorage.setItem(_DISPLAY_NAME_KEY, trimmed);
    _aplicarNome(trimmed);
  } else {
    localStorage.removeItem(_DISPLAY_NAME_KEY);
    // Volta para nome do Supabase
    if (window._sb) {
      window._sb.auth.getUser().then(({ data: { user } }) => {
        const nm = user?.user_metadata?.full_name
                || user?.user_metadata?.name
                || user?.email?.split('@')[0]
                || 'Usuário';
        _aplicarNome(nm);
      });
    }
  }
};

// ── Relógio da topbar ────────────────────────────────────────
window.startClock = function(elId = 'tb-clock') {
  const el = document.getElementById(elId);
  if (!el) return;
  const update = () => {
    const n = new Date();
    el.textContent =
      n.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' }) +
      ' · ' +
      n.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };
  update();
  setInterval(update, 10000);
};

// ── Toast ────────────────────────────────────────────────────
window.toast = function(msg, tipo = 'ok', dur = 3200) {
  let ct = document.getElementById('toast-ct');
  if (!ct) { ct = document.createElement('div'); ct.id = 'toast-ct'; document.body.appendChild(ct); }
  const el = document.createElement('div');
  el.className = `toast ${tipo}`;
  el.textContent = msg;
  ct.appendChild(el);
  setTimeout(() => el.remove(), dur);
};

// ── Máscaras ─────────────────────────────────────────────────
window.maskCPF = function(el) {
  let v = el.value.replace(/\D/g, '');
  v = v.replace(/(\d{3})(\d)/, '$1.$2')
       .replace(/(\d{3})(\d)/, '$1.$2')
       .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  el.value = v;
};
window.maskCNPJ = function(el) {
  let v = el.value.replace(/\D/g, '');
  v = v.replace(/(\d{2})(\d)/, '$1.$2')
       .replace(/(\d{3})(\d)/, '$1.$2')
       .replace(/(\d{3})(\d)/, '$1/$2')
       .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
  el.value = v;
};
window.maskCPFouCNPJ = function(el) {
  if (el.value.replace(/\D/g, '').length <= 11) maskCPF(el); else maskCNPJ(el);
};
window.maskTel = function(el) {
  let v = el.value.replace(/\D/g, '');
  el.value = v.length <= 10
    ? v.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3')
    : v.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
};

// ── Formatadores ─────────────────────────────────────────────
window.fmtDate = function(d) {
  if (!d) return '—';
  const dt = new Date(d.includes('T') ? d : d + 'T12:00:00');
  if (isNaN(dt)) return '—';
  return dt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
};
window.fmtDateShort = function(d) {
  if (!d) return '—';
  const dt = new Date(d.includes('T') ? d : d + 'T12:00:00');
  if (isNaN(dt)) return '—';
  return dt.toLocaleDateString('pt-BR');
};
window.fmtDateTime = function(d) {
  if (!d) return '—';
  const dt = new Date(d.includes(' ') ? d.replace(' ', 'T') : d);
  if (isNaN(dt)) return '—';
  return dt.toLocaleString('pt-BR');
};
window.fmtBRL = function(v) {
  if (v === null || v === undefined || v === '') return '—';
  return 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
};

// ── Sidebar mobile ────────────────────────────────────────────
window.toggleSidebar = function() {
  document.querySelector('.sidebar')?.classList.toggle('mob-open');
  document.getElementById('mobOverlay')?.classList.toggle('open');
};
window.closeSidebar = function() {
  document.querySelector('.sidebar')?.classList.remove('mob-open');
  document.getElementById('mobOverlay')?.classList.remove('open');
};

// ── populateUser — respeita nome customizado ──────────────────
window.populateUser = function(user) {
  if (!user) return;
  // Nome customizado tem prioridade máxima
  const saved = localStorage.getItem(_DISPLAY_NAME_KEY);
  const nm = (saved && saved.trim())
    ? saved.trim()
    : (user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Usuário');

  _aplicarNome(nm);
  // Atualiza email (hidden no CSS, mas mantém o dado)
  const elEmail = document.getElementById('user-email');
  if (elEmail) elEmail.textContent = user.email || '';
  // Anexa clique para editar
  _bindEditarNome();
  return nm;
};

// ── Logout ────────────────────────────────────────────────────
window.doLogout = async function() {
  const loginUrl = window.location.href.replace(/\/[^/]*$/, '/login.html');
  try { if (window._sb) await window._sb.auth.signOut(); } catch(e) {}
  window.location.replace(loginUrl);
};

// ── Copiar para clipboard ─────────────────────────────────────
window.copiarTexto = function(txt, btn) {
  navigator.clipboard.writeText(txt).then(() => {
    if (btn) { const o = btn.textContent; btn.textContent = '✅ Copiado!'; setTimeout(() => btn.textContent = o, 2000); }
  });
};

// ── Preenche nome IMEDIATAMENTE (sem esperar Supabase) ────────
(function preencherImediato() {
  try {
    // 1. Nome customizado salvo
    const saved = localStorage.getItem(_DISPLAY_NAME_KEY);
    if (saved && saved.trim()) {
      _aplicarNome(saved.trim());
      return; // já temos o nome, não precisa ler o token
    }
    // 2. Fallback: lê sessão do localStorage do Supabase
    let raw = null;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('sb-') && k.endsWith('-auth-token')) { raw = localStorage.getItem(k); break; }
    }
    if (!raw) raw = localStorage.getItem('supabase.auth.token');
    if (!raw) return;
    const session = JSON.parse(raw);
    const user = session?.user || session;
    if (!user) return;
    const nm = user.user_metadata?.full_name
            || user.user_metadata?.name
            || user.email?.split('@')[0] || '';
    if (nm) _aplicarNome(nm);
  } catch(e) {}
})();

// ── DOMContentLoaded: relógio + clique no nome ────────────────
document.addEventListener('DOMContentLoaded', () => {
  startClock();

  // Aplica nome customizado (sobrescreve qualquer coisa já na tela)
  const saved = localStorage.getItem(_DISPLAY_NAME_KEY);
  if (saved && saved.trim()) _aplicarNome(saved.trim());

  // Anexa clique para editar nome
  _bindEditarNome();

  // Fecha sidebar mobile ao clicar em link
  document.querySelectorAll('.sb-item').forEach(el =>
    el.addEventListener('click', () => { if (window.innerWidth <= 768) closeSidebar(); })
  );
});
