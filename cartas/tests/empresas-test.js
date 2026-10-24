// R28 (M7): empresas já usadas (sem dependências). Uso: node tests/empresas-test.js
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const sb = { console, setInterval() {}, clearInterval() {}, setTimeout() {}, localStorage: { length: 0, getItem() { return null }, setItem() {}, removeItem() {} },
  document: { getElementById() { return null }, querySelector() { return null }, querySelectorAll() { return [] }, addEventListener() {}, readyState: 'complete' }, navigator: {}, location: { origin: 'http://x', pathname: '/x.html', search: '', href: 'http://x/x.html' } };
sb.window = sb; vm.createContext(sb);
['cr-config.js', 'cr-utils.js'].forEach(f => vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'assets', f), 'utf8'), sb));
let n = 0; const ok = (c, m) => { assert(c, m); n++; };
const C = [
  { empresa: 'Acme  Ltda', cnpj_empresa: '11.222.333/0001-81', endereco_emp: 'Rua Velha, 1', supervisor_nome: 'Antigo', supervisor_cargo: 'RH', criado_em: '2026-01-10T10:00:00Z' },
  { empresa: 'ACME LTDA', cnpj_empresa: '11222333000181', endereco_emp: 'Rua Nova, 2', supervisor_nome: 'João', supervisor_cargo: 'Gerente', criado_em: '2026-09-01T10:00:00Z' },
  { empresa: 'Beta SA', cnpj_empresa: '', endereco_emp: '', supervisor_nome: '', supervisor_cargo: '', criado_em: '2026-05-01T10:00:00Z' },
  { empresa: 'beta  sa', cnpj_empresa: null, endereco_emp: 'Av. B, 5', criado_em: '2026-06-01T10:00:00Z' },
  { empresa: '   ', cnpj_empresa: '', criado_em: '2026-07-01T10:00:00Z' }, null, { criado_em: '2026-07-02T10:00:00Z' }
];
const L = sb.empresasRecentes(C);
ok(L.length === 2, 'dedup por CNPJ (formatado ou não) e por nome sem CNPJ; vazios e nulos ignorados');
ok(L[0].empresa === 'ACME LTDA' && L[0].endereco_emp === 'Rua Nova, 2' && L[0].supervisor_nome === 'João', 'vale o contrato MAIS RECENTE da empresa');
ok(L[1].empresa === 'beta  sa'.replace(/\s+/g, ' ') && L[1].endereco_emp === 'Av. B, 5', 'sem CNPJ: nome sem espaços duplicados; o mais recente (jun) vence');
ok(L[0].criado_em === undefined, 'a lista não carrega dados desnecessários');
ok(sb.empresasRecentes(null).length === 0 && sb.empresasRecentes([]).length === 0, 'vazio não quebra');
ok(sb.empresasRecentes(Array.from({ length: 100 }, (_, i) => ({ empresa: 'E' + i, criado_em: '2026-01-01' }))).length === 60, 'limite padrão de 60');
ok(sb.empresasRecentes(Array.from({ length: 100 }, (_, i) => ({ empresa: 'E' + i, criado_em: '2026-01-01' })), 5).length === 5, 'limite informado');
ok(sb.empresaPorNome(L, 'acme ltda').cnpj_empresa === '11222333000181', 'acha por nome sem diferenciar maiúscula');
ok(sb.empresaPorNome(L, '  Acme   Ltda ') !== null, 'ignora espaços sobrando');
ok(sb.empresaPorNome(L, 'Acm') === null && sb.empresaPorNome(L, '') === null && sb.empresaPorNome(L, null) === null, 'nome parcial ou vazio NÃO casa');
const a = sb.camposDaEmpresa(L[0], { cnpj_empresa: '', endereco_emp: ' ', supervisor_nome: 'Maria', supervisor_cargo: '' });
ok(a.cnpj_empresa && a.endereco_emp === 'Rua Nova, 2' && a.supervisor_cargo === 'Gerente' && !('supervisor_nome' in a), 'preenche só os vazios; o que foi digitado fica');
ok(Object.keys(sb.camposDaEmpresa(L[1], {})).join() === 'endereco_emp', 'não inventa campo que a empresa não tem');
ok(Object.keys(sb.camposDaEmpresa(null, {})).length === 0, 'sem empresa, nada a preencher');
console.log('OK ' + n + ' verificações');
