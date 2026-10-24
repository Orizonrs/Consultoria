// R27 (M8): busca de CNPJ (sem dependências). Uso: node tests/cnpj-test.js
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const sb = { console, setInterval() {}, clearInterval() {}, setTimeout() {}, localStorage: { length: 0, getItem() { return null }, setItem() {}, removeItem() {} },
  document: { getElementById() { return null }, querySelector() { return null }, querySelectorAll() { return [] }, addEventListener() {}, readyState: 'complete' }, navigator: {}, location: { origin: 'http://x', pathname: '/a/b.html' }, toast() {} };
sb.window = sb; vm.createContext(sb);
['cr-config.js', 'cr-utils.js'].forEach(f => vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'assets', f), 'utf8'), sb));
let n = 0; const ok = (c, m) => { assert(c, m); n++; };
const D = { razao_social: 'ACME LTDA', descricao_tipo_de_logradouro: 'RUA', logradouro: 'DAS FLORES', numero: '10', complemento: 'SALA 2', bairro: 'CENTRO', municipio: 'GUAIBA', uf: 'RS', cep: '92500000', descricao_situacao_cadastral: 'ATIVA' };
ok(sb.enderecoDoCNPJ(D) === 'RUA DAS FLORES, 10, SALA 2 · CENTRO · GUAIBA/RS · CEP 92500-000', 'endereço completo formatado');
ok(sb.enderecoDoCNPJ({ logradouro: 'AV X', numero: 'S/N', municipio: 'POA', uf: 'RS' }) === 'AV X, s/n · POA/RS', 'S/N vira s/n, sem campos vazios');
ok(sb.enderecoDoCNPJ(null) === '' && sb.enderecoDoCNPJ({}) === '', 'vazio não quebra');
const f = (status, body) => async () => ({ status, ok: status >= 200 && status < 300, json: async () => body });
(async () => {
  const CNPJ = '11.222.333/0001-81';
  ok(sb.validarCNPJ(CNPJ), 'CNPJ de teste é válido');
  let r = await sb.buscarCNPJ('11.222.333/0001-80', f(200, D)); ok(/inválido/.test(r.erro), 'dígito errado nem consulta');
  let chamou = null; r = await sb.buscarCNPJ(CNPJ, async u => { chamou = u; return f(200, D)(); });
  ok(chamou === 'https://brasilapi.com.br/api/cnpj/v1/11222333000181', 'consulta só com 14 dígitos, sem máscara');
  ok(r.razao === 'ACME LTDA' && /GUAIBA\/RS/.test(r.endereco) && r.situacao === 'ATIVA', 'devolve razão, endereço e situação');
  r = await sb.buscarCNPJ(CNPJ, f(404, {})); ok(/não encontrado/.test(r.erro), '404 explicado');
  r = await sb.buscarCNPJ(CNPJ, f(429, {})); ok(/indisponível.*429/.test(r.erro), 'limite/queda explicado');
  const log = console.error; console.error = () => {}; r = await sb.buscarCNPJ(CNPJ, async () => { throw new Error('rede'); }); console.error = log;
  ok(/Sem conexão/.test(r.erro), 'falha de rede não derruba');
  console.log('CNPJ JS: ' + n + ' verificações OK');
})().catch(e => { console.error('FALHOU:', e.message); process.exit(1); });
