/** cr-shell.js — menu único, zonas AUTOMÁTICO × MANUAL, tema claro/escuro e rodapé do usuário.
 *  Item com 4º valor 1 = "em breve" (apagado, sem link): tire o 1 quando a tela existir. */
(function () {
  var MENU = [
    { g: 'Visão geral', items: [['index.html', '🏠', 'Painel Geral']] },
    { g: 'Cartas digitais', z: 'auto', zn: 'AUTOMÁTICO', zi: '⚡', zs: 'Cartas digitais · assinatura online', items: [
      ['index-cartas-digitais.html', '📁', 'Painel de Cartas Digitais', 1],
      ['nova-carta-digital.html', '➕', 'Nova Carta Digital', 1],
      ['index-cartas-digitais.html#aguardando', '⏳', 'Aguardando assinatura', 1],
      ['index-cartas-digitais.html#assinadas', '✅', 'Assinadas (arquivo)', 1],
      ['vencimentos.html', '🗓️', 'Vencimentos / validade', 1],
      ['empresas.html', '🏢', 'Empresas'],
      ['bancos.html', '🏦', 'Bancos / Agências'],
      ['clientes.html', '🧑', 'Clientes / Titulares']] },
    { g: 'Cartas em PDF', z: 'manual', zn: 'MANUAL', zi: '✋', zs: 'Cartas em PDF · você gera e entrega', items: [
      ['index-cartas.html', '📋', 'Painel de Cartas'],
      ['nova-carta.html', '✉️', 'Nova Carta (PDF imediato)'],
      ['modelos.html', '📝', 'Modelos de texto']] },
    { g: 'Conta', items: [['historico.html', '🕘', 'Histórico de acessos', 1], ['configuracoes.html', '⚙️', 'Configurações', 1]] }
  ];
  var H = location.hash;
  function act(u) { var p = u.split('#'), h = p[1] ? '#' + p[1] : ''; if (p[0] !== page) return false; return h ? H === h : (H !== '#aguardando' && H !== '#assinados'); }
  var ALIAS = { 'visualizar.html': 'index-cartas.html' };
  var page = location.pathname.split('/').pop() || 'index.html'; page = ALIAS[page] || page;
  function theme(t) { document.documentElement.setAttribute('data-theme', t); try { localStorage.setItem('cr_theme', t); } catch (e) {} }
  var saved = 'dark'; try { saved = localStorage.getItem('cr_theme') || 'dark'; } catch (e) {}
  document.documentElement.setAttribute('data-theme', saved);
  window.toggleTheme = function () {
    var t = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light'; theme(t);
    var b = document.getElementById('crThemeBtn'); if (b) b.textContent = t === 'light' ? '🌙 Modo escuro' : '☀️ Modo claro';
  };
  function render() {
    H = location.hash;
    var el = document.querySelector('aside.sidebar'); if (!el) return;
    var h = '<div class="sb-head"><div class="sb-logo"><img src="' + (window.CR_BRAND ? CR_BRAND.logo : '') + '" alt="' + (window.CR_BRAND ? CR_BRAND.nome : '') + '"/></div><div><div class="sb-name">' + (window.CR_BRAND ? CR_BRAND.marca : '') + ' <em>' + (window.CR_BRAND ? CR_BRAND.sufixo : '') + '</em></div><div class="sb-sub">' + (window.CR_BRAND ? CR_BRAND.sistema : '') + '</div></div></div><nav class="sb-nav">';
    var zona = '';
    MENU.forEach(function (g) { if (g.z && g.items.some(function (i) { return i[0].split('#')[0] === page; })) zona = g.z; });
    if (zona) document.documentElement.setAttribute('data-zone', zona); else document.documentElement.removeAttribute('data-zone');
    MENU.forEach(function (g) {
      var itens = '';
      g.items.forEach(function (i) { if (i[3]) { itens += '<span class="sb-item soon" aria-disabled="true" title="Em breve"><span class="sb-ico">' + i[1] + '</span>' + i[2] + '</span>'; return; } itens += '<a class="sb-item' + (act(i[0]) ? ' active' : '') + '" href="' + i[0] + '"><span class="sb-ico">' + i[1] + '</span>' + i[2] + '</a>'; });
      if (g.z) {
        // Zona AUTOMÁTICO / MANUAL: bloco próprio, com cor e cabeçalho (separação visual forte)
        h += '<div class="sb-zone z-' + g.z + '"><div class="sb-zhead"><span class="sb-zico">' + g.zi + '</span><div><div class="sb-zname">' + g.zn + '</div><div class="sb-zsub">' + g.zs + '</div></div></div>' + itens + '</div>';
      } else {
        h += '<div class="sb-sep">' + g.g + '</div>' + itens;
      }
    });
    var light = document.documentElement.getAttribute('data-theme') === 'light';
    h += '</nav><div class="sb-foot"><div class="sb-foot-user"><div class="sb-av" id="sb-av-init">OR</div><div class="sb-user-info"><div class="sb-uname" id="user-nome">—</div><div class="sb-uemail" id="user-email">—</div></div></div>' +
      '<button class="sb-theme" id="crThemeBtn" onclick="toggleTheme()">' + (light ? '🌙 Modo escuro' : '☀️ Modo claro') + '</button>' +
      '<button class="sb-logout" onclick="doLogout()" title="Sair"><span class="sb-logout-ico">⏻</span> Sair da conta</button></div>';
    el.innerHTML = h;
    var tbL = document.querySelector('.topbar .tb-left') || document.querySelector('.topbar');
    var velho = document.querySelector('.topbar .zone-pill'); if (velho) velho.parentNode.removeChild(velho);
    if (tbL && zona) { var pill = document.createElement('span'); pill.className = 'zone-pill z-' + zona; pill.textContent = zona === 'auto' ? '⚡ AUTOMÁTICO' : '✋ MANUAL'; tbL.appendChild(pill); }
    var t = setInterval(async function () {
      if (!window._sb) return; clearInterval(t);
      try { var r = await window._sb.auth.getUser(); if (r.data.user && window.populateUser) populateUser(r.data.user); } catch (e) { console.error('cr-shell', e); }
    }, 80);
  }
  window.addEventListener('hashchange', render);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render); else render();
})();
