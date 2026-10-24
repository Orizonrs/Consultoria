// R45: aviso de coerência do recesso na Nova Carta (jsdom). Precisa: npm i jsdom. Rodar: node tests/recesso-aviso-ui-test.js
const { JSDOM } = require('jsdom'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), rd = f => fs.readFileSync(path.join(root, f), 'utf8');
let falhas = 0; const ok = (n, c) => { if (!c) { falhas++; console.log('FALHOU', n); } else console.log('OK    ', n); };
const esperar = ms => new Promise(r => setTimeout(r, ms));
const ctx = () => new Proxy({}, { get: (x, k) => (k in x ? x[k] : () => {}), set: (x, k, v) => { x[k] = v; return true; } });
const sbk = { auth: { getUser: async () => ({ data: { user: { email: 'a@b.c' } } }) }, rpc: async () => ({ data: 'admin', error: null }),
  from() { const b = { select() { return b; }, order() { return b; }, limit() { return b; }, single() { return b; }, eq() { return b; }, then(r) { return r({ data: [], error: null }); } }; return b; } };
async function abrir() {
  const dom = new JSDOM(rd('nova-carta.html'), { runScripts: 'dangerously', url: 'http://localhost/nova-carta.html', beforeParse(w) {
    w.eval(rd('assets/cr-config.js')); w.eval(rd('assets/cr-utils.js')); w.open = () => {}; w.HTMLCanvasElement.prototype.getContext = ctx; w._sb = sbk; } });
  const w = dom.window; w.HTMLElement.prototype.scrollIntoView = () => {}; w._sb = sbk; await esperar(500);
  const D = w.document; return { w, D, id: i => D.getElementById(i), set(i, v) { D.getElementById(i).value = v; D.getElementById(i).dispatchEvent(new w.Event('change')); D.getElementById(i).dispatchEvent(new w.Event('input')); },
    aviso: () => { const b = D.getElementById('recessoAviso'); return b.style.display === 'none' ? '' : b.textContent; } };
}
(async () => {
  let t = await abrir(); t.w.setTipo('carta_recesso');
  ok('sem datas: nenhum aviso', t.aviso() === '');
  t.set('recesso_inicio', '2026-07-01'); t.set('recesso_fim', '2026-07-30');
  ok('01/07 a 30/07 = 30 dias e campo 30: sem aviso', t.aviso() === '');
  t.set('recesso_fim', '2026-07-15');
  ok('15 dias corridos x campo 30: avisa os dois números', /15 dia\(s\) corrido\(s\)/.test(t.aviso()) && /em 30/.test(t.aviso()));
  ok('só avisa: o campo continua 30 e o tipo não mudou', t.id('dias_recesso').value === '30' && t.w.eval('_tipo') === 'carta_recesso');
  t.set('dias_recesso', '15'); ok('ajustar o campo para 15 some o aviso', t.aviso() === '');
  t.set('recesso_fim', '2026-06-20'); ok('fim antes do início: avisa', /anterior ao início/.test(t.aviso()));
  t.set('recesso_inicio', '2026-07-01'); t.set('recesso_fim', '2026-07-15'); t.set('periodo_inicio', '2026-07-05'); t.set('periodo_fim', '2026-12-31');
  ok('recesso começa antes do contrato: avisa', /antes do início do contrato/.test(t.aviso()));
  t.set('periodo_inicio', '2026-01-01'); t.set('periodo_fim', '2026-07-10');
  ok('recesso termina depois do contrato: avisa', /depois do fim do contrato/.test(t.aviso()));
  t.set('periodo_inicio', ''); t.set('periodo_fim', ''); t.set('dias_recesso', '15'); t.set('recesso_inicio', '2026-02-30'); t.w.schedulePreview(); ok('data impossível (30/02) é ignorada: nenhum aviso', t.aviso() === '');
  // limites de um dia
  t.set('periodo_inicio', ''); t.set('periodo_fim', ''); t.set('recesso_inicio', '2026-07-10'); t.set('recesso_fim', '2026-07-09'); t.set('dias_recesso', '1');
  ok('fim um dia ANTES do início: avisa', /anterior ao início/.test(t.aviso()));
  t.set('recesso_fim', '2026-07-10'); ok('início = fim (1 dia, campo 1): sem aviso', t.aviso() === '');
  t.set('periodo_inicio', '2026-07-11'); t.set('periodo_fim', '2026-12-31'); ok('recesso um dia antes do contrato: avisa', /antes do início do contrato/.test(t.aviso()));
  t.set('periodo_inicio', '2026-07-10'); t.set('periodo_fim', '2026-07-10'); ok('recesso no mesmo dia do contrato (limites iguais): sem aviso', t.aviso() === '');
  t.set('periodo_inicio', '2026-01-01'); t.set('periodo_fim', '2026-07-09'); ok('recesso um dia depois do fim do contrato: avisa', /depois do fim do contrato/.test(t.aviso()));
  t.set('periodo_fim', '2026-07-10'); ok('recesso termina no último dia do contrato: sem aviso', t.aviso() === '');
  t.set('periodo_inicio', '2026-07-10'); t.set('periodo_fim', '2026-07-09'); ok('contrato com fim antes do início é ignorado (não inventa)', t.aviso() === '');
  t.w.setTipo('carta_recomendacao'); ok('outro tipo: faixa escondida', t.aviso() === '');
  t.w.setTipo('carta_cancelamento'); t.set('recesso_inicio', '2026-07-01'); t.set('recesso_fim', '2026-07-03'); t.set('dias_recesso', '10');
  ok('cancelamento (também tem o bloco): avisa', /3 dia\(s\) corrido\(s\)/.test(t.aviso()));
  const d = t.w.eval('dadosForm()'); ok('a carta continua gravando o número do campo (10)', d.dias_recesso === 10);
  console.log(falhas ? 'RECESSO AVISO UI: ' + falhas + ' FALHA(S)' : 'RECESSO AVISO UI: tudo OK'); process.exit(falhas ? 1 : 0);
})();
