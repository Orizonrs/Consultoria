/** cr-a11y.js — acessibilidade transversal (M18): foco visível, pular para o conteúdo, rótulos, aria-live e movimento reduzido.
 *  Incluir em toda página. Não altera o layout; só atributos e um <style> de foco. */
(function () {
  var css = document.createElement('style');
  css.textContent =
    ':focus-visible{outline:2px solid #60a5fa!important;outline-offset:2px!important}' +
    '.cr-skip{position:fixed;left:.6rem;top:-3rem;z-index:99999;background:#1d4ed8;color:#fff;padding:.5rem .9rem;border-radius:8px;font:700 .8rem Sora,sans-serif;text-decoration:none;transition:top .15s}' +
    '.cr-skip:focus{top:.6rem}' +
    '[tabindex="-1"]:focus{outline:none!important}' +
    '@media (prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important;scroll-behavior:auto!important}}';
  document.head.appendChild(css);

  var uid = 0;
  function run() {
    // pular para o conteúdo
    var main = document.querySelector('.content, main, .page-wrap');
    if (main && !document.getElementById('crSkip')) {
      if (!main.id) main.id = 'crMain';
      main.setAttribute('tabindex', '-1');
      var a = document.createElement('a'); a.id = 'crSkip'; a.className = 'cr-skip'; a.href = '#' + main.id; a.textContent = 'Pular para o conteúdo';
      a.addEventListener('click', function (e) { e.preventDefault(); main.focus(); });
      document.body.insertBefore(a, document.body.firstChild);
    }
    // navegação principal e página atual
    var sb = document.querySelector('aside.sidebar');
    if (sb) { sb.setAttribute('role', 'navigation'); sb.setAttribute('aria-label', 'Menu principal'); }
    document.querySelectorAll('.sb-item').forEach(function (i) {
      if (i.classList.contains('active')) i.setAttribute('aria-current', 'page'); else i.removeAttribute('aria-current');
    });
    // avisos (toast) lidos por leitores de tela
    var t = document.getElementById('toast-ct');
    if (t && !t.getAttribute('aria-live')) { t.setAttribute('role', 'status'); t.setAttribute('aria-live', 'polite'); }
    // botão de menu do celular
    document.querySelectorAll('.mob-menu-btn').forEach(function (b) { if (!b.getAttribute('aria-label')) b.setAttribute('aria-label', 'Abrir menu'); });
    // botões/links só com ícone: usa o title como nome
    document.querySelectorAll('button[title], a[title]').forEach(function (b) {
      if (!b.getAttribute('aria-label') && !b.textContent.replace(/[\s\u200d\ufe0f]/g, '').match(/[A-Za-zÀ-ÿ0-9]/)) b.setAttribute('aria-label', b.getAttribute('title'));
    });
    // rótulos sem "for": liga ao próximo campo do mesmo bloco
    document.querySelectorAll('label:not([for])').forEach(function (l) {
      if (l.querySelector('input,select,textarea')) return;
      var box = l.closest('.form-group') || l.parentElement; if (!box) return;
      var f = box.querySelector('input:not([type=hidden]):not([type=checkbox]):not([type=radio]),select,textarea');
      if (f && !f.getAttribute('aria-label')) { if (!f.id) f.id = 'crf' + (++uid); l.setAttribute('for', f.id); }
    });
    // assinatura desenhada: descreve a área e aponta a alternativa por teclado
    document.querySelectorAll('canvas').forEach(function (c) {
      if (!c.getAttribute('aria-label')) { c.setAttribute('role', 'img'); c.setAttribute('aria-label', 'Área de assinatura desenhada. Se preferir, use a opção de digitar o nome.'); }
    });
  }
  var timer;
  function agenda() { clearTimeout(timer); timer = setTimeout(run, 120); }
  function start() { run(); new MutationObserver(agenda).observe(document.body, { childList: true, subtree: true }); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
