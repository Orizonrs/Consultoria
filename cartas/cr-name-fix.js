/* ═══════════════════════════════════════════════════
   cr-name-fix.js — Exibe nome real na sidebar (sem e-mail)
   Incluir APÓS cr-auth.js e cr-utils.js em todas as páginas
   ═══════════════════════════════════════════════════ */

(function () {
  // Aguarda o DOM e o _sb estarem prontos, depois aplica o nome
  function applyName(user) {
    if (!user) return;

    // Tenta obter o nome em ordem de preferência
    const meta = user.user_metadata || {};
    const fullName =
      meta.full_name ||
      meta.name ||
      meta.display_name ||
      user.email?.split('@')[0] || // fallback: parte antes do @
      '—';

    // Capitaliza primeira letra de cada palavra
    const formatted = fullName
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');

    // Gera iniciais para o avatar (máx 2 letras)
    const parts = formatted.split(' ').filter(Boolean);
    const initials = parts.length >= 2
      ? parts[0][0] + parts[parts.length - 1][0]
      : (parts[0] || 'OR').slice(0, 2);

    // Atualiza todos os elementos na página
    document.querySelectorAll('#user-nome').forEach(el => {
      el.textContent = formatted;
    });
    document.querySelectorAll('#sb-av-init').forEach(el => {
      el.textContent = initials.toUpperCase();
    });
    // Mantém o e-mail hidden — mas atualiza o campo caso alguém precise
    document.querySelectorAll('#user-email').forEach(el => {
      el.textContent = user.email || '';
    });
  }

  // Tenta aplicar assim que _sb estiver disponível
  const interval = setInterval(async () => {
    if (!window._sb) return;
    clearInterval(interval);
    try {
      const { data: { user } } = await window._sb.auth.getUser();
      applyName(user);
    } catch (e) {
      console.warn('cr-name-fix: não foi possível obter usuário', e);
    }
  }, 80);
})();
