// R35 (M10): aba Modelos (configuracoes.html) e cláusulas no contrato (visualizar-assinado.html) em jsdom, com banco falso. Precisa: npm i jsdom. Rodar: node tests/modelos-ui-test.js
const { JSDOM } = require('jsdom'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), rd = f => fs.readFileSync(path.join(root, f), 'utf8');
let falhas = 0; const ok = (n, c) => { if (!c) { falhas++; console.log('FALHOU', n); } else console.log('OK    ', n); };
const esperar = ms => new Promise(r => setTimeout(r, ms));
const V1 = '**Cláusula 1ª — Objeto:** Texto da versão um com apólice {{apolice}} e mais um pouco de texto aqui.';
const ctx = () => new Proxy({}, { get: (x, k) => (k in x ? x[k] : () => {}), set: (x, k, v) => { x[k] = v; return true; } });

function fake(perfil, o = {}) {
  const rpcs = [];
  let versoes = o.versoes || [{ id: 1, versao: 1, texto: V1, ativo: true, criado_em: '2026-10-01T10:00:00Z' }];
  return { rpcs,
    auth: { getUser: async () => ({ data: { user: { email: 'a@b.c' } } }) },
    rpc: async (fn, a) => {
      rpcs.push({ fn, a });
      if (fn === 'cr_meu_perfil') return { data: perfil, error: null };
      if (fn === 'cr_modelo_publicar') {
        if (perfil === 'operador') return { data: null, error: { code: '42501' } };
        if (o.publicarErro) return { data: { erro: o.publicarErro }, error: null };
        const v = versoes.length + 1; versoes = versoes.map(x => ({ ...x, ativo: false })); versoes.push({ id: v, versao: v, texto: a.p_texto, ativo: true, criado_em: '2026-10-23T10:00:00Z' });
        return { data: { ok: true, id: v, versao: v }, error: null };
      }
      if (fn === 'cr_modelo_ativar') { const m = versoes.find(x => x.id === a.p_id); versoes = versoes.map(x => ({ ...x, ativo: x.id === a.p_id })); return { data: { ok: true, versao: m.versao }, error: null }; }
      return { data: null, error: null };
    },
    from(t) { const b = { select() { return b; }, order() { return b; }, limit() { return b; }, eq() { return b; }, single() { return b; },
      then(res) { if (t === 'cr_modelos') return res(o.semTabela ? { data: null, error: { code: 'PGRST205' } } : { data: versoes.slice().sort((x, y) => y.versao - x.versao), error: null }); return res({ data: [], error: null }); } }; return b; } };
}
async function abrir(perfil, o) {
  const sbk = fake(perfil, o), dom = new JSDOM(rd('configuracoes.html'), { runScripts: 'dangerously', url: 'http://localhost/configuracoes.html', beforeParse(w) {
    w.eval(rd('assets/cr-config.js')); w.confirm = () => { w.__confirmou = (w.__confirmou || 0) + 1; return true; }; w.HTMLCanvasElement.prototype.getContext = ctx; } });
  const w = dom.window; w.eval(rd('assets/cr-utils.js')); w.HTMLElement.prototype.scrollIntoView = () => {}; w._sb = sbk; await esperar(500);
  return { w, D: w.document, sbk, id: i => w.document.getElementById(i), txt: () => w.document.body.textContent };
}
const toasts = t => (t.D.getElementById('toast-ct') || { textContent: '' }).textContent;
const chamadas = (t, fn) => t.sbk.rpcs.filter(x => x.fn === fn);

