// R21 (M13): regras do rascunho automático (sem dependências). Uso: node tests/rascunho-test.js
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const sb = { console, setInterval() {}, clearInterval() {}, setTimeout() {}, localStorage: { length: 0, getItem() { return null }, setItem() {}, removeItem() {} },
  document: { getElementById() { return null }, querySelector() { return null }, querySelectorAll() { return [] }, addEventListener() {}, readyState: 'complete' }, navigator: {} };
sb.window = sb; vm.createContext(sb);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'assets/cr-utils.js'), 'utf8'), sb);
let n = 0; const ok = (c, m) => { assert(c, m); n++; };
const mem = () => { const d = {}; return { d, getItem: k => (k in d ? d[k] : null), setItem: (k, v) => { d[k] = v; }, removeItem: k => { delete d[k]; } }; };
const agora = '2026-10-23T12:00:00Z', dias = x => new Date(Date.parse(agora) + x * 86400000).toISOString();
const est = { tipo: 'clt', campos: { nome_candidato: 'Ana', cpf: '529.982.247-25', empresa: 'ACME', periodo_inicio: '2026-10-23', valor_bolsa: '1500' }, signatarios: [{ nome: 'Chefe', email: 'c@x', papel: 'supervisor' }] };
ok(sb.rascunhoChave('u1') === 'cr_rascunho_contrato:u1' && sb.rascunhoChave(null) === 'cr_rascunho_contrato:anon', 'chave por usuário (anon sem login)');
ok(sb.rascunhoChave('u1') !== sb.rascunhoChave('u2'), 'dois usuários no mesmo navegador não misturam rascunhos');
let st = mem(), k = sb.rascunhoChave('u1');
ok(sb.rascunhoSalvar(st, k, est, agora) === true, 'salva');
ok(!/529\.982|52998224725/.test(st.d[k]), 'CPF NUNCA vai para o storage');
let r = sb.rascunhoLer(st, k, dias(1));
ok(r && r.tipo === 'clt' && r.campos.empresa === 'ACME' && r.campos.valor_bolsa === '1500' && !('cpf' in r.campos) && r.signatarios[0].papel === 'supervisor', 'lê de volta tipo, campos e signatários (sem CPF)');
ok(sb.rascunhoLer(st, k, dias(6.9)) !== null, 'ainda vale com 6,9 dias');
ok(sb.rascunhoLer(st, k, dias(7.1)) === null && st.getItem(k) === null, 'expira após 7 dias e é apagado');
// vazio
ok(sb.rascunhoTemConteudo({ campos: { periodo_inicio: '2026-10-23', cpf: '123' }, signatarios: [] }) === false, 'só CPF e data de início não é conteúdo');
ok(sb.rascunhoTemConteudo({ campos: { periodo_inicio: '2026-10-23', prazoLink: '30' }, signatarios: [] }) === false, 'formulário em branco (só valores padrão de data e prazo) não é conteúdo');
ok(sb.rascunhoTemConteudo({ campos: { cargo: ' ' }, signatarios: [] }) === false, 'só espaços não é conteúdo');
ok(sb.rascunhoTemConteudo({ campos: {}, signatarios: [{ nome: 'x' }] }) === true, 'signatário extra conta como conteúdo');
ok(sb.rascunhoTemConteudo(null) === false && sb.rascunhoTemConteudo('x') === false, 'entrada inválida');
sb.rascunhoSalvar(st, k, est, agora); ok(sb.rascunhoSalvar(st, k, { tipo: 'estagio', campos: { periodo_inicio: '2026-10-23' }, signatarios: [] }, agora) === false && st.getItem(k) === null, 'formulário esvaziado apaga o rascunho');
// corrompido / versão errada / data inválida
st.setItem(k, '{lixo'); ok(sb.rascunhoLer(st, k, agora) === null && st.getItem(k) === null, 'JSON corrompido é descartado sem quebrar');
st.setItem(k, JSON.stringify({ v: 2, salvoEm: agora, campos: { cargo: 'x' } })); ok(sb.rascunhoLer(st, k, agora) === null, 'versão desconhecida é descartada');
st.setItem(k, JSON.stringify({ v: 1, salvoEm: 'ontem', campos: { cargo: 'x' } })); ok(sb.rascunhoLer(st, k, agora) === null, 'data inválida é descartada');
ok(sb.rascunhoLer(st, 'nao_existe', agora) === null, 'sem rascunho devolve null');
// tipo desconhecido e storage quebrado
sb.rascunhoSalvar(st, k, { tipo: 'xx', campos: { cargo: 'Dev' }, signatarios: [] }, agora); ok(sb.rascunhoLer(st, k, agora).tipo === 'estagio', 'tipo desconhecido vira estágio');
const quebrado = { getItem() { throw new Error('bloqueado'); }, setItem() { throw new Error('cheio'); }, removeItem() { throw new Error('x'); } };
ok(sb.rascunhoSalvar(quebrado, k, est, agora) === false && sb.rascunhoLer(quebrado, k, agora) === null, 'storage bloqueado/cheio não derruba a tela');
sb.rascunhoLimpar(quebrado, k); sb.rascunhoLimpar(st, k); ok(st.getItem(k) === null, 'limpar apaga e tolera erro');
ok(sb.rascunhoSalvar(st, k, { tipo: 'clt', campos: { cargo: '<b>x</b>', valor_bolsa: null }, signatarios: [] }, agora) && sb.rascunhoLer(st, k, agora).campos.valor_bolsa === '', 'valor nulo vira texto vazio (não "null")');
console.log('RASCUNHO JS: ' + n + ' verificações OK');
