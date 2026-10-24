// R40 (M6 + M16): a aba Privacidade MOSTRA os anexos que serão apagados (antes de aplicar) e os que foram (depois), em jsdom com banco falso.
// Precisa: npm i jsdom. Rodar: node tests/retencao-anexos-ui-test.js
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
      if (fn === 'cr_retencao_resumo') return (a.p_meses < 6 || a.p_meses > 240) ? { data: { erro: 'meses_invalido' }, error: null } : { data: o.resumo || { meses: a.p_meses, contratos: 3, cartas: 2, links_vencidos: 1, links_assinados: 0, ja_anonimizados: 5, anexos_contratos: 4, anexos_cartas: 1 }, error: null };
      if (fn === 'cr_retencao_aplicar') return { data: { ok: true, meses: a.p_meses, contratos: 3, signatarios: 7, auditoria: 9, cartas: 2, links_apagados: 1, links_anonimizados: 0, ...(o.aplicar || {}) }, error: null };
      if (fn === 'cr_titular_buscar') return cpfOk(a.p_cpf) ? { data: o.titular || { contratos: 2, contratos_andamento: 1, cartas: 1, candidatos: 1, anexos_contratos: 3, anexos_cartas: 2 }, error: null } : { data: { erro: 'cpf_invalido' }, error: null };
      if (fn === 'cr_titular_anonimizar') return cpfOk(a.p_cpf) ? { data: { ok: true, contratos: 2, cartas: 1, candidatos: 1, ...(o.anon || { anexos_contratos: 3, anexos_cartas: 2 }) }, error: null } : { data: { erro: 'cpf_invalido' }, error: null };
      return { data: null, error: null };
    },
    from(t) { const st = { op: 'select' }, b = { select() { return b; }, order() { return b; }, limit() { return b; }, eq() { return b; },
      upsert(v) { st.op = 'upsert'; st.v = v; return b; }, insert() { st.op = 'insert'; return b; }, update() { st.op = 'update'; return b; }, delete() { st.op = 'delete'; return b; },
      then(res) { if (st.op !== 'select') { ops.push({ t, op: st.op, v: st.v }); if (st.op === 'upsert') cfg.push(st.v); return res({ data: null, error: null }); }
        if (t === 'cr_config') return res({ data: o.config || [], error: null });
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
  // ── retenção: ver ──
  let t = await abrir('admin');
  t.id('ret_meses').value = '36'; await t.w.retVer(); await esperar(60);
  let r = t.id('retResumo').textContent;
  ok('ver: mostra os anexos de contrato e de carta que serão apagados', /4 de contrato\(s\) e 1 de carta\(s\) anexo\(s\) serão APAGADOS junto/.test(r));
  ok('ver: avisa que não dá para recuperar', /não dá para recuperar/.test(r));
  ok('ver: a linha dos anexos fica entre os links e o "já anonimizados" (ordem estável)', r.indexOf('anexo(s)') > r.indexOf('link(s) de carta assinado') && r.indexOf('anexo(s)') < r.indexOf('Já anonimizados'));
  ok('ver continua sem escrever nada', t.sbk.ops.length === 0);
  // ── retenção: aplicar ──
  await t.w.retAplicar(); await esperar(60);
  r = t.id('retResumo').textContent;
  ok('aplicar sem informar anexos (servidor sem o campo): NÃO inventa número', !/Anexos apagados/.test(r) && /Concluído: 3 contrato\(s\)/.test(r));
  t = await abrir('admin', { aplicar: { anexos_contratos: 4, anexos_cartas: 1 } });
  t.id('ret_meses').value = '36'; await t.w.retVer(); await esperar(60); await t.w.retAplicar(); await esperar(60);
  r = t.id('retResumo').textContent;
  ok('aplicar: mostra quantos anexos foram apagados', /Anexos apagados: 4 de contrato\(s\) e 1 de carta\(s\)\./.test(r));
  // ── só um dos dois campos (tabela de carta ainda não criada) ──
  t = await abrir('admin', { resumo: { meses: 24, contratos: 2, cartas: 0, links_vencidos: 0, links_assinados: 0, ja_anonimizados: 0, anexos_contratos: 5, anexos_cartas: null } });
  t.id('ret_meses').value = '24'; await t.w.retVer(); await esperar(60); r = t.id('retResumo').textContent;
  ok('só anexos de contrato vieram: mostra só eles (não mostra "carta" inventada)', /5 de contrato\(s\) anexo\(s\) serão APAGADOS/.test(r) && !/de carta\(s\) anexo/.test(r));
  // ── SQL antigo: nenhum campo ──
  t = await abrir('admin', { resumo: { meses: 24, contratos: 2, cartas: 1, links_vencidos: 0, links_assinados: 0, ja_anonimizados: 1 } });
  t.id('ret_meses').value = '24'; await t.w.retVer(); await esperar(60); r = t.id('retResumo').textContent;
  ok('SQL antigo (sem campos de anexos): a linha some e o resto continua igual', !/anexo/.test(r) && /2 contrato\(s\)/.test(r) && /Já anonimizados antes: 1/.test(r));
  // ── zero é zero (diferente de "sem informação") ──
  t = await abrir('admin', { resumo: { meses: 24, contratos: 1, cartas: 0, links_vencidos: 0, links_assinados: 0, ja_anonimizados: 0, anexos_contratos: 0, anexos_cartas: 0 } });
  t.id('ret_meses').value = '24'; await t.w.retVer(); await esperar(60); r = t.id('retResumo').textContent;
  ok('zero anexo informado pelo servidor: mostra 0 (zero real aparece)', /0 de contrato\(s\) e 0 de carta\(s\) anexo\(s\)/.test(r));
  ok('anexos NÃO decidem o botão: com 1 contrato e 0 anexos o botão libera', t.id('btnRetAplicar').disabled === false);
  t = await abrir('admin', { resumo: { meses: 24, contratos: 0, cartas: 0, links_vencidos: 0, links_assinados: 0, ja_anonimizados: 0, anexos_contratos: 3, anexos_cartas: 3 } });
  t.id('ret_meses').value = '24'; await t.w.retVer(); await esperar(60);
  ok('só anexos "órfãos" na contagem, sem contrato/carta/link: botão continua desabilitado (anexo não entra sozinho)', t.id('btnRetAplicar').disabled === true);

  // ── titular: buscar ──
  t = await abrir('admin');
  t.id('tit_cpf').value = '52998224725'; await t.w.titBuscar(); await esperar(60);
  r = t.id('titResumo').textContent;
  ok('titular: mostra os anexos que seriam apagados', /3 de contrato\(s\) e 2 de carta\(s\) anexo\(s\) serão APAGADOS junto/.test(r));
  ok('titular: o aviso do contrato em andamento continua aparecendo', /1 contrato\(s\) em andamento NÃO serão tocados/.test(r));
  ok('titular: a tela não repete o CPF', !/529|982|247/.test(r));
  // ── titular: aplicar ──
  await t.w.titAplicar(); await esperar(60); r = t.id('titResumo').textContent;
  ok('titular aplicar: mostra os anexos apagados', /Concluído: 2 contrato\(s\), 1 carta\(s\) anonimizados e 1 cadastro\(s\) de candidato excluído\(s\)\. Anexos apagados: 3 de contrato\(s\) e 2 de carta\(s\)\./.test(r));
  ok('titular aplicar: pediu confirmação 1 vez e chamou o servidor 1 vez', t.w.__confirmou === 1 && chamadas(t, 'cr_titular_anonimizar').length === 1);
  t = await abrir('admin', { titular: { contratos: 1, contratos_andamento: 0, cartas: 0, candidatos: 0 } });
  t.id('tit_cpf').value = '52998224725'; await t.w.titBuscar(); await esperar(60);
  ok('titular, SQL antigo: sem linha de anexos', !/anexo/.test(t.id('titResumo').textContent) && /1 contrato\(s\) terminado/.test(t.id('titResumo').textContent));

  // ── operador continua barrado ──
  t = await abrir('operador');
  t.id('ret_meses').value = '36'; await t.w.retVer(); await esperar(60);
  ok('operador: nenhuma contagem de anexo é pedida nem mostrada', chamadas(t, 'cr_retencao_resumo').length === 0 && !/anexo/.test(t.id('retResumo').textContent));

  console.log(falhas ? '\n' + falhas + ' FALHA(S)' : '\nRETENCAO ANEXOS UI: tudo OK');
  process.exit(falhas ? 1 : 0);
})();
