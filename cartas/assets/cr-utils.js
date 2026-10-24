/**
 * cr-utils.js — Orizon Consultoria e Gestão
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
  if (!ct) { ct = document.createElement('div'); ct.id = 'toast-ct'; ct.setAttribute('role', 'status'); ct.setAttribute('aria-live', 'polite'); document.body.appendChild(ct); }
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
  try { if (window._sb) { try { await window._sb.rpc('cr_log', { p_acao: 'logout' }); } catch (e) {} await window._sb.auth.signOut(); } } catch(e) {}
  try { localStorage.removeItem('orizon_dp_session_v1'); } catch(e) {}
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

// ── Validadores (RN-08) ───────────────────────────────────────
window.validarCPF = function(v) {
  v = String(v || '').replace(/\D/g, '');
  if (v.length !== 11 || /^(\d)\1{10}$/.test(v)) return false;
  for (let t = 9; t < 11; t++) {
    let s = 0; for (let i = 0; i < t; i++) s += v[i] * (t + 1 - i);
    if (((s * 10) % 11) % 10 != v[t]) return false;
  }
  return true;
};
window.validarCNPJ = function(v) {
  v = String(v || '').replace(/\D/g, '');
  if (v.length !== 14 || /^(\d)\1{13}$/.test(v)) return false;
  for (let t = 12; t < 14; t++) {
    let s = 0, p = t - 7;
    for (let i = 0; i < t; i++) { s += v[i] * p--; if (p < 2) p = 9; }
    if (((s % 11) < 2 ? 0 : 11 - (s % 11)) != v[t]) return false;
  }
  return true;
};
// ── Envio de link por e-mail (EmailJS, config em cr-config.js) ─
window.btnEmailAssinatura = function(s, titulo, url) {
  if (!s.email) return '';
  const e = x => String(x || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  return `<button class="btn btn-ghost btn-sm" style="font-size:.63rem" onclick="enviarEmailAssinatura(this)" data-email="${e(s.email)}" data-nome="${e(s.nome)}" data-titulo="${e(titulo)}" data-url="${e(url)}" data-expira="${e(s.expira_em || '')}">✉️ E-mail</button>`;
};
// ── R19 (M2/M11): validade do link de assinatura ─
window.linkValidade = function(expiraEm, agora) {
  if (!expiraEm) return { estado: 'sem_prazo', dias: null, rotulo: 'sem prazo definido' };
  const fim = new Date(expiraEm), ref = agora ? new Date(agora) : new Date();
  if (isNaN(fim) || isNaN(ref)) return { estado: 'sem_prazo', dias: null, rotulo: 'sem prazo definido' };
  const ms = fim - ref, dt = fim.toLocaleDateString('pt-BR');
  if (ms <= 0) return { estado: 'expirado', dias: 0, rotulo: 'expirado em ' + dt };
  if (ms < 86400000) return { estado: 'vencendo', dias: 1, rotulo: 'expira em menos de 24 h (' + dt + ')' };
  const dias = Math.ceil(ms / 86400000);
  return { estado: dias <= 3 ? 'vencendo' : 'ok', dias, rotulo: 'expira em ' + dias + ' dias (' + dt + ')' };
};
window.CR_ERROS_LINK = { dias_invalido: 'Prazo inválido (use de 1 a 60 dias).', signatario_inexistente: 'Signatário não encontrado.',
  cancelado: 'Contrato cancelado: os links estão desativados.', ja_assinado: 'Este signatário já assinou.', ja_recusado: 'Este signatário recusou a assinatura.' };
window.renovarLink = async function(signatarioId, dias, novoToken) {
  try {
    const { data, error } = await window._sb.rpc('cr_renovar_link', { p_signatario: signatarioId, p_dias: dias, p_novo_token: !!novoToken });
    if (error) { console.error('cr_renovar_link', error); return { erro: /function|schema cache|PGRST202/i.test(error.message || '') ? 'Função cr_renovar_link não existe no banco: rode sql/cr-schema.sql (R19).' : (error.message || 'Falha ao renovar o link.') }; }
    if (data && data.erro) return { erro: window.CR_ERROS_LINK[data.erro] || data.erro };
    return data;
  } catch (e) { console.error('renovarLink', e); return { erro: 'Falha ao renovar o link.' }; }
};
window.CR_ERROS_LINK.contrato_assinado = 'Contrato já assinado por todos: nada a reabrir.';
window.CR_ERROS_LINK.nao_recusado = 'Este signatário não está com a assinatura recusada.';
// R20 (M12): reabrir quem recusou (link novo + prazo). A regra mora no servidor (cr_reabrir_signatario).
window.reabrirSignatario = async function(signatarioId, dias) {
  try {
    const { data, error } = await window._sb.rpc('cr_reabrir_signatario', { p_signatario: signatarioId, p_dias: dias });
    if (error) { console.error('cr_reabrir_signatario', error); return { erro: /function|schema cache|PGRST202/i.test(error.message || '') ? 'Função cr_reabrir_signatario não existe no banco: rode sql/cr-schema.sql (R20).' : (error.message || 'Falha ao reabrir.') }; }
    if (data && data.erro) return { erro: window.CR_ERROS_LINK[data.erro] || data.erro };
    return data;
  } catch (e) { console.error('reabrirSignatario', e); return { erro: 'Falha ao reabrir.' }; }
};
// R20 (M12): o que se copia ao duplicar um contrato. NÃO copia dados do candidato (nome, CPF, e-mail, matrícula), número, datas de início/fim nem status.
// Copia tipo, empresa, curso/instituição, valores, supervisor, atividades e os signatários que não são Orizon nem candidato.
window.contratoParaDuplicar = function(c, sigs) {
  if (!c) return null;
  const campos = {}; ['cargo', 'curso', 'semestre', 'instituicao', 'empresa', 'cnpj_empresa', 'endereco_emp', 'jornada_horas', 'valor_bolsa', 'valor_vt', 'apolice_seguro', 'supervisor_nome', 'supervisor_cargo', 'atividades_plano']
    .forEach(k => { if (c[k] != null && c[k] !== '') campos[k] = String(c[k]); });
  return { tipo: c.tipo === 'clt' ? 'clt' : 'estagio', campos,
    signatarios: (sigs || []).filter(s => s.contrato_id === c.id && s.papel !== 'candidato' && s.papel !== 'empresa_nexus').map(s => ({ nome: s.nome, email: s.email || '', papel: s.papel })) };
};
// R28 (M7): empresas já usadas. Monta a lista de empresas a partir dos contratos anteriores (sem tabela nova): uma entrada por empresa,
// com os dados do contrato MAIS RECENTE. Chave = dígitos do CNPJ (se tiver) ou o nome em minúsculas, sem espaços duplicados.
window.empresasRecentes = function(contratos, max) {
  const norm = x => String(x == null ? '' : x).replace(/\s+/g, ' ').trim();
  const rows = (contratos || []).filter(c => c && norm(c.empresa))
    .sort((a, b) => String(b.criado_em || '').localeCompare(String(a.criado_em || '')));
  const vistos = {}, out = [];
  rows.forEach(c => {
    const nome = norm(c.empresa), dig = norm(c.cnpj_empresa).replace(/\D/g, '');
    const chave = dig.length === 14 ? 'c' + dig : 'n' + nome.toLowerCase();
    if (vistos[chave]) return; vistos[chave] = 1;
    out.push({ empresa: nome, cnpj_empresa: norm(c.cnpj_empresa), endereco_emp: norm(c.endereco_emp), supervisor_nome: norm(c.supervisor_nome), supervisor_cargo: norm(c.supervisor_cargo) });
  });
  return out.slice(0, max || 60);
};
// Acha a empresa pelo nome digitado/escolhido (igual, sem diferenciar maiúscula nem espaços duplicados). Nome parcial NÃO casa.
window.empresaPorNome = function(lista, nome) {
  const n = String(nome == null ? '' : nome).replace(/\s+/g, ' ').trim().toLowerCase();
  if (!n) return null;
  return (lista || []).find(e => String(e.empresa).toLowerCase() === n) || null;
};
// Campos que a escolha de uma empresa PODE preencher: só os que estão vazios no formulário (nunca troca o que foi digitado).
window.camposDaEmpresa = function(emp, atuais) {
  const r = {}; if (!emp) return r;
  ['cnpj_empresa', 'endereco_emp', 'supervisor_nome', 'supervisor_cargo'].forEach(k => {
    if (emp[k] && !String((atuais || {})[k] || '').trim()) r[k] = emp[k];
  });
  return r;
};
// R30 (M7): cadastro de empresas (tabela cr_empresas). Funções puras.
window.formatarCNPJ = function(v) { const d = String(v == null ? '' : v).replace(/\D/g, ''); return d.length === 14 ? d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5') : String(v == null ? '' : v); };
window.chaveEmpresa = function(nome, cnpj) {
  const d = String(cnpj == null ? '' : cnpj).replace(/\D/g, ''), n = String(nome == null ? '' : nome).replace(/\s+/g, ' ').trim().toLowerCase();
  return d.length === 14 ? 'c' + d : (n ? 'n' + n : '');
};
// linha de cr_empresas -> o mesmo formato de empresasRecentes
window.empresaDoCadastro = function(r) {
  r = r || {};
  return { empresa: String(r.razao_social || '').trim(), cnpj_empresa: window.formatarCNPJ(r.cnpj || ''), endereco_emp: String(r.endereco || '').trim(), supervisor_nome: String(r.supervisor_nome || '').trim(), supervisor_cargo: String(r.supervisor_cargo || '').trim() };
};
// Lista do Novo Contrato: 1º as empresas ATIVAS do cadastro; depois as dos contratos que NÃO estão no cadastro. Empresa INATIVA no cadastro não é sugerida
// (nem pela versão dos contratos). "Está no cadastro" = mesmo CNPJ ou mesmo nome.
window.mesclarEmpresas = function(cadastro, recentes) {
  const lista = cadastro || [], ocupados = new Set();
  lista.forEach(r => { const k1 = window.chaveEmpresa(r.razao_social, r.cnpj), k2 = window.chaveEmpresa(r.razao_social, ''); if (k1) ocupados.add(k1); if (k2) ocupados.add(k2); });
  const doCad = lista.filter(r => r && r.ativo !== false && String(r.razao_social || '').trim()).map(window.empresaDoCadastro);
  const sobra = (recentes || []).filter(e => e && ![window.chaveEmpresa(e.empresa, e.cnpj_empresa), window.chaveEmpresa(e.empresa, '')].some(k => k && ocupados.has(k)));
  return doCad.concat(sobra);
};
// Empresas dos contratos que ainda NÃO estão no cadastro, prontas para inserir. CNPJ inválido (dado antigo) é descartado em vez de barrar a importação.
window.empresasParaImportar = function(recentes, cadastro) {
  const ocupados = new Set(); (cadastro || []).forEach(r => { [window.chaveEmpresa(r.razao_social, r.cnpj), window.chaveEmpresa(r.razao_social, '')].forEach(k => { if (k) ocupados.add(k); }); });
  const vistos = new Set(), out = [];
  (recentes || []).forEach(e => {
    if (!e || !String(e.empresa || '').trim()) return;
    const cnpjOk = e.cnpj_empresa && window.validarCNPJ(e.cnpj_empresa);
    const ks = [window.chaveEmpresa(e.empresa, cnpjOk ? e.cnpj_empresa : ''), window.chaveEmpresa(e.empresa, '')];
    if (ks.some(k => k && (ocupados.has(k) || vistos.has(k)))) return;
    ks.forEach(k => k && vistos.add(k));
    out.push({ razao_social: e.empresa, cnpj: cnpjOk ? String(e.cnpj_empresa).replace(/\D/g, '') : null, endereco: e.endereco_emp || null, supervisor_nome: e.supervisor_nome || null, supervisor_cargo: e.supervisor_cargo || null, _cnpjDescartado: !!(e.cnpj_empresa && !cnpjOk) });
  });
  return out;
};
// Texto amigável para o erro do banco ao salvar (códigos do PostgreSQL)
window.erroEmpresa = function(err) {
  const m = String((err && (err.message || '')) || ''), c = err && err.code;
  if (c === '23505' && /cnpj/i.test(m)) return 'Já existe uma empresa cadastrada com este CNPJ.';
  if (c === '23505') return 'Já existe uma empresa cadastrada com este nome (sem CNPJ).';
  if (c === '23514' && /CNPJ/.test(m)) return 'CNPJ inválido: confira os dígitos.';
  if (c === '23514') return 'A razão social é obrigatória.';
  if (c === '42P01' || (/cr_empresas/.test(m) && /does not exist|não existe|schema cache/i.test(m))) return 'A tabela de empresas ainda não existe: rode sql/cr-schema.sql (R30).';
  return 'Não foi possível salvar a empresa.';
};
// R31 (M7): cadastro de instituições de ensino (tabela cr_instituicoes). Funções puras. O contrato só guarda o NOME da instituição (campo texto), então a sugestão serve para padronizar o nome.
const _normNome = x => String(x == null ? '' : x).replace(/\s+/g, ' ').trim();
// Instituições já usadas nos contratos de estágio (uma por nome, sem diferenciar maiúscula/espaços; vale a grafia do contrato MAIS RECENTE)
window.instituicoesRecentes = function(contratos, max) {
  const rows = (contratos || []).filter(c => c && _normNome(c.instituicao))
    .sort((a, b) => String(b.criado_em || '').localeCompare(String(a.criado_em || '')));
  const vistos = {}, out = [];
  rows.forEach(c => { const nome = _normNome(c.instituicao), k = nome.toLowerCase(); if (vistos[k]) return; vistos[k] = 1; out.push({ instituicao: nome }); });
  return out.slice(0, max || 60);
};
// linha de cr_instituicoes -> formato da lista do Novo Contrato
window.instituicaoDoCadastro = function(r) { r = r || {}; return { instituicao: _normNome(r.nome), cnpj: window.formatarCNPJ(r.cnpj || ''), endereco: String(r.endereco || '').trim() }; };
// Lista do Novo Contrato: 1º as instituições ATIVAS do cadastro; depois as dos contratos que NÃO estão no cadastro. INATIVA no cadastro não é sugerida (nem pela versão dos contratos, que casa pelo nome).
window.mesclarInstituicoes = function(cadastro, recentes) {
  const lista = cadastro || [], ocupados = new Set();
  lista.forEach(r => { const k = window.chaveEmpresa(r.nome, ''); if (k) ocupados.add(k); });
  const doCad = lista.filter(r => r && r.ativo !== false && _normNome(r.nome)).map(window.instituicaoDoCadastro);
  const sobra = (recentes || []).filter(e => e && _normNome(e.instituicao) && !ocupados.has(window.chaveEmpresa(e.instituicao, '')));
  return doCad.concat(sobra);
};
// Instituições dos contratos que ainda NÃO estão no cadastro, prontas para inserir (só o nome: os contratos não guardam CNPJ nem endereço da instituição)
window.instituicoesParaImportar = function(recentes, cadastro) {
  const ocupados = new Set(); (cadastro || []).forEach(r => { const k = window.chaveEmpresa(r.nome, ''); if (k) ocupados.add(k); });
  const vistos = new Set(), out = [];
  (recentes || []).forEach(e => {
    if (!e || !_normNome(e.instituicao)) return;
    const k = window.chaveEmpresa(e.instituicao, ''); if (!k || ocupados.has(k) || vistos.has(k)) return;
    vistos.add(k); out.push({ nome: _normNome(e.instituicao), cnpj: null, endereco: null });
  });
  return out;
};
// Texto amigável para o erro do banco ao salvar uma instituição (códigos do PostgreSQL)
window.erroInstituicao = function(err) {
  const m = String((err && (err.message || '')) || ''), c = err && err.code;
  if (c === '23505' && /cnpj/i.test(m)) return 'Já existe uma instituição cadastrada com este CNPJ.';
  if (c === '23505') return 'Já existe uma instituição cadastrada com este nome (sem CNPJ).';
  if (c === '23514' && /CNPJ/.test(m)) return 'CNPJ inválido: confira os dígitos.';
  if (c === '23514') return 'O nome da instituição é obrigatório.';
  if (c === '42P01' || (/cr_instituicoes/.test(m) && /does not exist|não existe|schema cache/i.test(m))) return 'A tabela de instituições ainda não existe: rode sql/cr-schema.sql (R31).';
  return 'Não foi possível salvar a instituição.';
};
// R33 (M5): perfis de acesso. A REGRA É DO SERVIDOR (RLS); estas funções só evitam mostrar um botão/ação que o servidor recusaria.
// Se a função cr_meu_perfil não existir (SQL da R33 ainda não rodado) ou falhar, vale 'admin' = comportamento de antes (a tela não bloqueia; o servidor decide).
let _crPerfil = null;
window.crPerfil = async function() {
  if (_crPerfil) return _crPerfil;
  try { const { data, error } = await window._sb.rpc('cr_meu_perfil'); _crPerfil = (!error && data === 'operador') ? 'operador' : 'admin'; }
  catch (e) { _crPerfil = 'admin'; }
  return _crPerfil;
};
window.ehAdmin = async function() { return (await window.crPerfil()) === 'admin'; };
window.exigirAdmin = async function(acao) { if (await window.ehAdmin()) return true; window.toast('Somente administradores podem ' + acao + '.', 'err'); return false; };
// R45: avisos de COERÊNCIA do recesso (só avisa, nunca bloqueia nem altera o número; não interpreta a lei, só compara o que a pessoa digitou).
// d = { recesso_inicio, recesso_fim, dias_recesso, periodo_inicio, periodo_fim } com datas 'AAAA-MM-DD' ou vazio. Devolve uma lista de textos (vazia = nada a avisar).
window.recessoAvisos = function(d) {
  d = d || {}; const out = [];
  const T = x => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(x || ''); if (!m) return null; const t = Date.UTC(+m[1], +m[2] - 1, +m[3]); const q = new Date(t); return (q.getUTCMonth() === +m[2] - 1 && q.getUTCDate() === +m[3]) ? t : null; };
  const ri = T(d.recesso_inicio), rf = T(d.recesso_fim), pi = T(d.periodo_inicio), pf = T(d.periodo_fim);
  const dias = parseInt(d.dias_recesso, 10);
  if (ri !== null && rf !== null) {
    if (rf < ri) out.push('O fim do recesso é anterior ao início. Confira as datas.');
    else {
      const corr = Math.round((rf - ri) / 86400000) + 1;
      if (dias >= 1 && corr !== dias) out.push('O período informado tem ' + corr + ' dia(s) corrido(s), mas o campo "Nº de dias" está em ' + dias + '. Confira (a carta usa o número do campo).');
    }
  }
  if (pi !== null && pf !== null && pf >= pi) {
    if (ri !== null && ri < pi) out.push('O recesso começa antes do início do contrato.');
    if (rf !== null && rf > pf) out.push('O recesso termina depois do fim do contrato.');
  }
  return out;
};
// R43/R44 (M6): lembrete mensal da retenção LGPD — UMA regra para Configurações e Painel Geral. SÓ LÊ (nenhuma escrita, nenhum rpc).
// Olha a data da última 'retencao_aplicada' no cr_log. Devolve { texto, vencido } ou null (erro/permissão/data inválida => não inventa).
// vencido = true quando nunca foi aplicada ou já passou o prazo (RET_LEMBRETE_DIAS, inclusive).
window.RET_LEMBRETE_DIAS = 30;
window.retLembreteTexto = function(ultima, agora) {
  const L = window.RET_LEMBRETE_DIAS;
  if (!ultima) return { vencido: true, texto: '🔔 Lembrete: a retenção ainda não foi aplicada (nenhum registro no histórico). Revise o que entra com "Ver o que entra" ao menos uma vez por mês.' };
  const t = new Date(ultima).getTime(); if (isNaN(t)) return null;
  const dias = Math.floor(((agora || Date.now()) - t) / 86400000);
  if (dias >= L) return { vencido: true, texto: '🔔 Lembrete: a última retenção aplicada foi há ' + dias + ' dia(s). Está na hora de revisar com "Ver o que entra".' };
  return { vencido: false, texto: 'Última retenção aplicada há ' + Math.max(dias, 0) + ' dia(s). Próxima revisão sugerida em ' + (L - Math.max(dias, 0)) + ' dia(s).' };
};
window.retLembreteBuscar = async function() {
  try {
    const { data, error } = await window._sb.from('cr_log').select('criado_em').eq('acao', 'retencao_aplicada').order('criado_em', { ascending: false }).limit(1);
    if (error || !Array.isArray(data)) return null;
    return window.retLembreteTexto(data[0] && data[0].criado_em);
  } catch (e) { return null; }
};
window.erroPerfil = function(err) {
  const k = err && err.code;
  if (k === '42501') return 'Somente administradores podem definir perfis.';
  if (k === '23514') return 'Não é possível remover o último administrador.';
  if (k === '22023') return 'Usuário não encontrado: ele precisa existir em Authentication (Supabase) e o e-mail deve estar certo.';
  if (k === '42883' || k === '42P01' || k === 'PGRST202') return 'Os perfis ainda não existem: rode sql/cr-schema.sql (R33).';
  return 'Não foi possível definir o perfil.';
};
// R34 (M6): retenção e pedidos do titular (LGPD). As funções do servidor só aceitam administrador; aqui só traduzimos a resposta. NUNCA põe CPF em mensagem.
window.erroRetencao = function(err, json) {
  const k = (json && json.erro) || (err && err.code);
  if (k === 'meses_invalido') return 'Informe um prazo entre 6 e 240 meses.';
  if (k === 'cpf_invalido') return 'CPF inválido: confira os dígitos.';
  if (k === '42501') return 'Somente administradores podem fazer isto.';
  if (k === '42883' || k === '42P01' || k === 'PGRST202') return 'Esta função ainda não existe: rode sql/cr-schema.sql (R34).';
  return 'Não foi possível concluir. Nada foi alterado além do que a mensagem anterior informou.';
};
// R32 (M7): cadastro de candidatos (tabela cr_candidatos). Funções puras. Contém DADO PESSOAL: nada daqui vai para URL, log ou rascunho.
window.formatarCPF = function(v) { const d = String(v == null ? '' : v).replace(/\D/g, ''); return d.length === 11 ? d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4') : String(v == null ? '' : v); };
// CPF para LISTAS: só os 6 dígitos do meio ficam visíveis (***.456.789-**). CPF incompleto/ausente não é "adivinhado": devolve vazio.
window.mascararCPF = function(v) { const d = String(v == null ? '' : v).replace(/\D/g, ''); return d.length === 11 ? '***.' + d.slice(3, 6) + '.' + d.slice(6, 9) + '-**' : ''; };
// linha de cr_candidatos -> ids dos campos do formulário do Novo Contrato
window.candidatoDoCadastro = function(r) {
  r = r || {}; const t = x => String(x == null ? '' : x).replace(/\s+/g, ' ').trim();
  return { nome_candidato: t(r.nome), cpf: window.formatarCPF(r.cpf || ''), email_candidato: t(r.email), curso: t(r.curso), semestre: t(r.semestre), instituicao: t(r.instituicao), matricula: t(r.matricula) };
};
// Candidatos cujo nome é IGUAL ao digitado (sem diferenciar maiúscula/espaços duplicados). Nome parcial NÃO casa. Devolve a lista: 0 = nenhum, 1 = achou, 2+ = homônimos.
window.candidatosPorNome = function(lista, nome) {
  const n = String(nome == null ? '' : nome).replace(/\s+/g, ' ').trim().toLowerCase(); if (!n) return [];
  return (lista || []).filter(r => r && String(r.nome || '').replace(/\s+/g, ' ').trim().toLowerCase() === n);
};
// Campos que a escolha de um candidato PODE preencher: só os vazios no formulário (nunca troca o que foi digitado). O nome não entra (já foi digitado).
window.camposDoCandidato = function(cand, atuais) {
  const out = {}; if (!cand) return out; const f = window.candidatoDoCadastro(cand);
  ['cpf', 'email_candidato', 'curso', 'semestre', 'instituicao', 'matricula'].forEach(k => { if (f[k] && !String((atuais || {})[k] || '').trim()) out[k] = f[k]; });
  return out;
};
// Texto amigável para o erro do banco ao salvar um candidato. NUNCA devolve o texto do erro do banco (poderia conter o CPF).
window.erroCandidato = function(err) {
  const m = String((err && (err.message || '')) || ''), k = err && err.code;
  if (k === '23505' && /cpf/i.test(m)) return 'Já existe um candidato cadastrado com este CPF.';
  if (k === '23505') return 'Já existe um candidato cadastrado com este nome (sem CPF).';
  if (k === '23514' && /CPF/.test(m)) return 'CPF inválido: confira os dígitos.';
  if (k === '23514') return 'O nome do candidato é obrigatório.';
  if (k === '42P01' || (/cr_candidatos/.test(m) && /does not exist|não existe|schema cache/i.test(m))) return 'A tabela de candidatos ainda não existe: rode sql/cr-schema.sql (R32).';
  return 'Não foi possível salvar o candidato.';
};
// R21 (M13): rascunho automático do Novo Contrato. Fica SÓ neste navegador (localStorage), vale 7 dias e NUNCA guarda o CPF (dado pessoal sensível em computador compartilhado).
// Funções puras (recebem o storage), para testar sem navegador. Estado: { v:1, salvoEm, tipo, campos:{id:valor}, signatarios:[{nome,email,papel}] }.
window.RASCUNHO_VALIDADE_DIAS = 7;
window.RASCUNHO_CAMPOS_IGNORADOS = ['cpf', 'periodo_inicio', 'prazoLink', 'ordemAss', 'exigirOtp']; // só para decidir se há conteúdo: CPF nunca é salvo; início (hoje) e prazo do link (30 dias) e ordem de assinatura (R26, 'livre') têm valor padrão: são salvos, mas sozinhos não justificam um rascunho
window.rascunhoChave = function(userId) { return 'cr_rascunho_contrato:' + (userId || 'anon'); };
window.rascunhoTemConteudo = function(est) {
  if (!est || typeof est !== 'object') return false;
  const campos = est.campos || {};
  return Object.keys(campos).some(k => !window.RASCUNHO_CAMPOS_IGNORADOS.includes(k) && String(campos[k] || '').trim() !== '') || (est.signatarios || []).length > 0;
};
window.rascunhoSalvar = function(storage, chave, est, agora) {
  try {
    if (!window.rascunhoTemConteudo(est)) { storage.removeItem(chave); return false; }   // formulário vazio = sem rascunho
    const campos = {}; Object.keys(est.campos || {}).forEach(k => { if (k !== 'cpf') campos[k] = String(est.campos[k] == null ? '' : est.campos[k]); });
    storage.setItem(chave, JSON.stringify({ v: 1, salvoEm: agora || new Date().toISOString(), tipo: est.tipo === 'clt' ? 'clt' : 'estagio', campos,
      signatarios: (est.signatarios || []).map(s => ({ nome: String(s.nome || ''), email: String(s.email || ''), papel: String(s.papel || '') })) }));
    return true;
  } catch (e) { return false; }   // storage cheio/bloqueado (aba anônima): o formulário segue normal
};
window.rascunhoLer = function(storage, chave, agora) {
  try {
    const bruto = storage.getItem(chave); if (!bruto) return null;
    const est = JSON.parse(bruto);
    const t = Date.parse(est && est.salvoEm), idade = Date.parse(agora || new Date().toISOString()) - t;
    if (!est || est.v !== 1 || isNaN(t) || idade > window.RASCUNHO_VALIDADE_DIAS * 86400000 || !window.rascunhoTemConteudo(est)) { storage.removeItem(chave); return null; }
    return est;
  } catch (e) { try { storage.removeItem(chave); } catch (e2) {} return null; }   // JSON corrompido é descartado
};
window.rascunhoLimpar = function(storage, chave) { try { storage.removeItem(chave); } catch (e) {} };
// R22 (M9): pontos de atenção do contrato (ALERTA AMARELO, nunca bloqueia). Regras da Lei 11.788/2008 (estágio) e jornada CLT (CF art. 7º, XIII).
// CONFERIR COM O JURÍDICO: a lei tem exceções (PcD, cursos que alternam teoria e prática, educação especial) que o sistema não sabe. Função pura.
window.parseJornada = function(txt) {
  const t = String(txt || '').replace(/(\d+)\s*h\s*(\d{2})(?!\d)/gi, (m, h, mi) => (Number(h) + Number(mi) / 60) + 'h').replace(/,/g, '.');
  const r = { dia: null, sem: null }, re = /(\d+(?:\.\d+)?)\s*(?:h|horas?)?\s*(?:\/\s*)?(dia|di[aá]ri|sem)/gi; let m;
  while ((m = re.exec(t))) { const n = Number(m[1]); if (/^dia|^di/i.test(m[2])) { if (r.dia == null) r.dia = n; } else if (r.sem == null) r.sem = n; }
  return r;
};
// R29 (M9): quantos estagiários ATIVOS um supervisor já acompanha (Lei 11.788, art. 9º, III: no máximo 10 simultâneos por supervisor).
// Olha os contratos já feitos neste sistema: UM por candidato (o mais recente, que já reflete renovação/aditivo). Não está ativo se o mais recente é rescisão, está cancelado
// ou já passou do término. Estágio apenas (CLT não conta). Não enxerga estagiários que o supervisor tenha fora deste sistema.
window.supervisorAtivos = function(contratos, ref, hoje) {
  const norm = x => String(x == null ? '' : x).replace(/\s+/g, ' ').trim().toLowerCase(), dig = x => String(x == null ? '' : x).replace(/\D/g, '');
  const r = ref || {}, sup = norm(r.supervisor_nome); if (!sup) return 0;
  const hj = String(hoje || new Date().toISOString()).slice(0, 10);
  const chaveEmp = (nome, cnpj) => dig(cnpj).length === 14 ? 'c' + dig(cnpj) : 'n' + norm(nome);
  const emp = chaveEmp(r.empresa, r.cnpj_empresa); if (emp === 'n') return 0;
  const porCand = {};
  (contratos || []).forEach(ct => {
    if (!ct || ct.tipo !== 'estagio' || chaveEmp(ct.empresa, ct.cnpj_empresa) !== emp) return;
    const k = dig(ct.cpf).length === 11 ? 'p' + dig(ct.cpf) : 'n' + norm(ct.nome_candidato); if (k === 'n') return;
    const a = porCand[k]; if (!a || String(ct.criado_em || '') > String(a.criado_em || '')) porCand[k] = ct;
  });
  return Object.values(porCand).filter(ct => norm(ct.supervisor_nome) === sup && ct.tipo_mov !== 'rescisao' && ct.status !== 'cancelado'
    && !(ct.periodo_fim && String(ct.periodo_fim).slice(0, 10) < hj)
    && !(r.cpf && dig(r.cpf).length === 11 && dig(ct.cpf) === dig(r.cpf))).length;   // o próprio candidato do contrato novo não conta contra si
};
window.avisosContrato = function(d, opts) {
  const out = [], c = (d && d.campos) || {}, papeis = (d && d.papeis) || [], completo = !!(opts && opts.completo);
  const vazio = k => String(c[k] == null ? '' : c[k]).trim() === '';
  const aviso = (cod, texto) => out.push({ nivel: 'aviso', cod, texto }), info = (cod, texto) => out.push({ nivel: 'info', cod, texto });
  const j = window.parseJornada(c.jornada_horas), dia = x => new Date(x + 'T12:00:00Z'), valida = x => /^\d{4}-\d{2}-\d{2}$/.test(x || '') && !isNaN(dia(x));
  if (d && d.tipo === 'clt') {
    if (j.dia != null && j.dia > 8) aviso('jornada_dia', 'Jornada de ' + j.dia + ' h por dia: o limite constitucional é 8 h/dia (CF art. 7º, XIII), salvo compensação ou acordo.');
    if (j.sem != null && j.sem > 44) aviso('jornada_sem', 'Jornada de ' + j.sem + ' h por semana: o limite é 44 h (CF art. 7º, XIII).');
    if (completo && vazio('valor_bolsa')) aviso('sem_salario', 'Salário não informado.');
    return out;
  }
  if (j.dia != null && j.dia > 6) aviso('jornada_dia', 'Jornada de ' + j.dia + ' h por dia: o estágio de ensino superior/médio vai até 6 h/dia (Lei 11.788, art. 10, II). Educação especial e anos finais do fundamental: 4 h.');
  if (j.sem != null && j.sem > 40) aviso('jornada_sem', 'Jornada de ' + j.sem + ' h por semana: acima do teto de 40 h, que só vale em curso que alterna teoria e prática (art. 10, §1º).');
  else if (j.sem != null && j.sem > 30) aviso('jornada_sem', 'Jornada de ' + j.sem + ' h por semana: o padrão é até 30 h (art. 10, II); até 40 h só em curso que alterna teoria e prática.');
  if (valida(c.periodo_inicio) && valida(c.periodo_fim) && c.periodo_fim >= c.periodo_inicio) {
    const ini = dia(c.periodo_inicio), fim = dia(c.periodo_fim), lim = new Date(ini); lim.setUTCFullYear(lim.getUTCFullYear() + 2);
    const dias = Math.round((fim - ini) / 86400000) + 1, umAno = new Date(ini); umAno.setUTCFullYear(umAno.getUTCFullYear() + 1);
    if (fim > lim) aviso('duracao_max', 'Duração acima de 2 anos: é o máximo na mesma empresa (Lei 11.788, art. 11), exceto estagiário com deficiência.');
    if (new Date(fim.getTime() + 86400000) >= umAno) info('recesso', 'Estágio de 1 ano ou mais: recesso de 30 dias (art. 13). Confira se o texto do contrato diz o mesmo.');
    else info('recesso', 'Estágio de menos de 1 ano: recesso proporcional, cerca de ' + Math.max(1, Math.round(30 * dias / 365)) + ' dias (art. 13, §2º).');
  }
  if (completo) {
    if (!valida(c.periodo_fim)) aviso('sem_termino', 'Sem data de término. O estágio tem prazo máximo de 2 anos; informe o término.');
    if (!papeis.includes('instituicao')) aviso('sem_instituicao', 'Falta a instituição de ensino entre os signatários: o termo de compromisso tem 3 partes (estagiário, empresa e instituição, art. 3º).');
    if (!papeis.includes('empresa_cliente') && !papeis.includes('supervisor')) aviso('sem_concedente', 'Nenhum signatário representa a empresa concedente (papel Empresa ou Supervisor).');
    if (vazio('valor_bolsa') || Number(c.valor_bolsa) === 0) aviso('sem_bolsa', 'Bolsa não informada: em estágio não obrigatório a bolsa é compulsória (art. 12).');
    if (vazio('apolice_seguro')) aviso('sem_apolice', 'Apólice do seguro de acidentes pessoais não informada (art. 9º, IV).');
  }
  const sa = Number(d && d.supervisorAtivos);   // R29: preenchido pela tela (supervisorAtivos); ausente = sem informação, sem alerta
  if (sa >= 10) aviso('supervisor_max', 'O supervisor informado já acompanha ' + sa + ' estagiário' + (sa > 1 ? 's' : '') + ' ativo' + (sa > 1 ? 's' : '') + ' neste sistema; com este seriam ' + (sa + 1) + '. O máximo é 10 simultâneos por supervisor (Lei 11.788, art. 9º, III).');
  return out;
};
window.enviarEmailAssinatura = async function(btn) {
  const d = btn.dataset, c = window.CR_CONFIG.EMAILJS;
  if (!window.emailjs) { toast('E-mail indisponível (EmailJS não carregou)', 'err'); return; }
  const old = btn.textContent; btn.disabled = true; btn.textContent = '⏳ Enviando…';
  try {
    emailjs.init(c.PUB_KEY);
    await emailjs.send(c.SVC_ID, c.TMPL_OTP, { to_email: d.email, to_name: d.nome, otp_code: d.url, doc_num: d.titulo, expires: d.expira ? 'até ' + fmtDateShort(d.expira) : 'sem prazo definido' });
    toast('✉️ E-mail enviado para ' + d.email); btn.textContent = '✅ Enviado';
  } catch (e) {
    console.error('enviarEmailAssinatura', e); toast('Falha ao enviar e-mail', 'err');
    btn.textContent = old; btn.disabled = false;
  }
};

// ── Emissão de carta: numera (RN-03), grava no histórico (RN-07) ─
window.emitirCarta = async function(d, tipoDoc) {
  const pre = { carta_recomendacao: 'REC', carta_cancelamento: 'CAN', carta_recesso: 'RCS', tce: 'TCP' }[tipoDoc] || 'DOC';
  const { data, error } = await window._sb.rpc('cr_proximo_numero', { p_tipo: pre });
  if (error || !data) { console.warn('cr_proximo_numero indisponível', error); d.numero_carta = `${pre}-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`; }
  else d.numero_carta = data;
  const { error: e2 } = await window._sb.from('cr_cartas').insert({ numero_carta: d.numero_carta, nome: d.nome, tipo: d.tipo || null, cargo: d.cargo || null, empresa: d.empresa || null, tipo_doc: tipoDoc, dados: d });
  if (!e2) logAcao('emitiu_carta', 'carta', d.numero_carta, tipoDoc);
  if (e2) { console.error('cr_cartas insert', e2); toast('Documento gerado, mas NÃO foi salvo no histórico', 'err'); }
  return d;
};

// ── Configurações (R6): lê cr_config uma vez por página ─
window.carregarConfig = async function() {
  await new Promise(r => { const t = setInterval(() => { if (window._sb) { clearInterval(t); r(); } }, 80); });
  const { data, error } = await window._sb.from('cr_config').select('chave,valor');
  if (error) { console.error('cr_config', error); return {}; }
  const o = {}; (data || []).forEach(r => o[r.chave] = r.valor); return o;
};

// ── Exportar CSV (M16): ; como separador, BOM p/ Excel, aspas e proteção contra injeção de fórmula ─
window.csvCelula = function(v) {
  if (v == null) return '';
  let s = String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[";\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};
window.exportarCSV = function(arquivo, cols, linhas) {
  if (!linhas || !linhas.length) { toast('Nada para exportar.', 'err'); return; }
  const out = [cols.map(c => window.csvCelula(c[0])).join(';')].concat(linhas.map(l => cols.map(c => window.csvCelula(c[1](l))).join(';')));
  if (window.logAcao) logAcao('exportou_csv', 'lista', arquivo, linhas.length + ' linhas');
  const blob = new Blob(['\ufeff' + out.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = arquivo + '-' + new Date().toISOString().slice(0, 10) + '.csv';
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  toast('CSV exportado (' + linhas.length + ' linhas) ✓');
};
window.csvData = function(d) { if (!d) return ''; const x = new Date(String(d).length <= 10 ? d + 'T00:00:00' : d); return isNaN(x) ? '' : x.toLocaleDateString('pt-BR'); };

// ── Histórico (M17): registra no servidor quem fez o quê. Nunca bloqueia nem quebra o fluxo; sem CPF/dados pessoais no detalhe ─
window.logAcao = function(acao, entidade, ref, detalhe) {
  try {
    if (!window._sb) return;
    window._sb.rpc('cr_log', { p_acao: acao, p_entidade: entidade || null, p_ref: ref == null ? null : String(ref), p_detalhe: detalhe || null })
      .then(r => { if (r && r.error) console.warn('cr_log', r.error); }, e => console.warn('cr_log', e));
  } catch (e) { console.warn('cr_log', e); }
};

// ── M15 (R13): aditivo / renovação / rescisão. Regras de verdade ficam no servidor (cr_criar_movimento); aqui só o espelho para a tela ─
window.MOV_LABEL = { aditivo: 'Aditivo', renovacao: 'Renovação', rescisao: 'Rescisão' };
window.MOV_ICO = { aditivo: '📝', renovacao: '🔄', rescisao: '⛔' };
window.MOV_ERROS = {
  origem_nao_assinada: 'Só é possível movimentar um contrato já ASSINADO por todos.',
  origem_rescindida: 'Este contrato já foi rescindido; a cadeia está encerrada.',
  ja_possui_movimento: 'Este contrato já tem um movimento em andamento ou assinado. Conclua/cancele esse movimento (ou movimente a versão mais recente).',
  sem_alteracao: 'Nenhum campo foi alterado em relação ao contrato original.',
  campo_nao_permitido: 'Um dos campos não pode ser alterado por aditivo.',
  valor_invalido: 'Algum valor informado é inválido.',
  termo_antes_do_inicio: 'O novo término não pode ser antes do início.',
  data_obrigatoria: 'Informe a data de efeito da rescisão.',
  motivo_obrigatorio: 'Informe o motivo da rescisão.',
  data_antes_do_inicio: 'A data da rescisão não pode ser antes do início do contrato.',
  data_apos_termino: 'A data da rescisão não pode ser depois do término previsto.',
  origem_sem_termo: 'Contrato sem data de término não tem o que renovar.',
  novo_termo_obrigatorio: 'Informe o novo término da renovação.',
  termo_nao_posterior: 'O novo término precisa ser depois do término atual.',
  origem_inexistente: 'Contrato de origem não encontrado.',
  tipo_invalido: 'Tipo de movimento inválido.'
};
window.movRaiz = function(lista, c) {
  let x = c, n = 0;
  while (x && x.contrato_origem_id && n++ < 50) { const p = lista.find(y => y.id === x.contrato_origem_id); if (!p) break; x = p; }
  return x;
};
window.movFilho = function(lista, id) { return lista.find(y => y.contrato_origem_id === id && y.status !== 'cancelado') || null; };
// Pode abrir movimento sobre este contrato? (espelho de cr_criar_movimento)
window.movPode = function(lista, c) {
  if (!c) return { ok: false, motivo: 'origem_inexistente' };
  if (c.status !== 'assinado') return { ok: false, motivo: 'origem_nao_assinada' };
  if (c.tipo_mov === 'rescisao') return { ok: false, motivo: 'origem_rescindida' };
  if (movFilho(lista, c.id)) return { ok: false, motivo: 'ja_possui_movimento' };
  return { ok: true, motivo: '' };
};
// Versão substituída: existe movimento ASSINADO a partir dela (a vigente é o fim da cadeia)
window.movSuperado = function(lista, c) { const f = movFilho(lista, c.id); return !!(f && f.status === 'assinado'); };
// Contrato rescindido = alguém da cadeia abaixo dele tem rescisão assinada
window.movRescindido = function(lista, c) {
  let x = c, n = 0;
  while (x && n++ < 50) { const f = movFilho(lista, x.id); if (!f) return false; if (f.tipo_mov === 'rescisao' && f.status === 'assinado') return true; x = f; }
  return false;
};
// Alerta (não bloqueia): estágio acima de 2 anos somando toda a cadeia — confirmar com o jurídico
window.movAlertaDuracao = function(lista, c, novoFim) {
  if (!c || c.tipo !== 'estagio' || !novoFim) return '';
  const r = movRaiz(lista, c); if (!r || !r.periodo_inicio) return '';
  const a = new Date(String(r.periodo_inicio).slice(0, 10) + 'T00:00:00'), b = new Date(String(novoFim).slice(0, 10) + 'T00:00:00');
  const lim = new Date(a.getFullYear() + 2, a.getMonth(), a.getDate());
  return b > lim ? 'Atenção: com esse término o estágio passa de 2 anos no total (desde ' + a.toLocaleDateString('pt-BR') + '). Confira com o jurídico (Lei 11.788/2008, art. 11; há exceção para estagiário com deficiência). É só um aviso, não bloqueia.' : '';
};

// ── R26 (M11): ordem de assinatura e lembretes ─
// Ordem 'sequencial': só assina quem já tem TODOS de ordem menor assinados (espelho de cr_sig_bloqueador no SQL; o servidor é quem manda).
// Lembrete: o sistema prepara a mensagem e REGISTRA que saiu; quem envia é a pessoa (WhatsApp/e-mail). Não existe envio automático.
window.CR_ERROS_LINK.aguardando_vez = 'Ainda não é a vez desta pessoa: aguarda a assinatura anterior.';
window.CR_ERROS_LINK.link_vencido = 'O link venceu: prorrogue ou gere um link novo antes de lembrar.';
window.CR_ERROS_LINK.canal_invalido = 'Canal de lembrete inválido.';
window.sigAguardando = function(c, sigs, s) {
  if (!c || !s || c.ordem_assinatura !== 'sequencial') return null;
  const o = x => Number(x.ordem) || 0;
  const falta = (sigs || []).filter(x => x.contrato_id === s.contrato_id && x.status !== 'assinado' && o(x) < o(s)).sort((a, b) => o(a) - o(b) || a.id - b.id);
  return falta.length ? falta[0].nome : null;
};
window.lembreteInfo = function(s, agora) {
  const vazio = { qtd: 0, dias: null, rotulo: 'nenhum lembrete enviado' };
  const qtd = Number(s && s.lembretes_qtd) || 0;
  if (!qtd || !s.lembrete_em) return vazio;
  const t = new Date(s.lembrete_em), ref = agora ? new Date(agora) : new Date();
  if (isNaN(t) || isNaN(ref)) return vazio;
  const dias = Math.max(0, Math.floor((ref - t) / 86400000));
  return { qtd, dias, rotulo: qtd + (qtd === 1 ? ' lembrete' : ' lembretes') + ' · último ' + (dias < 1 ? 'hoje' : dias === 1 ? 'ontem' : 'há ' + dias + ' dias') };
};
// Quem merece lembrete: pendente, na vez, link ainda válido e sem movimento há `limite` dias (padrão 3; CR_CONFIG.LEMBRETE_DIAS muda).
// "Movimento" = último lembrete ou, se nunca houve, a última atualização do contrato (criação ou última assinatura).
window.precisaLembrete = function(c, sigs, agora, limite) {
  if (!c || (c.status !== 'enviado' && c.status !== 'parcial')) return [];
  const lim = Number(limite) || Number((window.CR_CONFIG || {}).LEMBRETE_DIAS) || 3;
  const ref = agora ? new Date(agora) : new Date();
  return (sigs || []).filter(s => s.contrato_id === c.id && s.status === 'pendente' && !window.sigAguardando(c, sigs, s)
    && window.linkValidade(s.expira_em, agora).estado !== 'expirado').filter(s => {
    const t = new Date(s.lembrete_em || c.atualizado_em || c.criado_em);
    return !isNaN(t) && !isNaN(ref) && (ref - t) >= lim * 86400000;
  });
};
window.mensagemLembrete = function(s, titulo, url, expira) {
  return 'Olá ' + s.nome + '! Lembrete: o documento "' + titulo + '" ainda aguarda a sua assinatura. Acesse: ' + url
    + (expira ? ' (o link vale até ' + fmtDateShort(expira) + ')' : '');
};
window.registrarLembrete = async function(signatarioId, canal) {
  try {
    const { data, error } = await window._sb.rpc('cr_registrar_lembrete', { p_signatario: signatarioId, p_canal: canal });
    if (error) { console.error('cr_registrar_lembrete', error); return { erro: /function|schema cache|PGRST202/i.test(error.message || '') ? 'Função cr_registrar_lembrete não existe no banco: rode sql/cr-schema.sql (R26).' : (error.message || 'Falha ao registrar o lembrete.') }; }
    if (data && data.erro) return { erro: window.CR_ERROS_LINK[data.erro] || data.erro };
    return data;
  } catch (e) { console.error('registrarLembrete', e); return { erro: 'Falha ao registrar o lembrete.' }; }
};
// Registra e avisa a tela (window.aoLembrar(id, resposta)); devolve true se registrou.
window.lembrarRegistrar = async function(signatarioId, canal) {
  const r = await window.registrarLembrete(signatarioId, canal);
  if (r.erro) { toast(r.erro, 'err'); return false; }
  if (typeof window.aoLembrar === 'function') window.aoLembrar(signatarioId, r);
  return true;
};
window.btnEmailLembrete = function(s, titulo, url) {
  if (!s.email) return '';
  const e = x => String(x || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  return `<button class="btn btn-ghost btn-sm" style="font-size:.63rem" onclick="enviarEmailLembrete(this)" data-sig="${Number(s.id) || 0}" data-email="${e(s.email)}" data-nome="${e(s.nome)}" data-titulo="${e(titulo)}" data-url="${e(url)}" data-expira="${e(s.expira_em || '')}">🔔 Lembrar por e-mail</button>`;
};
// Mesmo modelo de e-mail do convite (TMPL_OTP); o título do documento sai com "LEMBRETE —" na frente. O texto do corpo vem do modelo no EmailJS.
window.enviarEmailLembrete = async function(btn) {
  const d = btn.dataset, c = window.CR_CONFIG.EMAILJS;
  if (!window.emailjs) { toast('E-mail indisponível (EmailJS não carregou)', 'err'); return; }
  const old = btn.textContent; btn.disabled = true; btn.textContent = '⏳ Enviando…';
  try {
    emailjs.init(c.PUB_KEY);
    await emailjs.send(c.SVC_ID, c.TMPL_OTP, { to_email: d.email, to_name: d.nome, otp_code: d.url, doc_num: 'LEMBRETE — ' + d.titulo, expires: d.expira ? 'até ' + fmtDateShort(d.expira) : 'sem prazo definido' });
  } catch (e) {
    console.error('enviarEmailLembrete', e); toast('Falha ao enviar e-mail', 'err');
    btn.textContent = old; btn.disabled = false; return;
  }
  toast('✉️ Lembrete enviado para ' + d.email);
  btn.textContent = '✅ Enviado';
  if (!(await window.lembrarRegistrar(Number(d.sig), 'email'))) toast('O e-mail saiu, mas o lembrete não foi registrado no histórico.', 'err');
};

// ── R27 (M8): busca de CNPJ (BrasilAPI, pública, sem chave). Só devolve dados da EMPRESA (razão social e endereço); nada de pessoa física. ──
window.enderecoDoCNPJ = function(d) {
  if (!d) return '';
  const rua = [d.descricao_tipo_de_logradouro, d.logradouro].filter(Boolean).join(' ').trim();
  const l1 = [rua, d.numero && String(d.numero).trim() !== 'S/N' ? d.numero : (d.numero ? 's/n' : ''), d.complemento].filter(x => x && String(x).trim()).join(', ');
  const cidade = [d.municipio, d.uf].filter(Boolean).join('/');
  return [l1, d.bairro, cidade, d.cep ? 'CEP ' + String(d.cep).replace(/^(\d{5})(\d{3})$/, '$1-$2') : ''].filter(x => x && String(x).trim()).join(' · ').replace(/\s+/g, ' ');
};
window.buscarCNPJ = async function(cnpj, fetchFn) {
  const n = String(cnpj || '').replace(/\D/g, '');
  if (!window.validarCNPJ(n)) return { erro: 'CNPJ inválido: confira os dígitos.' };
  try {
    const r = await (fetchFn || window.fetch)('https://brasilapi.com.br/api/cnpj/v1/' + n);
    if (r.status === 404) return { erro: 'CNPJ não encontrado na Receita (base pública).' };
    if (!r.ok) return { erro: 'Consulta indisponível agora (' + r.status + '). Preencha à mão.' };
    const d = await r.json();
    return { razao: String(d.razao_social || d.nome_fantasia || '').trim(), endereco: window.enderecoDoCNPJ(d), situacao: String(d.descricao_situacao_cadastral || '').trim() };
  } catch (e) { console.error('buscarCNPJ', e); return { erro: 'Sem conexão com a consulta de CNPJ. Preencha à mão.' }; }
};

// R35/R38 (M10): modelos editáveis. Funções puras. O texto NUNCA leva dado pessoal além do permitido por modelo:
//   clausulas_tce (R35): {{apolice}} {{numero}} {{empresa}} {{agencia}} · texto_recomendacao (R38): só {{nome}} (o nome que já está na própria carta).
window.MODELOS = {
  clausulas_tce:      { titulo: 'Cláusulas do TCE (estágio)', vars: ['apolice', 'numero', 'empresa', 'agencia'], max: 20000 },
  texto_recomendacao: { titulo: 'Texto da Carta de Recomendação', vars: ['nome'], max: 3000 }
};
window.MODELO_VARIAVEIS = window.MODELOS.clausulas_tce.vars;   // compatibilidade (R35)
// espelho da regra do servidor (cr_modelo_validar / cr_modelo_validar_chave): devolve null se aceita, ou o código do problema
window.modeloValidar = function(texto, chave) {
  const m = window.MODELOS[chave || 'clausulas_tce'];
  if (!m) return 'chave_invalida';
  const t = String(texto == null ? '' : texto).trim();
  if (t.length < 50) return 'curto';
  if (t.length > m.max) return 'longo';
  if (t.replace(new RegExp('\\{\\{(' + m.vars.join('|') + ')\\}\\}', 'g'), '').match(/\{\{|\}\}/)) return 'variavel_invalida';
  return null;
};
// texto do modelo -> HTML. Parágrafos separados por linha em branco; **negrito**; {{variável}} trocada por valor ESCAPADO (vars desconhecidas ficam como estão).
window.modeloRenderizar = function(texto, vars, chave) {
  vars = vars || {};
  const permitidas = (window.MODELOS[chave || 'clausulas_tce'] || window.MODELOS.clausulas_tce).vars;
  const esc = x => String(x == null ? '' : x).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  return String(texto == null ? '' : texto).trim().split(/\n[ \t]*\n/).map(p => p.trim()).filter(Boolean).map(p => {
    let h = esc(p).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>');
    h = h.replace(/\{\{(\w+)\}\}/g, (m, k) => (permitidas.indexOf(k) >= 0 ? esc(vars[k] == null || vars[k] === '' ? '—' : vars[k]) : m));
    return '<p style="margin-bottom:7px">' + h + '</p>';
  }).join('');
};
// R38: texto do modelo -> TEXTO PURO (sem HTML nem negrito), para o campo da carta. Só as variáveis do modelo são trocadas;
// valor vazio vira o rótulo (ex.: "[nome]"); o valor entra literal (nada de "$&" ou "$1" interpretado).
window.modeloTextoPlano = function(texto, vars, chave, vazio) {
  vars = vars || {}; vazio = vazio || {};
  const permitidas = (window.MODELOS[chave] || { vars: [] }).vars;
  return String(texto == null ? '' : texto).trim().replace(/\{\{(\w+)\}\}/g, (m, k) => {
    if (permitidas.indexOf(k) < 0) return m;
    const x = vars[k]; return (x == null || String(x).trim() === '') ? (vazio[k] || '—') : String(x);
  });
};
window.erroModelo = function(err, json, chave) {
  const k = (json && json.erro) || (err && err.code);
  const vs = (window.MODELOS[chave || 'clausulas_tce'] || window.MODELOS.clausulas_tce);
  const lim = vs.max.toLocaleString('pt-BR');
  if (k === 'curto') return 'O texto está curto demais (mínimo de 50 caracteres).';
  if (k === 'longo') return 'O texto passou do limite de ' + lim + ' caracteres.';
  if (k === 'variavel_invalida') return 'Há uma {{variável}} que não existe ou está mal escrita. Use só ' + vs.vars.map(x => '{{' + x + '}}').join(', ').replace(/, ([^,]*)$/, ' e $1') + ', sem espaços.';
  if (k === 'igual_a_ativa') return 'Este texto é igual ao da versão ativa: nada foi publicado.';
  if (k === 'ja_ativa') return 'Esta versão já é a ativa.';
  if (k === 'nao_encontrado') return 'Versão não encontrada.';
  if (k === 'chave_invalida') return chave === 'texto_recomendacao' ? 'O servidor ainda não conhece este modelo: rode sql/cr-schema.sql (R38).' : 'Modelo desconhecido.';
  if (k === '42501') return 'Somente administradores podem fazer isto.';
  if (k === '42883' || k === '42P01' || k === 'PGRST202' || k === 'PGRST205') return 'Esta função ainda não existe: rode sql/cr-schema.sql (R35' + (chave === 'texto_recomendacao' ? ' e R38' : '') + ').';
  return 'Não foi possível concluir. Nada foi alterado.';
};

// R36 (M16): anexos ao contrato. Funções puras (a leitura do arquivo e o envio ficam em anexos.html). O servidor repete TODAS as regras.
window.ANEXO_MAX_BYTES = 2097152; window.ANEXO_MAX_QTD = 10;
window.ANEXO_CATEGORIAS = { documento_pessoal: 'Documento pessoal (RG, CPF...)', comprovante_matricula: 'Comprovante de matrícula', declaracao_instituicao: 'Declaração da instituição', outro: 'Outro' };
// arquivo {name,size} -> null se pode tentar enviar, ou 'vazio' | 'grande' | 'tipo' (só confere o NOME e o tamanho; quem decide o tipo de verdade é o servidor, pelo conteúdo)
window.anexoValidar = function(f) {
  if (!f || !f.size) return 'vazio';
  if (f.size > window.ANEXO_MAX_BYTES) return 'grande';
  return /\.(pdf|png|jpe?g)$/i.test(String(f.name || '')) ? null : 'tipo';
};
window.formatarTamanho = function(b) { b = Number(b) || 0; return b < 1024 ? b + ' B' : b < 1048576 ? (b / 1024).toFixed(b < 10240 ? 1 : 0).replace('.', ',') + ' KB' : (b / 1048576).toFixed(1).replace('.', ',') + ' MB'; };
// R39: o 3º argumento ('carta') só muda a palavra e a rodada do SQL; as regras são as mesmas.
window.erroAnexo = function(err, json, alvo) {
  const k = (json && json.erro) || (err && err.code), carta = alvo === 'carta', este = carta ? 'esta carta' : 'este contrato';
  if (k === 'vazio') return 'O arquivo está vazio.';
  if (k === 'grande') return 'O arquivo passa de 2 MB.';
  if (k === 'tipo' || k === 'tipo_nao_aceito') return 'Só são aceitos PDF, PNG e JPEG (o conteúdo do arquivo é conferido).';
  if (k === 'limite') return (carta ? 'Esta carta' : 'Este contrato') + ' já tem 10 anexos (o máximo).';
  if (k === 'duplicado') return 'Este mesmo arquivo já está anexado a ' + este + '.';
  if (k === 'arquivo_invalido') return 'Não foi possível ler o arquivo.';
  if (k === 'contrato_anonimizado') return 'Contrato anonimizado: não recebe anexos.';
  if (k === 'carta_anonimizada') return 'Carta anonimizada: não recebe anexos.';
  if (k === 'categoria_invalida') return 'Escolha o tipo do documento.';
  if (k === 'contrato_nao_encontrado' || k === 'carta_nao_encontrada' || k === 'nao_encontrado') return 'Não encontrado.';
  if (k === '42501') return 'Sem permissão para isto.';
  if (k === '42883' || k === '42P01' || k === 'PGRST202' || k === 'PGRST205') return 'Esta função ainda não existe: rode sql/cr-schema.sql (' + (carta ? 'R39' : 'R36') + ').';
  return 'Não foi possível concluir. Nada foi alterado.';
};
