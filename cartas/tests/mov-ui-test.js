// Teste de tela do M15 (novo-movimento.html) em jsdom. Precisa: npm i jsdom.  Rodar: node tests/mov-ui-test.js
// Nível "XX" (jsdom): confere formulário, validações e o que a tela ENVIA ao servidor. NÃO substitui testar no navegador com o Supabase real.
const { JSDOM } = require('jsdom'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), html = fs.readFileSync(path.join(root, 'novo-movimento.html'), 'utf8'), utils = fs.readFileSync(path.join(root, 'assets/cr-utils.js'), 'utf8'), cfg = fs.readFileSync(path.join(root, 'assets/cr-config.js'), 'utf8');
let falhas = 0; const ok = (n, c) => { if (!c) { falhas++; console.log('FALHOU', n); } else console.log('OK    ', n); };
const esperar = ms => new Promise(r => setTimeout(r, ms));
const base = { id: 1, status: 'assinado', tipo: 'estagio', numero_contrato: 'TCE-2026-0001', nome_candidato: 'Ana', empresa: 'ACME', periodo_inicio: '2026-01-10', periodo_fim: '2026-07-10', valor_bolsa: 1000, jornada_horas: '6h', cargo: 'Estagiária' };
const sigs = [{ id: 1, contrato_id: 9, nome: 'Orizon', email: 'o@x.com', papel: 'empresa_nexus', token: 'tokA' }, { id: 2, contrato_id: 9, nome: 'Ana', email: 'a@x.com', papel: 'candidato', token: 'tokB' }];

async function abrir(lista, tipo, rpcResp) {
  const calls = [];
  const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'http://localhost/novo-movimento.html?origem=1' + (tipo ? '&tipo=' + tipo : ''), beforeParse(win) { win.eval(cfg); } }); // R19: a página lê window.CR_CONFIG (cr-config.js, desde a R14) logo ao carregar
  const w = dom.window; w.eval(utils); w.confirm = () => true; w.HTMLElement.prototype.scrollIntoView = () => {};
  const thenable = dados => { const q = { eq() { return q; }, order() { return q; }, then(res) { res({ data: dados, error: null }); } }; return q; };
  w._sb = { auth: { getUser: async () => ({ data: { user: null } }) }, from: t => ({ select: () => thenable(t === 'cr_contratos' ? lista : sigs) }),
    rpc: async (fn, args) => { calls.push([fn, args]); return { data: rpcResp || { ok: true, id: 9, numero: 'ADT-2026-0001', titulo: 'Aditivo do TCE-2026-0001', tipo_mov: args.p_tipo }, error: null }; } };
  await esperar(350); return { w, D: w.document, calls, toasts: () => [...w.document.querySelectorAll('#toast-ct *')].map(x => x.textContent).join(' | ') };
}
const set = (w, id, v) => { const el = w.document.getElementById(id); el.value = v; el.dispatchEvent(new w.Event('input', { bubbles: true })); };

