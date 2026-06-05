/**
 * guard.js — Orizon ATS
 * Protege módulos contra acesso direto sem autenticação.
 * Coloque <script src="../guard.js"></script> como PRIMEIRA linha do <head>
 * em todos os HTMLs da pasta /modulos/
 */
(function () {
  var SESSION_KEY = 'orizon_session_v1';
  var AUTH_FLAG   = 'orizon_auth';
  var ADMIN_PATH  = '../login.html';

  function autenticado() {
    if (sessionStorage.getItem(AUTH_FLAG) === '1') return true;

    try {
      var raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return false;
      var s = JSON.parse(raw);
      // Expira em 8h
      if (Date.now() - s.ts > 8 * 60 * 60 * 1000) {
        localStorage.removeItem(SESSION_KEY);
        return false;
      }
      sessionStorage.setItem(AUTH_FLAG, '1');
      return true;
    } catch (e) {
      return false;
    }
  }

  if (!autenticado()) {
    try { sessionStorage.setItem('orizon_redirect', location.href); } catch(e) {}

    if (window.self !== window.top) {
      try { window.parent.postMessage({ tipo: 'orizon_logout' }, '*'); } catch(e) {}
    } else {
      location.replace(ADMIN_PATH);
    }

    document.addEventListener('DOMContentLoaded', function () {
      document.body.innerHTML = '';
    });
  }
})();
