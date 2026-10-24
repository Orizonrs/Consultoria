// R29 (M9): tela do Novo Contrato — aviso de supervisor com 10+ estagiários ativos (jsdom). Precisa: npm i jsdom. Rodar: node tests/supervisor-ui-test.js
const { JSDOM } = require('jsdom'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), rd = f => fs.readFileSync(path.join(root, f), 'utf8');
let falhas = 0; const ok = (n, c) => { if (!c) { falhas++; console.log('FALHOU', n); } else console.log('OK    ', n); };
const esperar = ms => new Promise(r => setTimeout(r, ms));
const q = (d, err) => { const x = { eq() { return x; }, single() { return x; }, like() { return x; }, order() { return x; }, limit() { return x; }, select() { return x; }, then(res) { res({ data: err ? null : d, error: err || null }); } }; return x; };
const futuro = new Date(Date.now() + 200 * 86400000).toISOString().slice(0, 10);
const mk = n => Array.from({ length: n }, (_, i) => ({ tipo: 'estagio', empresa: 'ACME LTDA', cnpj_empresa: '11.222.333/0001-81', cpf: String(20000000000 + i), nome_candidato: 'Cand ' + i,
  supervisor_nome: 'João Santos', status: 'enviado', tipo_mov: null, periodo_fim: futuro, criado_em: '2026-03-01T10:00:00Z' }));
async function abrir(dados, err) {
  const dom = new JSDOM(rd('novo-contrato.html'), { runScripts: 'dangerously', url: 'http://localhost/novo-contrato.html', beforeParse(w) { w.eval(rd('assets/cr-config.js')); } });
  const w = dom.window; w.eval(rd('assets/cr-utils.js')); w.HTMLElement.prototype.scrollIntoView = () => {};
  w._sb = { auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) }, from: t => ({ select: () => q(t === 'cr_contratos' ? dados : [], err) }), rpc: async () => ({ data: null, error: null }) };
  await esperar(500); return { w, D: w.document };
}
const digitar = (t, id, val) => { const el = t.D.getElementById(id); el.value = val; el.dispatchEvent(new t.w.Event('input', { bubbles: true })); };
const avisos = t => [...t.D.querySelectorAll('.avisos-legais')].map(e => e.textContent).join(' ');
(async () => {
  let t = await abrir(mk(10));
  digitar(t, 'empresa', 'ACME LTDA'); digitar(t, 'cnpj_empresa', '11222333000181'); digitar(t, 'supervisor_nome', 'joão santos');
  ok('10 ativos do supervisor + este = 11: aparece o aviso (art. 9º, III)', /já acompanha 10 estagiários/.test(avisos(t)) && /art\. 9º, III/.test(avisos(t)));
  digitar(t, 'supervisor_nome', 'Outra Pessoa');
  ok('trocar o supervisor faz o aviso sumir ao digitar', !/art\. 9º, III/.test(avisos(t)));
  digitar(t, 'supervisor_nome', 'João Santos'); digitar(t, 'empresa', 'Outra Empresa'); digitar(t, 'cnpj_empresa', '');
  ok('outra empresa: sem aviso', !/art\. 9º, III/.test(avisos(t)));
  t = await abrir(mk(9)); digitar(t, 'empresa', 'ACME LTDA'); digitar(t, 'cnpj_empresa', '11222333000181'); digitar(t, 'supervisor_nome', 'João Santos');
  ok('9 ativos + este = 10: dentro do limite, sem aviso', !/art\. 9º, III/.test(avisos(t)));
  t = await abrir(null, { message: 'sem permissão' }); digitar(t, 'empresa', 'ACME LTDA'); digitar(t, 'supervisor_nome', 'João Santos');
  ok('se a consulta falhar, a tela funciona e não inventa aviso', !/art\. 9º, III/.test(avisos(t)) && typeof t.w.carregarContratosEstagio === 'function');
  console.log(falhas ? '\n' + falhas + ' FALHA(S)' : '\nTodos OK'); process.exit(falhas ? 1 : 0);
})().catch(e => { console.error('ERRO', e); process.exit(1); });
