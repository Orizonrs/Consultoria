// R34 (M6): aba Privacidade (LGPD) em jsdom, com banco falso que imita as regras do servidor. Precisa: npm i jsdom. Rodar: node tests/retencao-ui-test.js
const { JSDOM } = require('jsdom'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), rd = f => fs.readFileSync(path.join(root, f), 'utf8');
let falhas = 0; const ok = (n, c) => { if (!c) { falhas++; console.log('FALHOU', n); } else console.log('OK    ', n); };
const esperar = ms => new Promise(r => setTimeout(r, ms));
// cliente falso: perfil pedido; resumo/aplicar/buscar/anonimizar imitam o servidor (prazo 6-240, CPF válido, só admin)
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
  // ── operador ──
  let t = await abrir('operador');
  ok('operador: vê só o aviso da aba (formulário escondido)', t.id('lgpdAdmin').style.display === 'none' && t.id('lgpdOperador').style.display !== 'none');
  t.id('ret_meses').value = '24'; await t.w.retVer(); await esperar(60);
  ok('operador: "Ver" não chama o servidor e mostra o aviso de admin', chamadas(t, 'cr_retencao_resumo').length === 0 && /Somente administradores podem ver a retenção/.test(t.txt()));
  t.id('tit_cpf').value = '529.982.247-25'; await t.w.titBuscar(); await esperar(60);
  ok('operador: buscar titular não chama o servidor', chamadas(t, 'cr_titular_buscar').length === 0);
  await t.w.retAplicar(); await t.w.titAplicar(); await esperar(60);
  ok('operador: aplicar não chama o servidor e não pede confirmação', chamadas(t, 'cr_retencao_aplicar').length === 0 && chamadas(t, 'cr_titular_anonimizar').length === 0 && !t.w.__confirmou);

  // ── admin: retenção ──
  t = await abrir('admin', { config: [{ chave: 'retencao', valor: { meses: 36 } }] });
  ok('admin: vê o formulário e o prazo salvo (36) é carregado', t.id('lgpdAdmin').style.display !== 'none' && t.id('ret_meses').value === '36');
  ok('admin: "Anonimizar agora" começa DESABILITADO', t.id('btnRetAplicar').disabled === true && t.id('btnTitAplicar').disabled === true);
  await t.w.retAplicar(); await esperar(60);
  ok('aplicar sem ver antes: recusa, não chama o servidor, não pergunta', chamadas(t, 'cr_retencao_aplicar').length === 0 && /Ver o que entra/.test(t.txt()) && !t.w.__confirmou);
  t.id('ret_meses').value = '5'; await t.w.retVer(); await esperar(60);
  ok('prazo 5: avisa 6 a 240 e não chama o servidor', chamadas(t, 'cr_retencao_resumo').length === 0 && /entre 6 e 240/.test(t.txt()));
  t.id('ret_meses').value = '241'; await t.w.retVer(); await esperar(60);
  ok('prazo 241: idem', chamadas(t, 'cr_retencao_resumo').length === 0);
  t.id('ret_meses').value = ''; await t.w.retVer(); await esperar(60);
  ok('prazo vazio: idem', chamadas(t, 'cr_retencao_resumo').length === 0);
  t.id('ret_meses').value = '36'; await t.w.retVer(); await esperar(60);
  const rs = chamadas(t, 'cr_retencao_resumo');
  ok('ver: chama o resumo com 36 e mostra as contagens', rs.length === 1 && rs[0].a.p_meses === 36 && /3 contrato\(s\)/.test(t.id('retResumo').textContent) && /2 carta\(s\)/.test(t.id('retResumo').textContent) && /1 link\(s\) de carta vencido/.test(t.id('retResumo').textContent) && /5 contrato/.test(t.id('retResumo').textContent));
  ok('ver NÃO altera nada (nenhuma escrita) e libera o botão', t.sbk.ops.length === 0 && t.id('btnRetAplicar').disabled === false);
  t.id('ret_meses').value = '48'; t.id('ret_meses').dispatchEvent(new t.w.Event('input'));
  ok('mudar o prazo depois de ver DESABILITA o botão de novo', t.id('btnRetAplicar').disabled === true);
  await t.w.retAplicar(); await esperar(60);
  ok('mudou o prazo e tentou aplicar: recusa sem chamar o servidor', chamadas(t, 'cr_retencao_aplicar').length === 0);
  t.id('ret_meses').value = '36'; t.id('ret_meses').dispatchEvent(new t.w.Event('input')); await t.w.retVer(); await esperar(60);
  await t.w.retAplicar(); await esperar(60);
  const ap = chamadas(t, 'cr_retencao_aplicar');
  ok('ver de novo + aplicar: pergunta 1 vez e chama o servidor com 36', t.w.__confirmou === 1 && ap.length === 1 && ap[0].a.p_meses === 36);
  ok('depois de aplicar mostra o resultado e exige ver de novo', /Concluído: 3 contrato\(s\) e 7 assinatura\(s\)/.test(t.id('retResumo').textContent) && t.id('btnRetAplicar').disabled === true);
  await t.w.retAplicar(); await esperar(60);
  ok('não dá para aplicar duas vezes seguidas sem ver', chamadas(t, 'cr_retencao_aplicar').length === 1);
  t.id('ret_meses').value = '60'; await t.w.retSalvar(); await esperar(60);
  ok('salvar prazo grava cr_config "retencao" com os meses', t.sbk.cfg.some(v => v.chave === 'retencao' && v.valor.meses === 60));
  t.id('ret_meses').value = '2'; t.sbk.cfg.length = 0; await t.w.retSalvar(); await esperar(60);
  ok('salvar prazo inválido: não grava', t.sbk.cfg.length === 0);

  // cancelar na confirmação
  t = await abrir('admin', {}, false); t.id('ret_meses').value = '24'; await t.w.retVer(); await esperar(60); await t.w.retAplicar(); await esperar(60);
  ok('cancelou a confirmação: nada é chamado', chamadas(t, 'cr_retencao_aplicar').length === 0 && t.w.__confirmou === 1);
  // nada a anonimizar
  t = await abrir('admin', { resumo: { meses: 24, contratos: 0, cartas: 0, links_vencidos: 0, links_assinados: 0, ja_anonimizados: 0 } }); t.id('ret_meses').value = '24'; await t.w.retVer(); await esperar(60);
  ok('resumo zerado: botão continua desabilitado e avisa', t.id('btnRetAplicar').disabled === true && /Nada a anonimizar/.test(t.txt()));

  // ── admin: titular ──
  t = await abrir('admin');
  t.id('tit_cpf').value = '123.456.789-00'; await t.w.titBuscar(); await esperar(60);
  ok('CPF inválido: avisa no navegador e NÃO chama o servidor', chamadas(t, 'cr_titular_buscar').length === 0 && /CPF inválido/.test(t.txt()));
  t.id('tit_cpf').value = ''; await t.w.titBuscar(); await esperar(60);
  ok('CPF vazio: idem', chamadas(t, 'cr_titular_buscar').length === 0);
  t.id('tit_cpf').value = '52998224725'; t.w.maskCPF(t.id('tit_cpf'));
  await t.w.titAplicar(); await esperar(60);
  ok('anonimizar titular sem buscar antes: recusa, não chama, não pergunta', chamadas(t, 'cr_titular_anonimizar').length === 0 && !t.w.__confirmou && /Buscar/.test(t.txt()));
  await t.w.titBuscar(); await esperar(60);
  ok('buscar: mostra as contagens e AVISA do contrato em andamento', /2 contrato\(s\) terminado/.test(t.id('titResumo').textContent) && /1 carta/.test(t.id('titResumo').textContent) && /1 cadastro/.test(t.id('titResumo').textContent) && /1 contrato\(s\) em andamento NÃO serão tocados/.test(t.id('titResumo').textContent));
  ok('a tela não repete o CPF na resposta', !/529|982|247/.test(t.id('titResumo').textContent));
  ok('buscar não altera nada e libera o botão', t.sbk.ops.length === 0 && t.id('btnTitAplicar').disabled === false);
  t.id('tit_cpf').value = '111.444.777-35'; t.id('tit_cpf').dispatchEvent(new t.w.Event('input'));
  ok('trocar o CPF depois de buscar zera o resultado e desabilita', t.id('btnTitAplicar').disabled === true && t.id('titResumo').textContent === '');
  t.id('tit_cpf').value = '529.982.247-25'; t.id('tit_cpf').dispatchEvent(new t.w.Event('input')); await t.w.titBuscar(); await esperar(60); await t.w.titAplicar(); await esperar(60);
  const an = chamadas(t, 'cr_titular_anonimizar');
  ok('buscar + anonimizar: pergunta 1 vez e chama o servidor', t.w.__confirmou === 1 && an.length === 1 && String(an[0].a.p_cpf).replace(/\D/g, '') === '52998224725');
  ok('depois: mostra o resultado, limpa o campo do CPF e exige buscar de novo', /Concluído: 2 contrato\(s\), 1 carta\(s\) anonimizados e 1 cadastro\(s\) de candidato excluído/.test(t.id('titResumo').textContent) && t.id('tit_cpf').value === '' && t.id('btnTitAplicar').disabled === true);
  ok('o CPF digitado não aparece em lugar nenhum da página depois', !/529\.?982\.?247/.test(t.D.documentElement.outerHTML.replace(/placeholder="[^"]*"/g, '')));
  ok('a tela não gravou nada além das chamadas de servidor (sem upsert/insert/delete direto)', t.sbk.ops.length === 0);
  ok('a tela não chama cr_log por conta própria (o servidor registra)', !t.sbk.rpcs.some(x => x.fn === 'cr_log' && /retencao|titular/.test(JSON.stringify(x.a))));

  // ── erros do servidor ──
  t = await abrir('admin', { erro: { code: '42883', message: 'function does not exist' } }); t.id('ret_meses').value = '24'; await t.w.retVer(); await esperar(60);
  ok('SQL antigo (função não existe): mensagem manda rodar o SQL da R34', /rode sql\/cr-schema\.sql \(R34\)/.test(t.txt()) && t.id('btnRetAplicar').disabled === true);
  t = await abrir('admin', { erro: { code: '42501', message: 'x' } }); t.id('tit_cpf').value = '529.982.247-25'; await t.w.titBuscar(); await esperar(60);
  ok('servidor recusa (não é admin de verdade): mensagem clara', /Somente administradores/.test(t.txt()));
  t = await abrir('erro');
  ok('perfil indisponível (SQL antigo): a tela abre como antes (admin) e o servidor decide', t.id('lgpdAdmin').style.display !== 'none');
  process.exit(falhas ? 1 : 0);
})();