(async () => {
  // ── admin ──
  let t = await abrir('admin');
  ok('admin: editor começa com o texto da versão ativa', t.id('mod_texto').value === V1 && !t.id('mod_texto').readOnly);
  ok('admin: lista a versão 1 como ATIVA e mostra o botão Publicar', /v1 · .* · ATIVA/.test(t.id('modVersoes').textContent) && t.id('btnModPublicar').style.display !== 'none' && t.id('modOperador').style.display === 'none');
  ok('admin: igual à ativa avisa que não há o que publicar', /Igual à versão ativa \(v1\)/.test(t.id('modAviso').textContent));
  t.id('mod_texto').value = 'curto'; t.w.modMudou();
  ok('texto curto: aviso na hora', /curto demais/.test(t.id('modAviso').textContent));
  await t.w.modPublicar(); await esperar(60);
  ok('texto curto: NÃO chama o servidor nem pergunta', chamadas(t, 'cr_modelo_publicar').length === 0 && !t.w.__confirmou);
  t.id('mod_texto').value = 'a'.repeat(60) + ' {{cpf}}'; t.w.modMudou(); await t.w.modPublicar(); await esperar(60);
  ok('variável {{cpf}}: recusada na tela, sem chamar o servidor', chamadas(t, 'cr_modelo_publicar').length === 0 && /variável/.test(t.id('modAviso').textContent));
  t.id('mod_texto').value = '**Cláusula 1ª:** Segunda versão do texto, com a apólice {{apolice}} e o contrato {{numero}}.'; t.w.modMudou();
  ok('texto sem {{apolice}} só avisa; com {{apolice}} não avisa', !/não usa/.test(t.id('modAviso').textContent));
  t.id('mod_texto').value = '**Cláusula 1ª:** Segunda versão do texto, sem a variável da apólice e com bastante palavra.'; t.w.modMudou();
  ok('sem {{apolice}}: aviso informativo (não bloqueia)', /não usa \{\{apolice\}\}/.test(t.id('modAviso').textContent) && !/curto|variável/.test(t.id('modAviso').textContent));
  t.id('mod_texto').value = '**Cláusula 1ª:** Segunda versão do texto, com a apólice {{apolice}} e o contrato {{numero}}.'; t.w.modMudou();
  t.w.modPrever();
  ok('pré-visualização: negrito e variáveis de EXEMPLO, sem dado real', t.id('modPrev').style.display !== 'none' && /<strong>Cláusula 1ª:<\/strong>/.test(t.id('modPrev').innerHTML) && /000123/.test(t.id('modPrev').innerHTML) && /TCE-2026-0001/.test(t.id('modPrev').innerHTML) && t.id('modPrev').innerHTML.indexOf('{{') < 0);
  await t.w.modPublicar(); await esperar(120);
  ok('publicar: pede confirmação e chama o servidor 1 vez com chave e texto', t.w.__confirmou === 1 && chamadas(t, 'cr_modelo_publicar').length === 1 && chamadas(t, 'cr_modelo_publicar')[0].a.p_chave === 'clausulas_tce' && /Segunda versão/.test(chamadas(t, 'cr_modelo_publicar')[0].a.p_texto));
  ok('publicar: lista recarrega com a v2 ATIVA e a v1 com "Tornar ativa"', /v2 · .* · ATIVA/.test(t.id('modVersoes').textContent) && /Tornar ativa/.test(t.id('modVersoes').textContent));
  ok('publicar: o texto enviado não vai para console/URL (não há nada além do rpc)', t.w.location.search === '');
  const btnAtivar = [...t.id('modVersoes').querySelectorAll('button')].find(b => b.textContent === 'Tornar ativa'); btnAtivar.click(); await esperar(150);
  ok('voltar atrás: confirma, chama cr_modelo_ativar com o id da v1 e a v1 volta a ser ATIVA', t.w.__confirmou === 2 && chamadas(t, 'cr_modelo_ativar')[0].a.p_id === 1 && /v1 · .* · ATIVA/.test(t.id('modVersoes').textContent));
  const carregar = [...t.id('modVersoes').querySelectorAll('button')].find(b => b.textContent === 'Carregar no editor'); carregar.click();
  ok('"Carregar no editor" coloca o texto da versão no editor', t.id('mod_texto').value.length > 20);

  // servidor recusa (igual à ativa) -> mensagem amigável, sem "publicada"
  t = await abrir('admin', { publicarErro: 'igual_a_ativa' });
  t.id('mod_texto').value = V1 + ' com um acréscimo qualquer.'; await t.w.modPublicar(); await esperar(120);
  ok('erro do servidor vira mensagem clara e nada é dado como publicado', /igual ao da versão ativa/.test(toasts(t)) && !/publicada ✓/.test(toasts(t)));

  // ── operador ──
  t = await abrir('operador');
  ok('operador: vê a versão ativa só para leitura, sem botão Publicar nem Tornar ativa', t.id('mod_texto').readOnly && t.id('btnModPublicar').style.display === 'none' && !/Tornar ativa/.test(t.id('modVersoes').textContent) && t.id('modOperador').style.display !== 'none');
  await t.w.modPublicar(); await esperar(60);
  ok('operador: publicar não chama o servidor e não pergunta', chamadas(t, 'cr_modelo_publicar').length === 0 && !t.w.__confirmou);

  // ── SQL da R35 ainda não rodou ──
  t = await abrir('admin', { semTabela: true });
  ok('sem a tabela: a aba avisa para rodar o SQL (R35), Publicar desabilitado, resto da página funciona', /rode sql\/cr-schema\.sql \(R35\)/.test(t.id('modVersoes').textContent) && t.id('btnModPublicar').disabled && !!t.id('sig_nome'));

  // ── contrato: cláusulas vêm da CÓPIA do contrato ──
  async function contrato(c) {
    const sbk = { auth: { getUser: async () => ({ data: { user: { email: 'a@b.c' } } }) }, rpc: async () => ({ data: null, error: null }),
      from(t) { const b = { select() { return b; }, order() { return b; }, eq() { return b; }, limit() { return b; }, single() { return b; }, then(res) { return res(t === 'cr_contratos' ? { data: c, error: null } : { data: [], error: null }); } }; return b; } };
    const dom = new JSDOM(rd('visualizar-assinado.html'), { runScripts: 'dangerously', url: 'http://localhost/visualizar-assinado.html?id=1', beforeParse(w) { w.eval(rd('assets/cr-config.js')); w.HTMLCanvasElement.prototype.getContext = ctx; } });
    const w = dom.window; w.eval(rd('assets/cr-utils.js')); w._sb = sbk; await esperar(700); return w.document.getElementById('docArea').innerHTML;
  }
  const base = { id: 1, tipo: 'estagio', numero_contrato: 'TCE-2026-0007', titulo: 'T', empresa: 'Empresa <b>X</b>', apolice_seguro: 'AP-99', status: 'enviado', nome_candidato: 'N' };
  let h = await contrato({ ...base, modelo_clausulas_versao: 2, modelo_clausulas_texto: '**Cláusula X:** apólice {{apolice}}, contrato {{numero}}, empresa {{empresa}}, agência {{agencia}} <script>alert(1)</script>.' });
  ok('contrato com cópia: mostra o texto da cópia, versão e variáveis preenchidas', /<strong>Cláusula X:<\/strong> apólice AP-99, contrato TCE-2026-0007/.test(h) && /Modelo de cláusulas: versão 2/.test(h) && /agência Orizon/.test(h));
  ok('contrato com cópia: HTML do texto e da empresa é escapado', h.indexOf('<script>alert') < 0 && /Empresa &lt;b&gt;X&lt;\/b&gt;/.test(h));
  ok('contrato com cópia: NÃO mostra o texto antigo fixo', h.indexOf('Obrigações do Estagiário') < 0);
  h = await contrato({ ...base });
  ok('contrato antigo (sem cópia): mostra o texto fixo de sempre, com a apólice, sem rótulo de versão', /Cláusula 3ª — Obrigações do Estagiário/.test(h) && /nº AP-99 durante/.test(h) && h.indexOf('Modelo de cláusulas') < 0);

  console.log(falhas ? '\n' + falhas + ' FALHA(S)' : '\nTudo OK'); process.exit(falhas ? 1 : 0);
})();
