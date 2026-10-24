// R28 (M7): tela do Novo Contrato — sugestões e preenchimento de empresa já usada (jsdom). Precisa: npm i jsdom. Rodar: node tests/empresas-ui-test.js
const { JSDOM } = require('jsdom'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), rd = f => fs.readFileSync(path.join(root, f), 'utf8');
let falhas = 0; const ok = (n, c) => { if (!c) { falhas++; console.log('FALHOU', n); } else console.log('OK    ', n); };
const esperar = ms => new Promise(r => setTimeout(r, ms));
const q = (d, err) => { const x = { eq() { return x; }, single() { return x; }, like() { return x; }, order() { return x; }, limit() { return x; }, select() { return x; }, then(res) { res({ data: err ? null : d, error: err || null }); } }; return x; };
const CONTRATOS = [
  { empresa: 'ACME LTDA', cnpj_empresa: '11.222.333/0001-81', endereco_emp: 'Rua Nova, 2', supervisor_nome: 'João', supervisor_cargo: 'Gerente', criado_em: '2026-09-01T10:00:00Z' },
  { empresa: 'Beta SA', cnpj_empresa: '', endereco_emp: 'Av. B, 5', supervisor_nome: '', supervisor_cargo: '', criado_em: '2026-05-01T10:00:00Z' }
];
async function abrir(dados, err) {
  const dom = new JSDOM(rd('novo-contrato.html'), { runScripts: 'dangerously', url: 'http://localhost/novo-contrato.html', beforeParse(w) { w.eval(rd('assets/cr-config.js')); } });
  const w = dom.window; w.eval(rd('assets/cr-utils.js')); w.HTMLElement.prototype.scrollIntoView = () => {};
  w._sb = { auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) }, from: t => ({ select: () => q(t === 'cr_contratos' ? dados : [], err) }), rpc: async () => ({ data: null, error: null }) };
  await esperar(500); return { w, D: w.document };
}
(async () => {
  let t = await abrir(CONTRATOS); const v = id => t.D.getElementById(id);
  const opts = [...t.D.querySelectorAll('#lista-empresas option')].map(o => o.value);
  ok('campo Razão Social aponta para a lista de sugestões', v('empresa').getAttribute('list') === 'lista-empresas');
  ok('sugestões vêm dos contratos anteriores (sem repetir)', opts.length === 2 && opts.includes('ACME LTDA') && opts.includes('Beta SA'));
  v('empresa').value = 'ACME LTDA'; v('empresa').dispatchEvent(new t.w.Event('change', { bubbles: true }));
  ok('escolher a empresa preenche CNPJ, endereço e supervisor', v('cnpj_empresa').value.replace(/\D/g, '') === '11222333000181' && v('endereco_emp').value === 'Rua Nova, 2' && v('supervisor_nome').value === 'João' && v('supervisor_cargo').value === 'Gerente');
  ok('toast avisa para conferir', /Dados da empresa.*Confira/.test(t.D.body.textContent));
  t = await abrir(CONTRATOS); const v2 = id => t.D.getElementById(id);
  v2('endereco_emp').value = 'Meu endereço'; v2('supervisor_nome').value = 'Maria';
  v2('empresa').value = 'ACME LTDA'; v2('empresa').dispatchEvent(new t.w.Event('change', { bubbles: true }));
  ok('NÃO sobrescreve o que já foi digitado', v2('endereco_emp').value === 'Meu endereço' && v2('supervisor_nome').value === 'Maria');
  ok('mas preenche o que estava vazio', v2('cnpj_empresa').value !== '' && v2('supervisor_cargo').value === 'Gerente');
  t = await abrir(CONTRATOS); const v3 = id => t.D.getElementById(id);
  v3('empresa').value = 'Empresa Nova Ltda'; v3('empresa').dispatchEvent(new t.w.Event('change', { bubbles: true }));
  ok('empresa que não está na lista não preenche nada', v3('cnpj_empresa').value === '' && v3('endereco_emp').value === '');
  v3('empresa').value = 'ACM'; v3('empresa').dispatchEvent(new t.w.Event('change', { bubbles: true }));
  ok('nome parcial não preenche', v3('cnpj_empresa').value === '');
  t = await abrir(null, { message: 'sem permissão' });
  ok('se a consulta falhar, a tela segue funcionando (lista vazia)', t.D.querySelectorAll('#lista-empresas option').length === 0 && typeof t.w.aplicarEmpresaUsada === 'function');
  console.log(falhas ? '\n' + falhas + ' FALHA(S)' : '\nTodos OK'); process.exit(falhas ? 1 : 0);
})().catch(e => { console.error('ERRO', e); process.exit(1); });
