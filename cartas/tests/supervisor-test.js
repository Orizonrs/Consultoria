// R29 (M9): limite de 10 estagiários simultâneos por supervisor (Lei 11.788, art. 9º, III). Sem dependências. Uso: node tests/supervisor-test.js
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const sb = { console, setInterval() {}, clearInterval() {}, setTimeout() {}, localStorage: { length: 0, getItem() { return null }, setItem() {}, removeItem() {} },
  document: { getElementById() { return null }, querySelector() { return null }, querySelectorAll() { return [] }, addEventListener() {}, readyState: 'complete' }, navigator: {}, location: { origin: 'http://x', pathname: '/x.html', search: '', href: 'http://x/x.html' } };
sb.window = sb; vm.createContext(sb);
['cr-config.js', 'cr-utils.js'].forEach(f => vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'assets', f), 'utf8'), sb));
let n = 0; const ok = (c, m) => { assert(c, m); n++; };
const HOJE = '2026-10-23', CNPJ = '11.222.333/0001-81';
let seq = 0;
const k = (o) => Object.assign({ tipo: 'estagio', empresa: 'ACME', cnpj_empresa: CNPJ, supervisor_nome: 'João Santos', status: 'enviado', tipo_mov: null, periodo_fim: '2027-06-30',
  cpf: String(10000000000 + (++seq)), nome_candidato: 'Cand ' + seq, criado_em: '2026-03-' + String(10 + (seq % 18)).padStart(2, '0') + 'T10:00:00Z' }, o);
const REF = { empresa: 'ACME', cnpj_empresa: '11222333000181', supervisor_nome: ' joão  santos ' };
const f = (L, r) => sb.supervisorAtivos(L, r || REF, HOJE);
ok(f([k(), k(), k()]) === 3, 'conta candidatos ativos do mesmo supervisor (nome sem diferenciar maiúscula/espaços; CNPJ formatado ou não)');
ok(f([k({ supervisor_nome: 'Outro' }), k({ empresa: 'Beta', cnpj_empresa: '' })]) === 0, 'outro supervisor ou outra empresa não conta');
ok(f([k({ tipo: 'clt' })]) === 0, 'CLT não conta');
ok(f([k({ status: 'cancelado' }), k({ periodo_fim: '2026-10-22' })]) === 0, 'cancelado e já terminado não contam');
ok(f([k({ periodo_fim: HOJE })]) === 1 && f([k({ periodo_fim: null })]) === 1, 'termina hoje ainda conta; sem término conta');
// um por candidato: renovação substitui o contrato original, rescisão encerra
const c1 = k({ cpf: '52998224725', periodo_fim: '2026-08-01', criado_em: '2026-01-01T00:00:00Z' });
ok(f([c1]) === 0, 'sozinho, o contrato antigo terminado não conta');
ok(f([c1, k({ cpf: '52998224725', tipo_mov: 'renovacao', periodo_fim: '2027-02-01', criado_em: '2026-08-01T00:00:00Z' })]) === 1, 'renovação do mesmo candidato conta UMA vez (não duplica)');
ok(f([k({ cpf: '52998224725', criado_em: '2026-01-01T00:00:00Z' }), k({ cpf: '52998224725', tipo_mov: 'rescisao', criado_em: '2026-09-01T00:00:00Z' })]) === 0, 'rescisão mais recente encerra o candidato');
ok(f([k({ cpf: '52998224725', criado_em: '2026-01-01T00:00:00Z' }), k({ cpf: '52998224725', supervisor_nome: 'Outro', tipo_mov: 'aditivo', criado_em: '2026-05-01T00:00:00Z' })]) === 0, 'aditivo que trocou o supervisor: vale o mais recente');
ok(f([k({ cpf: null, nome_candidato: 'Ana Souza', criado_em: '2026-01-01T00:00:00Z' }), k({ cpf: '', nome_candidato: ' ana  souza ', criado_em: '2026-02-01T00:00:00Z' })]) === 1, 'sem CPF, agrupa pelo nome');
ok(f([k({ cpf: null, nome_candidato: '' })]) === 0, 'sem CPF nem nome: ignorado');
ok(f([k({ cpf: '52998224725' })], Object.assign({}, REF, { cpf: '529.982.247-25' })) === 0, 'o próprio candidato do contrato novo não conta contra si');
// entradas ruins
ok(f([], REF) === 0 && f(null, REF) === 0 && sb.supervisorAtivos([k()], null, HOJE) === 0 && f([k()], { supervisor_nome: '' }) === 0 && f([k(), null, {}], REF) === 1, 'vazio/nulo/sem supervisor não quebra e não inventa');
ok(f([k()], { supervisor_nome: 'João Santos' }) === 0, 'sem empresa informada: não conta (não mistura empresas)');
// regra no avisosContrato
const cods = (d, o) => sb.avisosContrato(d, o).map(a => a.cod).sort().join();
const est = (sa, tipo) => ({ tipo: tipo || 'estagio', campos: {}, papeis: [], supervisorAtivos: sa });
ok(cods(est(9)) === '' , '9 ativos + este = 10: dentro do limite, sem aviso');
ok(cods(est(10)) === 'supervisor_max', '10 ativos + este = 11: avisa');
ok(/11 simultâneos|seriam 11/.test(sb.avisosContrato(est(10))[0].texto) && /art\. 9º, III/.test(sb.avisosContrato(est(10))[0].texto), 'texto cita o número e o artigo');
ok(cods(est(undefined)) === '' && cods({ tipo: 'estagio', campos: {}, papeis: [] }) === '', 'sem a informação (undefined): sem aviso');
ok(cods(est(12, 'clt')) === '', 'contrato CLT nunca recebe este aviso (a regra é do estágio)');
console.log('OK ' + n + ' verificações');