(async () => {
  // 1) aditivo: só o que mudou vai ao servidor
  let t = await abrir([base]);
  ok('mostra o contrato de origem', t.D.getElementById('mvApp').textContent.includes('TCE-2026-0001'));
  ok('3 abas (aditivo, renovação, rescisão)', t.D.querySelectorAll('#mvTabs .cr-tab').length === 3);
  ok('campos vêm preenchidos com o contrato atual', t.D.getElementById('ad_valor_bolsa').value === '1000' && t.D.getElementById('ad_cargo').value === 'Estagiária');
  await t.w.criar(); ok('aditivo sem mudança NÃO chama o servidor', t.calls.length === 0 && /Nenhum campo/.test(t.toasts()));
  set(t.w, 'ad_valor_bolsa', '1200');
  ok('campo alterado fica destacado', t.D.getElementById('ad_valor_bolsa').classList.contains('mv-chg'));
  await t.w.criar();
  ok('chamou cr_criar_movimento 1x', t.calls.length === 1 && t.calls[0][0] === 'cr_criar_movimento');
  ok('enviou SÓ o campo alterado', JSON.stringify(t.calls[0][1].p_alteracoes) === '{"valor_bolsa":1200}' && t.calls[0][1].p_origem === 1 && t.calls[0][1].p_tipo === 'aditivo');
  const links = t.D.getElementById('mvApp').innerHTML;
  ok('mostra um link por signatário (token)', links.includes('assinar-contrato.html?t=tokA') && links.includes('assinar-contrato.html?t=tokB'));
  ok('tem WhatsApp, e-mail e copiar', links.includes('wa.me') && links.includes('✉️ E-mail') && links.includes('Copiar link'));

  // 2) renovação
  t = await abrir([base], 'renovacao');
  ok('abre direto na aba pedida (?tipo=renovacao)', !!t.D.getElementById('mvFim'));
  set(t.w, 'mvFim', '2026-06-01'); await t.w.criar(); ok('renovação com término anterior: bloqueia e não chama servidor', t.calls.length === 0 && /depois do término/.test(t.toasts()));
  set(t.w, 'mvFim', '2028-03-01'); ok('aviso de 2 anos aparece (não bloqueia)', t.D.getElementById('mvWarn').style.display === 'block' && /2 anos/.test(t.D.getElementById('mvWarn').textContent));
  await t.w.criar(); ok('renovação enviada com o novo término', t.calls.length === 1 && t.calls[0][1].p_alteracoes.periodo_fim === '2028-03-01' && t.calls[0][1].p_tipo === 'renovacao' && t.calls[0][1].p_data === null);

  // 3) rescisão
  t = await abrir([base], 'rescisao');
  set(t.w, 'mvData', '2026-05-01'); set(t.w, 'mvMotivo', ''); await t.w.criar(); ok('rescisão sem motivo: bloqueia', t.calls.length === 0 && /motivo/i.test(t.toasts()));
  set(t.w, 'mvMotivo', 'Conclusão do curso'); await t.w.criar();
  ok('rescisão enviada com data e motivo', t.calls.length === 1 && t.calls[0][1].p_data === '2026-05-01' && t.calls[0][1].p_motivo === 'Conclusão do curso' && t.calls[0][1].p_tipo === 'rescisao');

  // 4) bloqueios por regra
  t = await abrir([{ ...base, status: 'enviado' }]); ok('contrato não assinado: tela bloqueia, sem formulário', /ASSINADO/.test(t.D.getElementById('mvApp').textContent) && !t.D.getElementById('mvForm'));
  t = await abrir([base, { ...base, id: 2, contrato_origem_id: 1, tipo_mov: 'aditivo', status: 'enviado' }]); ok('com movimento pendente: tela bloqueia', /movimento em andamento/.test(t.D.getElementById('mvApp').textContent) && !t.D.getElementById('mvForm'));
  t = await abrir([{ ...base, periodo_fim: null }]); ok('sem data de término: não oferece renovação', t.D.querySelectorAll('#mvTabs .cr-tab').length === 2);

  // 5) erro devolvido pelo servidor
  t = await abrir([base], null, { erro: 'ja_possui_movimento' }); set(t.w, 'ad_cargo', 'Outro'); await t.w.criar();
  ok('erro do servidor vira mensagem clara e libera o botão', /já tem um movimento/.test(t.toasts()) && !t.D.getElementById('mvGo').disabled);
  // 6) XSS básico no nome
  t = await abrir([{ ...base, nome_candidato: '<img src=x onerror=alert(1)>' }]); ok('nome com HTML é escapado', !t.D.querySelector('#mvApp img'));

  // 7) vencimentos.html: vale só a versão vigente; rescindido não vence; 12 meses contam do contrato ORIGINAL
  async function venc(lista) {
    const vh = fs.readFileSync(path.join(root, 'vencimentos.html'), 'utf8');
    const dom = new JSDOM(vh, { runScripts: 'dangerously', url: 'http://localhost/vencimentos.html' }); const w = dom.window; w.eval(utils);
    w._sb = { auth: { getUser: async () => ({ data: { user: null } }) }, from: () => ({ select: async () => ({ data: lista, error: null }) }) };
    await esperar(350); return w;
  }
  const dia = n => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
  const ano = n => { const d = new Date(); d.setMonth(d.getMonth() - n); return d.toISOString().slice(0, 10); };
  const mk = (id, o) => ({ id, status: 'assinado', tipo: 'estagio', nome_candidato: 'P' + id, numero_contrato: 'N' + id, contrato_origem_id: null, tipo_mov: null, periodo_inicio: ano(6), periodo_fim: dia(400), ...o });
  let w = await venc([mk(1, { periodo_fim: dia(10) })]);
  ok('vencimentos: contrato comum vencendo em 10 dias aparece', w.document.getElementById('kTer').textContent === '1');
  w = await venc([mk(1, { periodo_fim: dia(10) }), mk(2, { contrato_origem_id: 1, tipo_mov: 'renovacao', periodo_inicio: dia(11), periodo_fim: dia(300) })]);
  ok('vencimentos: renovação ASSINADA tira o original da lista (e a nova ainda não vence)', w.document.getElementById('kTer').textContent === '0');
  w = await venc([mk(1, { periodo_fim: dia(10) }), mk(2, { contrato_origem_id: 1, tipo_mov: 'renovacao', status: 'enviado', periodo_inicio: dia(11), periodo_fim: dia(300) })]);
  ok('vencimentos: renovação ainda NÃO assinada mantém o original na lista', w.document.getElementById('kTer').textContent === '1');
  w = await venc([mk(1, { periodo_fim: dia(10) }), mk(2, { contrato_origem_id: 1, tipo_mov: 'rescisao', periodo_fim: dia(5) })]);
  ok('vencimentos: rescindido (rescisão assinada) não vence nem a rescisão aparece', w.document.getElementById('kTer').textContent === '0');
  w = await venc([mk(1, { periodo_inicio: ano(13), periodo_fim: dia(5) }), mk(2, { contrato_origem_id: 1, tipo_mov: 'renovacao', periodo_inicio: dia(6), periodo_fim: dia(200) })]);
  ok('vencimentos: 12 meses contados do início do ORIGINAL (renovação não zera a conta)', w.document.getElementById('kAni').textContent === '1');
  console.log(falhas ? '\n' + falhas + ' FALHA(S)' : '\nTodos OK'); process.exit(falhas ? 1 : 0);
})();
