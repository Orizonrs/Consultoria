// R38 (M10): modelo do texto da carta de recomendação — verificações estáticas do SQL/telas e funções puras (sem dependências). Uso: node tests/modelos-carta-test.js
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const root = path.join(__dirname, '..'), rd = f => fs.readFileSync(path.join(root, f), 'utf8');
let n = 0; const ok = (c, m) => { assert(c, m); n++; };
const sql = rd('sql/cr-schema.sql'), sec = sql.slice(sql.indexOf('-- 21) R38'), sql.indexOf('-- 22) R39') > 0 ? sql.indexOf('-- 22) R39') : undefined);
ok(sec.length > 2000 && sql.indexOf('-- 21) R38') > sql.indexOf('-- 20) R37'), 'seção 21 existe (a 22 vem depois)');
const corpo = nome => { const i = sec.indexOf('create or replace function ' + nome + '('); assert(i >= 0, 'função ausente: ' + nome); return sec.slice(i, sec.indexOf('end $$;', i)); };

// ── SQL ──
const pub = corpo('cr_modelo_publicar');
ok(/auth\.uid\(\) is null then raise exception/.test(pub) && /not cr_e_admin\(\) then raise exception/.test(pub) && /security definer set search_path = public/.test(pub) && /pg_advisory_xact_lock/.test(pub), 'publicar: login, admin, definer com search_path fixo e trava');
ok(/cr_modelo_validar_chave\(p_chave, v_texto\)/.test(pub) && /p_chave not in \('clausulas_tce', 'texto_recomendacao'\)/.test(pub), 'publicar: valida pela chave e só aceita as duas chaves');
const val = corpo('cr_modelo_validar_chave');
ok(/\\\{\\\{nome\\\}\\\}/.test(val) && !/apolice|numero|empresa|agencia/.test(val.slice(val.indexOf("'texto_recomendacao'"))), 'recomendação: a ÚNICA variável é {{nome}}');
ok(/length\(t\) > 3000/.test(val) && /length\(t\) < 50/.test(val), 'recomendação: entre 50 e 3000 caracteres');
ok(/cr_modelo_validar\(p_texto\)/.test(val), 'TCE continua validado pela função da R35');
ok(!/cpf|email|telefone|endereco/i.test(val), 'validação não menciona dado pessoal');
const logs = [...sec.matchAll(/perform cr_log\([\s\S]*?\);/g)].map(m => m[0]);
ok(logs.length === 1 && !/texto/.test(logs[0].replace(/'publicou_modelo'/, '')), 'histórico recebe só chave e versão, nunca o texto');
ok(/check \(chave in \('clausulas_tce', 'texto_recomendacao'\)\)/.test(sec), 'tabela só aceita as duas chaves');
ok(/revoke all on function cr_modelo_validar_chave\(text, text\), cr_modelo_publicar\(text, text\) from public/.test(sec) && !/to [^;]*\banon\b/.test(sec.replace(/revoke[^;]*;/g, '')), 'anon nunca recebe grant');
ok(/where not exists \(select 1 from cr_modelos where chave = 'texto_recomendacao'\)/.test(sec), 'v1 entra só se ainda não existe versão da recomendação');
// v1 do SQL = texto que está fixo em visualizar.html (carta antiga e nova mostram a mesma coisa)
const v1 = sec.slice(sec.indexOf('$tx$') + 4, sec.indexOf('$tx$', sec.indexOf('$tx$') + 4)).replace('{{nome}}', 'NOME');
const viz = rd('visualizar.html'), iv = viz.indexOf('Durante o período de estágio,');
ok(viz.slice(iv, iv + v1.length + 6).replace('${d.nome}', 'NOME').replace(/\s+/g, ' ').indexOf(v1.replace(/\s+/g, ' ')) === 0, 'versão 1 = texto fixo que continua em visualizar.html (fallback)');
ok(rd('tests/sql/rodar-m15.sh').includes('modelos-carta-teste.sql'), 'teste SQL novo está no roteiro de execução');

