// R43 (M6): lembrete mensal da retenção na aba Privacidade (só aviso; não apaga nada). Precisa: npm i jsdom. Rodar: node tests/retencao-lembrete-ui-test.js
const { JSDOM } = require('jsdom'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), rd = f => fs.readFileSync(path.join(root, f), 'utf8');
let falhas = 0; const ok = (n, c) => { if (!c) { falhas++; console.log('FALHOU', n); } else console.log('OK    ', n); };
const esperar = ms => new Promise(r => setTimeout(r, ms));
function fake(perfil, o = {}) {
  const rpcs = [], ops = [], cfg = [];
  const adm = perfil !== 'operador';
  const cpfOk = c => { const d = String(c || '').replace(/\D/g, ''); return d === '52998224725' || d === '11144477735'; };
  return { rpcs, ops, cfg,
    auth: { getUser: async () => ({ data: { user: { email: 'a@b.c' } } }) },
    rpc: async (fn, a) => {
      rpcs.push({ fn, a });
      if (fn === 'cr_meu_perfil') return { data: perfil === 'erro' ? null : perfil, error: perfil === 'erro' ? { code: '42883' } : null };
      if (o.erro && fn.startsWith('cr_ret') || o.erro && fn.startsWith('cr_tit')) return { data: null, error: o.erro };
      if (!adm && /^cr_(ret|tit)/.test(fn)) return { data: null, error: { code: '42501' } };
      if (fn === 'cr_retencao_resumo') return (a.p_meses < 6 || a.p_meses > 240) ? { data: { erro: 'meses_invalido' }, error: null } : { data: o.resumo || { meses: a.p_meses, contratos: 3, cartas: 2, links_vencidos: 1, links_assinados: 0, ja_anonimizados: 5 }, error: null };
      if (fn === 'cr_retencao_aplicar') return { data: { ok: true, meses: a.p_meses, contratos: 3, signatarios: 7, auditoria: 9, cartas: 2, links_apagados: 1, links_anonimizados: 0 }, error: null };
      if (fn === 'cr_titular_buscar') return cpfOk(a.p_cpf) ? { data: o.titular || { contratos: 2, contratos_andamento: 1, cartas: 1, candidatos: 1 }, error: null } : { data: { erro: 'cpf_invalido' }, error: null };
      if (fn === 'cr_titular_anonimizar') return cpfOk(a.p_cpf) ? { data: { ok: true, contratos: 2, cartas: 1, candidatos: 1 }, error: null } : { data: { erro: 'cpf_invalido' }, error: null };
      return { data: null, error: null };
    },
    from(t) { const st = { op: 'select' }, b = { select() { return b; }, order() { return b; }, limit() { return b; }, eq() { return b; },
      upsert(v) { st.op = 'upsert'; st.v = v; return b; }, insert() { st.op = 'insert'; return b; }, update() { st.op = 'update'; return b; }, delete() { st.op = 'delete'; return b; },
      then(res) { if (st.op !== 'select') { ops.push({ t, op: st.op, v: st.v }); if (st.op === 'upsert') cfg.push(st.v); return res({ data: null, error: null }); }
        if (t === 'cr_config') return res({ data: o.config || [], error: null });
        if (t === 'cr_log') return res(o.logErro ? { data: null, error: { code: 'x' } } : { data: o.log || [], error: null });
        return res({ data: [], error: null }); } }; return b; } };
}
async function abrir(perfil, o, confirma = true) {
  const sbk = fake(perfil, o), dom = new JSDOM(rd('configuracoes.html'), { runScripts: 'dangerously', url: 'http://localhost/configuracoes.html', beforeParse(w) {
    w.eval(rd('assets/cr-config.js')); w.confirm = () => { w.__confirmou = (w.__confirmou || 0) + 1; return confirma; };
    w.HTMLCanvasElement.prototype.getContext = () => new Proxy({}, { get: (x, k) => (k in x ? x[k] : () => {}), set: (x, k, v) => { x[k] = v; return true; } }); } });
  const w = dom.window; w.eval(rd('assets/cr-utils.js')); w.HTMLElement.prototype.scrollIntoView = () => {}; w._sb = sbk; await esperar(450);
  return { w, D: w.document, sbk, txt: () => w.document.body.textContent, id: i => w.document.getElementById(i) };
}
const chamadas = (t, fn) => t.sbk.rpcs.filter(x => x.fn === fn);
(async () => {
  const dias = n => new Date(Date.now() - n * 86400000).toISOString();
  let t = await abrir('admin');
  let m = t.id('retLembrete');
  ok('nunca aplicada: mostra o lembrete', m.style.display !== 'none' && /ainda não foi aplicada/.test(m.textContent));
  t = await abrir('admin', { log: [{ criado_em: dias(45) }] }); m = t.id('retLembrete');
  ok('última há 45 dias: lembra de revisar', m.style.display !== 'none' && /há 45 dia\(s\)\. Está na hora de revisar/.test(m.textContent));
  t = await abrir('admin', { log: [{ criado_em: dias(30) }] }); m = t.id('retLembrete');
  ok('exatamente 30 dias: já lembra (limite inclusivo)', /Está na hora de revisar/.test(m.textContent));
  t = await abrir('admin', { log: [{ criado_em: dias(10) }] }); m = t.id('retLembrete');
  ok('última há 10 dias: só informa, com os 20 dias que faltam', /Última retenção aplicada há 10 dia\(s\)\. Próxima revisão sugerida em 20 dia\(s\)/.test(m.textContent) && !/Está na hora/.test(m.textContent));
  t = await abrir('admin', { logErro: true }); m = t.id('retLembrete');
  ok('histórico ilegível: o aviso fica escondido (não inventa)', m.style.display === 'none' && m.textContent === '');
  t = await abrir('admin', { log: [{ criado_em: 'lixo' }] }); m = t.id('retLembrete');
  ok('data inválida: escondido', m.style.display === 'none');
  t = await abrir('operador');
  ok('operador: não vê o lembrete', t.id('retLembrete').style.display === 'none' && t.id('retLembrete').textContent === '');
  t = await abrir('admin', { log: [{ criado_em: dias(40) }] });
  ok('o lembrete não escreve nada nem chama a retenção', t.sbk.ops.length === 0 && chamadas(t, 'cr_retencao_aplicar').length === 0 && chamadas(t, 'cr_retencao_resumo').length === 0);
  ok('o botão de anonimizar continua desabilitado (lembrete não libera nada)', t.id('btnRetAplicar').disabled === true);
  console.log(falhas ? '\n' + falhas + ' FALHA(S)' : '\nRETENCAO LEMBRETE UI: tudo OK');
  process.exit(falhas ? 1 : 0);
})();
