// R44 (M6): lembrete da retenção no Painel Geral (index.html). Precisa: npm i jsdom. Rodar: node tests/retencao-hub-ui-test.js
const { JSDOM } = require('jsdom'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), rd = f => fs.readFileSync(path.join(root, f), 'utf8');
let falhas = 0; const ok = (n, c) => { if (!c) { falhas++; console.log('FALHOU', n); } else console.log('OK    ', n); };
const esperar = ms => new Promise(r => setTimeout(r, ms));
function fake(perfil, o = {}) {
  const ops = [], rpcs = [];
  return { ops, rpcs,
    auth: { getUser: async () => ({ data: { user: { email: 'a@b.c', user_metadata: { nome: 'Ana Souza' } } } }) },
    rpc: async (fn, a) => { rpcs.push(fn); if (fn === 'cr_meu_perfil') return { data: perfil, error: null }; return { data: null, error: null }; },
    from(t) { const st = { op: 'select' }, b = { select() { return b; }, order() { return b; }, limit() { return b; }, eq() { return b; },
      insert() { st.op = 'insert'; return b; }, update() { st.op = 'update'; return b; }, upsert() { st.op = 'upsert'; return b; }, delete() { st.op = 'delete'; return b; },
      then(res) { if (st.op !== 'select') { ops.push({ t, op: st.op }); return res({ data: null, error: null }); }
        if (t === 'cr_log') return res(o.logErro ? { data: null, error: { code: 'x' } } : { data: o.log || [], error: null });
        return res({ data: [], error: null }); } }; return b; } };
}
async function abrir(perfil, o) {
  const sbk = fake(perfil, o);
  const dom = new JSDOM(rd('index.html'), { runScripts: 'outside-only', url: 'http://localhost/index.html', beforeParse(w) { w.eval(rd('assets/cr-config.js')); } });
  const w = dom.window; w.eval(rd('assets/cr-utils.js')); w._sb = sbk;
  // roda só o script inline do painel (os externos — supabase, auth, shell — não são carregados no jsdom)
  const m = [...rd('index.html').matchAll(/<script>([\s\S]*?)<\/script>/g)].pop()[1];
  w.eval(m); await esperar(400);
  return { w, sbk, box: w.document.getElementById('hubRetencao'), txt: w.document.getElementById('hubRetencaoTxt') };
}
(async () => {
  const dias = n => new Date(Date.now() - n * 86400000).toISOString();
  let t = await abrir('admin');
  ok('admin, nunca aplicada: faixa aparece', t.box.style.display !== 'none' && /ainda não foi aplicada/.test(t.txt.textContent));
  ok('a faixa tem o link para a aba Privacidade', t.box.querySelector('a').getAttribute('href') === 'configuracoes.html#privacidade');
  t = await abrir('admin', { log: [{ criado_em: dias(45) }] });
  ok('admin, última há 45 dias: aparece', t.box.style.display !== 'none' && /há 45 dia/.test(t.txt.textContent));
  t = await abrir('admin', { log: [{ criado_em: dias(30) }] });
  ok('exatamente 30 dias: aparece (inclusivo)', t.box.style.display !== 'none');
  t = await abrir('admin', { log: [{ criado_em: dias(10) }] });
  ok('última há 10 dias: NÃO aparece no Painel Geral (sem ruído)', t.box.style.display === 'none');
  t = await abrir('admin', { logErro: true });
  ok('histórico ilegível: escondido (não inventa)', t.box.style.display === 'none');
  t = await abrir('admin', { log: [{ criado_em: 'lixo' }] });
  ok('data inválida: escondido', t.box.style.display === 'none');
  t = await abrir('operador');
  ok('operador: não vê e nem consulta o histórico', t.box.style.display === 'none' && t.txt.textContent === '');
  t = await abrir('admin');
  ok('o painel não escreve nada nem chama a retenção', t.sbk.ops.length === 0 && !t.sbk.rpcs.some(f => /^cr_(ret|tit)/.test(f)));
  console.log(falhas ? 'RETENCAO HUB UI: ' + falhas + ' FALHA(S)' : 'RETENCAO HUB UI: tudo OK'); process.exit(falhas ? 1 : 0);
})();
