// R27 (M8): tela do Novo Contrato — botão 🔎 Buscar CNPJ (jsdom). Precisa: npm i jsdom. Rodar: node tests/cnpj-ui-test.js
const { JSDOM } = require('jsdom'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), rd = f => fs.readFileSync(path.join(root, f), 'utf8');
let falhas = 0; const ok = (n, c) => { if (!c) { falhas++; console.log('FALHOU', n); } else console.log('OK    ', n); };
const esperar = ms => new Promise(r => setTimeout(r, ms));
const q = d => { const x = { eq() { return x; }, single() { return x; }, like() { return x; }, order() { return x; }, limit() { return x; }, select() { return x; }, then(res) { res({ data: d, error: null }); } }; return x; };
async function abrir(resp) {
  const dom = new JSDOM(rd('novo-contrato.html'), { runScripts: 'dangerously', url: 'http://localhost/novo-contrato.html', beforeParse(w) { w.eval(rd('assets/cr-config.js')); } });
  const w = dom.window; w.eval(rd('assets/cr-utils.js')); w.HTMLElement.prototype.scrollIntoView = () => {};
  w._sb = { auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) }, from: () => ({ select: () => q([]) }), rpc: async () => ({ data: null, error: null }) };
  w.fetch = async () => resp; await esperar(400); return { w, D: w.document };
}
const D = { razao_social: 'ACME LTDA', logradouro: 'DAS FLORES', numero: '10', municipio: 'GUAIBA', uf: 'RS', descricao_situacao_cadastral: 'ATIVA' };
const resp = (status, body) => ({ status, ok: status < 300, json: async () => body });
(async () => {
  let t = await abrir(resp(200, D)); const v = id => t.D.getElementById(id);
  v('cnpj_empresa').value = '11.222.333/0001-81'; await t.w.preencherPorCNPJ();
  ok('campos vazios são preenchidos (razão e endereço)', v('empresa').value === 'ACME LTDA' && /DAS FLORES, 10/.test(v('endereco_emp').value));
  ok('toast diz o que foi preenchido', /Preenchido: razão social e endereço/.test(t.D.body.textContent));
  v('empresa').value = 'Meu nome fantasia'; v('endereco_emp').value = ''; await t.w.preencherPorCNPJ();
  ok('NÃO sobrescreve o que já foi digitado', v('empresa').value === 'Meu nome fantasia' && /GUAIBA\/RS/.test(v('endereco_emp').value));
  t = await abrir(resp(200, { ...D, descricao_situacao_cadastral: 'BAIXADA' })); t.D.getElementById('cnpj_empresa').value = '11.222.333/0001-81'; await t.w.preencherPorCNPJ();
  ok('empresa não ativa: preenche mas avisa a situação', /situação BAIXADA/.test(t.D.body.textContent));
  t = await abrir(resp(404, {})); t.D.getElementById('cnpj_empresa').value = '11.222.333/0001-81'; await t.w.preencherPorCNPJ();
  ok('404: avisa e não altera nada', /não encontrado/.test(t.D.body.textContent) && t.D.getElementById('empresa').value === '');
  t.D.getElementById('cnpj_empresa').value = '123'; await t.w.preencherPorCNPJ();
  ok('CNPJ inválido: avisa sem consultar', /CNPJ inválido/.test(t.D.body.textContent));
  ok('botão volta a ficar ativo depois da consulta', !t.D.getElementById('btnCnpj').disabled);
  console.log(falhas ? '\n' + falhas + ' FALHA(S)' : '\nTodos OK'); process.exit(falhas ? 1 : 0);
})().catch(e => { console.error('ERRO', e); process.exit(1); });
