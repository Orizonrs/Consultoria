/**
 * cr-utils.js — Orizon Consultoria
 * Utilitários compartilhados entre TODAS as páginas.
 * Elimina a duplicação atual de maskCPF, clock, toast, etc.
 */

// ── Relógio da topbar ───────────────────────────────────────
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

// ── Toast ───────────────────────────────────────────────────
window.toast = function(msg, tipo = 'ok', dur = 3200) {
  let ct = document.getElementById('toast-ct');
  if (!ct) {
    ct = document.createElement('div');
    ct.id = 'toast-ct';
    document.body.appendChild(ct);
  }
  const el = document.createElement('div');
  el.className = `toast ${tipo}`;
  el.textContent = msg;
  ct.appendChild(el);
  setTimeout(() => el.remove(), dur);
};

// ── Máscaras de input ────────────────────────────────────────
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
  const digits = el.value.replace(/\D/g, '');
  if (digits.length <= 11) {
    maskCPF(el);
  } else {
    maskCNPJ(el);
  }
};

window.maskTel = function(el) {
  let v = el.value.replace(/\D/g, '');
  if (v.length <= 10) {
    v = v.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
  } else {
    v = v.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
  }
  el.value = v;
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

// ── Sidebar mobile ───────────────────────────────────────────
window.toggleSidebar = function() {
  document.querySelector('.sidebar')?.classList.toggle('mob-open');
  document.getElementById('mobOverlay')?.classList.toggle('open');
};
window.closeSidebar = function() {
  document.querySelector('.sidebar')?.classList.remove('mob-open');
  document.getElementById('mobOverlay')?.classList.remove('open');
};

// ── Preencher info do usuário na sidebar ─────────────────────
window.populateUser = function(user) {
  if (!user) return;
  const nm = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário';
  const el_nome  = document.getElementById('user-nome');
  const el_email = document.getElementById('user-email');
  const el_av    = document.getElementById('sb-av-init');
  if (el_nome)  el_nome.textContent  = nm;
  if (el_email) el_email.textContent = user.email || '';
  // Iniciais: primeira letra do primeiro nome + primeira letra do último sobrenome
  const partes = nm.trim().split(/\s+/);
  const iniciais = partes.length >= 2
    ? (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
    : partes[0].slice(0, 2).toUpperCase();
  if (el_av)    el_av.textContent = iniciais;
  return nm;
};

// ── Logout ───────────────────────────────────────────────────
window.doLogout = async function() {
  const loginUrl = window.location.href.replace(/\/[^/]*$/, '/login.html');
  try {
    if (window._sb) await window._sb.auth.signOut();
  } catch(e) { console.warn('logout error', e); }
  window.location.replace(loginUrl);
};

// ── Copiar para clipboard ────────────────────────────────────
window.copiarTexto = function(txt, btn) {
  navigator.clipboard.writeText(txt).then(() => {
    if (btn) { const o = btn.textContent; btn.textContent = '✅ Copiado!'; setTimeout(() => btn.textContent = o, 2000); }
  });
};

// ── Fechar sidebar ao clicar em link (mobile) ─────────────────
document.addEventListener('DOMContentLoaded', () => {
  startClock();
  document.querySelectorAll('.sb-item').forEach(el =>
    el.addEventListener('click', () => { if (window.innerWidth <= 768) closeSidebar(); })
  );
});