// ── funções puras do cliente ──
const sb = { console, document: { getElementById() { return null; }, querySelector() { return null; }, querySelectorAll() { return []; }, addEventListener() {}, readyState: 'complete' }, localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} }, setInterval() {}, clearInterval() {}, setTimeout() {} };
sb.window = sb; vm.createContext(sb); vm.runInContext(rd('assets/cr-utils.js'), sb);
const V = (t, c) => sb.modeloValidar(t, c), X = 'a'.repeat(60), R = 'texto_recomendacao';
ok(V(X + '{{nome}}', R) === null && V(X + '{{nome}} {{nome}}', R) === null, 'validar recomendação: {{nome}} aceito (e repetido)');
ok(V(X + '{{apolice}}', R) === 'variavel_invalida' && V(X + '{{cpf}}', R) === 'variavel_invalida' && V(X + '{{ nome }}', R) === 'variavel_invalida' && V(X + '{{nome', R) === 'variavel_invalida' && V(X + 'nome}}', R) === 'variavel_invalida', 'validar recomendação: qualquer outra variável / mal escrita é recusada');
ok(V('a'.repeat(3001), R) === 'longo' && V('a'.repeat(3000), R) === null && V('curto', R) === 'curto', 'validar recomendação: limites 50 e 3000');
ok(V(X + '{{nome}}') === 'variavel_invalida' && V(X + '{{nome}}', 'clausulas_tce') === 'variavel_invalida', 'TCE continua NÃO aceitando {{nome}}');
ok(V(X + '{{apolice}}') === null && V('a'.repeat(20000)) === null && V('a'.repeat(20001)) === 'longo', 'TCE (padrão, sem chave) continua igual à R35');
ok(V(X, 'outra') === 'chave_invalida', 'chave desconhecida');
const T = sb.modeloTextoPlano;
ok(T('Oi {{nome}}, {{nome}}!', { nome: 'Ana' }, R) === 'Oi Ana, Ana!', 'texto plano: troca {{nome}}');
ok(T('Oi {{nome}}', { nome: '' }, R, { nome: '[nome]' }) === 'Oi [nome]' && T('Oi {{nome}}', {}, R) === 'Oi —', 'texto plano: nome vazio vira rótulo (ou traço)');
ok(T('Oi {{nome}}', { nome: '$& $1 <b>' }, R) === 'Oi $& $1 <b>', 'texto plano: valor entra literal (sem "$&" interpretado) e sem HTML mexido');
ok(T('{{cpf}} {{apolice}}', { cpf: '123', apolice: '9' }, R) === '{{cpf}} {{apolice}}', 'texto plano: variável fora do modelo NÃO é trocada');
ok(sb.modeloRenderizar('Oi {{nome}} **x**', { nome: '<i>A</i>' }, R) === '<p style="margin-bottom:7px">Oi &lt;i&gt;A&lt;/i&gt; <strong>x</strong></p>' && /\{\{apolice\}\}/.test(sb.modeloRenderizar('{{apolice}}', { apolice: '1' }, R)), 'renderizar por chave: escapa HTML e só troca {{nome}} na recomendação');
const E = sb.erroModelo;
ok(/50 caracteres/.test(E(null, { erro: 'curto' }, R)) && /3\.000/.test(E(null, { erro: 'longo' }, R)) && /\{\{nome\}\}, sem espaços/.test(E(null, { erro: 'variavel_invalida' }, R)) && !/apolice/.test(E(null, { erro: 'variavel_invalida' }, R)), 'mensagens de erro dizem o limite e as variáveis do modelo certo');
ok(/\{\{apolice\}\}, \{\{numero\}\}, \{\{empresa\}\} e \{\{agencia\}\}/.test(E(null, { erro: 'variavel_invalida' })), 'mensagem do TCE continua listando as 4 variáveis');
ok(/R38/.test(E(null, { erro: 'chave_invalida' }, R)) && /R35 e R38/.test(E({ code: '42883' }, null, R)) && /\(R35\)/.test(E({ code: '42883' })), 'mensagens de "rode o SQL" citam a rodada certa');

// ── telas ──
const cfg = rd('configuracoes.html');
ok(/id="mod_chave"/.test(cfg) && /value="texto_recomendacao"/.test(cfg) && /p_chave: ch/.test(cfg) && !/p_chave: 'clausulas_tce'/.test(cfg), 'configuracoes: seletor de modelo e publicar usa a chave escolhida');
ok(/\.eq\('chave', ch\)/.test(cfg), 'configuracoes: lista só as versões do modelo escolhido');
const nc = rd('nova-carta.html');
ok(/eq\('chave', 'texto_recomendacao'\)\.eq\('ativo', true\)/.test(nc) && /modeloTextoPlano\(/.test(nc), 'nova-carta: lê o modelo ATIVO e troca {{nome}} como texto puro');
ok(/modeloValidar\(data\[0\]\.texto, 'texto_recomendacao'\)/.test(nc), 'nova-carta: ignora modelo inválido (cai no texto fixo)');
ok(/\(_modeloRec \? textoPadrao\(\) : ''\)/.test(nc), 'nova-carta: com modelo grava o texto na carta; sem modelo mantém o comportamento antigo');
console.log('MODELO CARTA: ' + n + ' verificações OK');
