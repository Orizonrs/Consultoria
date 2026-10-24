// R39 (M16): anexos.html?carta=ID em jsdom, com banco falso. Precisa: npm i jsdom. Rodar: node tests/anexos-carta-ui-test.js
const { JSDOM } = require('jsdom'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), rd = f => fs.readFileSync(path.join(root, f), 'utf8');
let falhas = 0; const ok = (n, c) => { if (!c) { falhas++; console.log('FALHOU', n); } else console.log('OK    ', n); };
const esperar = ms => new Promise(r => setTimeout(r, ms));
function fake(perfil, o = {}) {
  const rpcs = [], tabelas = []; let seq = 10;
  let lista = [{ id: 1, carta_id: 7, categoria: 'documento_pessoal', nome: '<img src=x onerror=alert(1)>.pdf', tipo: 'pdf', tamanho: 1500, hash_sha256: 'abcdef0123456789ff', criado_em: '2026-10-20T10:00:00Z' }];
  return { rpcs, tabelas, auth: { getUser: async () => ({ data: { user: { email: 'a@b.c' } } }) },
    rpc: async (fn, a) => { rpcs.push({ fn, a });
      if (fn === 'cr_meu_perfil') return { data: perfil, error: null };
      if (fn === 'cr_anexo_carta_adicionar') { if (o.erroAdd) return { data: { erro: o.erroAdd }, error: null }; lista.unshift({ id: ++seq, carta_id: a.p_carta, categoria: a.p_categoria, nome: a.p_nome, tipo: 'pdf', tamanho: 4, hash_sha256: 'h'.repeat(64), criado_em: '2026-10-23T10:00:00Z' }); return { data: { ok: true }, error: null }; }
      if (fn === 'cr_anexo_carta_baixar') return { data: { nome: 'rg.pdf', tipo: 'pdf', base64: 'JVBERg==' }, error: null };
      if (fn === 'cr_anexo_carta_excluir') { if (perfil === 'operador') return { data: null, error: { code: '42501' } }; lista = lista.filter(x => x.id !== a.p_id); return { data: { ok: true }, error: null }; }
      return { data: null, error: null }; },
    from(t) { tabelas.push(t); const b = { select() { return b; }, order() { return b; }, eq() { return b; }, single() { return b; },
      then(res) {
        if (t === 'cr_cartas') return res(o.carta === null ? { data: null, error: { code: 'PGRST116' } } : { data: o.carta || { id: 7, numero_carta: 'REC-2026-0007', nome: 'Ana Souza' }, error: null });
        if (t === 'cr_anexos_carta') return res(o.semTabela ? { data: null, error: { code: 'PGRST205' } } : { data: lista.slice(), error: null });
        return res({ data: [], error: null }); } }; return b; } };
}
async function abrir(perfil, o = {}, query = '?carta=7') {
  const sb = fake(perfil, o), dom = new JSDOM(rd('anexos.html'), { runScripts: 'dangerously', url: 'http://localhost/anexos.html' + query, beforeParse(w) {
    w.eval(rd('assets/cr-config.js')); w.eval(rd('assets/cr-utils.js')); w.confirm = () => true; w.URL.createObjectURL = () => 'blob:x'; w.URL.revokeObjectURL = () => {};
    w.HTMLCanvasElement.prototype.getContext = () => new Proxy({}, { get: (x, k) => (k in x ? x[k] : () => {}), set: (x, k, v) => { x[k] = v; return true; } }); w._sb = sb; } });
  const w = dom.window; w.HTMLElement.prototype.scrollIntoView = () => {}; w._sb = sb; await esperar(500);
  return { w, D: w.document, sb, id: i => w.document.getElementById(i), tx: () => w.document.body.textContent, toasts: () => (w.document.getElementById('toast-ct') || { textContent: '' }).textContent };
}
function anexar(t, nome, cat) {
  const inp = t.id('axArq'); t.id('axCat').value = cat;
  Object.defineProperty(inp, 'files', { value: [new t.w.File([new Uint8Array([37, 80, 68, 70])], nome, { type: 'application/pdf' })], configurable: true });
}
(async () => {
  let t = await abrir('admin');
  ok('carta: lê a tabela de CARTAS e a carta (não a de contratos)', t.sb.tabelas.includes('cr_anexos_carta') && t.sb.tabelas.includes('cr_cartas') && !t.sb.tabelas.includes('cr_anexos') && !t.sb.tabelas.includes('cr_contratos'));
  ok('carta: mostra o número e o nome, rótulo "Carta", voltar para o painel de cartas', t.id('axNumero').textContent === 'REC-2026-0007' && /Ana Souza/.test(t.id('axTitulo').textContent) && t.id('axRotulo').textContent === 'Carta' && /index-cartas\.html$/.test(t.id('axVoltar').getAttribute('href')));
  ok('carta: lista o anexo com o nome ESCAPADO (sem XSS)', !t.D.querySelector('#axLista img') && /&lt;img/.test(t.id('axLista').innerHTML) && /1 de 10 anexos/.test(t.id('axContagem').textContent));
  ok('carta: a nota LGPD fala em carta', /quando a carta é anonimizada/.test(t.id('axNota').textContent) && !/o contrato é anonimizado/.test(t.id('axNota').textContent));
  anexar(t, 'comprovante.pdf', 'comprovante_matricula'); await t.w.enviar(); await esperar(200);
  const add = t.sb.rpcs.filter(x => x.fn === 'cr_anexo_carta_adicionar');
  ok('anexar: chama cr_anexo_carta_adicionar com p_carta (não p_contrato) e o arquivo em base64', add.length === 1 && add[0].a.p_carta === 7 && !('p_contrato' in add[0].a) && add[0].a.p_categoria === 'comprovante_matricula' && /^JVBERg/.test(add[0].a.p_base64) && /Anexo incluído/.test(t.toasts()));
  ok('anexar: nunca chama a função de CONTRATO', !t.sb.rpcs.some(x => /^cr_anexo_(adicionar|baixar|excluir)$/.test(x.fn)));
  await t.w.baixar(1); await esperar(80);
  ok('baixar: usa cr_anexo_carta_baixar', t.sb.rpcs.some(x => x.fn === 'cr_anexo_carta_baixar' && x.a.p_id === 1));
  await t.w.excluir(1); await esperar(150);
  ok('excluir (admin): confirma e usa cr_anexo_carta_excluir', t.sb.rpcs.some(x => x.fn === 'cr_anexo_carta_excluir' && x.a.p_id === 1) && /Anexo excluído/.test(t.toasts()));
  // erros com a palavra "carta"
  t = await abrir('admin', { erroAdd: 'limite' }); anexar(t, 'a.pdf', 'outro'); await t.w.enviar(); await esperar(150);
  ok('limite: "Esta carta já tem 10 anexos"', /Esta carta já tem 10 anexos/.test(t.toasts()));
  t = await abrir('admin', { erroAdd: 'duplicado' }); anexar(t, 'a.pdf', 'outro'); await t.w.enviar(); await esperar(150);
  ok('duplicado: "anexado a esta carta"', /anexado a esta carta/.test(t.toasts()));
  t = await abrir('admin', { erroAdd: 'carta_anonimizada' }); anexar(t, 'a.pdf', 'outro'); await t.w.enviar(); await esperar(150);
  ok('carta anonimizada (erro do servidor): mensagem clara', /Carta anonimizada: não recebe anexos/.test(t.toasts()));
  // operador
  t = await abrir('operador'); await t.w.excluir(1); await esperar(120);
  ok('operador: excluir é barrado antes de chamar o servidor', !t.sb.rpcs.some(x => x.fn === 'cr_anexo_carta_excluir'));
  // carta anonimizada na abertura / inexistente / sem id / sem SQL
  t = await abrir('admin', { carta: { id: 7, numero_carta: 'REC-1', nome: 'Titular anonimizado', anonimizado_em: '2026-10-01T00:00:00Z' } });
  ok('carta anonimizada: aviso e SEM formulário', /Carta anonimizada/.test(t.id('axAviso').textContent) && t.id('axFormCard').style.display === 'none');
  t = await abrir('admin', { carta: null }); ok('carta inexistente: "Carta não encontrada."', /Carta não encontrada/.test(t.id('axAviso').textContent));
  t = await abrir('admin', {}, '?carta=abc'); ok('id inválido: orienta a abrir pelo botão da carta', /botão 📎 de uma carta/.test(t.id('axAviso').textContent));
  t = await abrir('admin', { semTabela: true }); ok('sem a tabela: avisa R39 e bloqueia o envio', /R39/.test(t.id('axAviso').textContent) && t.id('axEnviar').disabled);
  // contrato continua igual
  const c = await abrir('admin', {}, '?id=7'); ok('?id= continua sendo CONTRATO (rótulo, tabela)', c.id('axRotulo').textContent === 'Contrato' && c.sb.tabelas.includes('cr_contratos') && !c.sb.tabelas.includes('cr_anexos_carta') && !c.sb.tabelas.includes('cr_cartas') && /index-contratos\.html$/.test(c.id('axVoltar').getAttribute('href')));
  // lista de cartas
  const lc = rd('index-cartas.html'); ok('index-cartas: botão 📎 leva a anexos.html?carta=ID', /href="anexos\.html\?carta=\$\{Number\(c\.id\)\}"/.test(lc));
  console.log(falhas ? '\n' + falhas + ' FALHA(S)' : '\nTudo OK'); process.exit(falhas ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
