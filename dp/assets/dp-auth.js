/* ═══════════════════════════════════════
   dp-auth.js — Orizon Consultoria · Auth Guard (v2)
   Protege as páginas do DP usando a MESMA sessão que o login.html grava
   (localStorage 'orizon_dp_session_v1', validade 8 h). Sem SDK, sem projeto
   Supabase aqui e sem caminho fixo: o login é sempre procurado na MESMA
   pasta da página atual (funciona em /dp/, /Consultoria/dp/ ou qualquer outra).
   ═══════════════════════════════════════ */
(function () {
  'use strict';
  var SESSION_KEY = 'orizon_dp_session_v1';
  var VALIDADE_MS = 8 * 60 * 60 * 1000;

  function lerSessao() {
    try {
      var s = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
      if (s && s.ts && s.access_token && (Date.now() - s.ts) < VALIDADE_MS) return s;
    } catch (e) {}
    return null;
  }

  function irParaLogin() {
    var arq = window.location.pathname.split('/').pop() || 'index.html';
    var volta = encodeURIComponent(arq + window.location.search);
    window.location.replace('login.html?next=' + volta);
  }

  var sessao = lerSessao();
  if (!sessao) { irParaLogin(); return; }

  window.dpSessao = sessao;
  window.dpLogout = function () {
    try { localStorage.removeItem(SESSION_KEY); } catch (e) {}
    window.location.replace('login.html');
  };

  function preencher() {
    var n = document.getElementById('user-nome');
    var e = document.getElementById('user-email');
    if (n) n.textContent = sessao.nome || (sessao.email || '').split('@')[0];
    if (e) e.textContent = sessao.email || '';
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', preencher);
  else preencher();
})();
