// R21 (M13): teste de tela (jsdom) do rascunho automático em novo-contrato.html. Precisa: npm i jsdom. Rodar: node tests/rascunho-ui-test.js
const { JSDOM } = require('jsdom'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), html = fs.readFileSync(path.join(root, 'novo-contrato.html'), 'utf8');
const utils = fs.readFileSync(path.join(root, 'assets/cr-utils.js'), 'utf8'), cfg = fs.readFileSync(path.join(root, 'assets/cr-config.js'), 'utf8');
let falhas = 0; const ok = (n, c) => { if (!c) { falhas++; console.log('FALHOU', n); } else console.log('OK    ', n); };
const esperar = ms => new Promise(r => setTimeout(r, ms));
const KEY = 'cr_rascunho_contrato:u1';
const sembrar = { v: 1, salvoEm: new Date().toISOString(), tipo: 'clt', campos: { nome_candidato: '<img src=x onerror=alert(1)>', empresa: 'ACME', valor_bolsa: '1500', cargo: 'Dev' }, signatarios: [{ nome: 'Chefe', email: 'c@x.com', papel: 'supervisor' }] };
async function abrir(seed) {
  const calls = [];
  const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'http://localhost/novo-contrato.html', beforeParse(w) { w.eval(cfg); } });
  const w = dom.window; w.eval(utils); w.HTMLElement.prototype.scrollIntoView = () => {};
  if (seed) w.localStorage.setItem(KEY, JSON.stringify(seed));
  const q = d => { const x = { eq() { return x; }, single() { return x; }, like() { return x; }, order() { return x; }, limit() { return x; }, select() { return x; }, then(res) { res({ data: d, error: null }); } }; return x; };
  w._sb = { auth: { getUser: async () => ({ data: { user: { id: 'u1', email: 'a@b.c' } } }) },
    from: t => ({ select: () => q([]), insert: rows => { calls.push([t, rows]); return q(t === 'cr_contratos' ? { id: 77, numero_contrato: 'TCE-1', titulo: 'T', tipo: 'estagio' } : (Array.isArray(rows) ? rows.map((r, i) => ({ ...r, id: i + 1 })) : [])); } }),
    rpc: async (fn, a) => ({ data: fn === 'cr_proximo_numero' ? 'TCE-2026-0001' : null, error: null }) };
  await esperar(500);
  const D = w.document, v = id => D.getElementById(id).value;
  const digitar = (id, val) => { const el = D.getElementById(id); el.value = val; el.dispatchEvent(new w.Event('input', { bubbles: true })); };
  return { w, D, v, digitar, calls, st: () => w.localStorage.getItem(KEY), banner: () => D.getElementById('bannerRascunho').style.display !== 'none' };
}
(async () => {
  let t = await abrir();
  ok('sem rascunho: sem banner', !t.banner());
  t.digitar('cpf', '529.982.247-25'); await esperar(900);
  ok('só CPF digitado: nada é salvo', t.st() === null);
  t.digitar('empresa', 'ACME'); t.digitar('cpf', '529.982.247-25'); await esperar(900);
  const s = JSON.parse(t.st() || 'null');
  ok('digitar salva o rascunho (debounce)', s && s.campos.empresa === 'ACME' && s.tipo === 'estagio');
  ok('CPF nunca é salvo', !/529\.982|52998224725/.test(t.st()));
  ok('mostra "Rascunho salvo às"', /Rascunho salvo às/.test(t.D.getElementById('rascunhoStatus').textContent) && t.D.getElementById('rascunhoStatus').style.display !== 'none');
  t.w.setTipo('clt'); await esperar(900); ok('trocar o tipo também salva', JSON.parse(t.st()).tipo === 'clt');
  t.w.document.getElementById('addNome').value = 'Maria'; t.w.document.getElementById('addEmail').value = 'm@x.com'; t.w.adicionarSig(); await esperar(900);
  ok('adicionar signatário salva', JSON.parse(t.st()).signatarios.some(x => x.nome === 'Maria'));
  t.digitar('empresa', ''); t.w.removerSig(t.w.eval('_signatarios').findIndex(x => x.nome === 'Maria')); await esperar(900);
  ok('esvaziar tudo apaga o rascunho', t.st() === null);

  t = await abrir(sembrar);
  ok('com rascunho: banner aparece', t.banner());
  ok('nome no banner vem escapado (sem HTML injetado)', !t.D.querySelector('#bannerRascunhoTxt img') && /&lt;img|<img/.test(t.D.getElementById('bannerRascunhoTxt').textContent) === true);
  t.digitar('empresa', 'Outra'); await esperar(900);
  ok('digitar antes de decidir NÃO sobrescreve o rascunho guardado', JSON.parse(t.st()).campos.empresa === 'ACME');
  t.w.restaurarRascunho();
  ok('restaurar: campos, tipo e salário', t.v('empresa') === 'ACME' && t.v('cargo') === 'Dev' && t.v('valor_bolsa') === '1500' && /Salário/.test(t.D.getElementById('lbl_bolsa').textContent));
  ok('restaurar: CPF fica vazio e banner some', t.v('cpf') === '' && !t.banner());
  ok('restaurar: signatário extra volta, sem duplicar Orizon/candidato', t.w.eval('_signatarios').map(x => x.papel).sort().join() === 'candidato,empresa_nexus,supervisor');
  t.digitar('cargo', 'Dev Sr'); await esperar(900);
  ok('depois de restaurar, o salvamento volta a funcionar', JSON.parse(t.st()).campos.cargo === 'Dev Sr');

  t = await abrir(sembrar); t.w.descartarRascunho();
  ok('descartar: apaga e esconde o banner', t.st() === null && !t.banner());
  t.digitar('cargo', 'Novo'); await esperar(900);
  ok('depois de descartar, salva o novo', JSON.parse(t.st()).campos.cargo === 'Novo');

  t = await abrir(sembrar); const velho = { ...sembrar, salvoEm: new Date(Date.now() - 8 * 86400000).toISOString() };
  t = await abrir(velho); ok('rascunho com mais de 7 dias não aparece e é apagado', !t.banner() && t.st() === null);

  t = await abrir();
  ['nome_candidato', 'cargo', 'email_candidato', 'empresa'].forEach((id, i) => t.digitar(id, ['Ana', 'Dev', 'ana@x.com', 'ACME'][i]));
  t.digitar('curso', 'Adm'); t.digitar('instituicao', 'UNI'); t.digitar('valor_bolsa', '900'); t.digitar('jornada_horas', '6h/dia'); await esperar(900);
  ok('(preparo) rascunho existe antes de criar', t.st() !== null);
  await t.w.criarContrato(); await esperar(100);
  ok('contrato criado: rascunho apagado', t.calls.some(c => c[0] === 'cr_contratos') && t.st() === null);
  t.digitar('cargo', 'Depois'); await esperar(900);
  ok('depois de criar, digitar não recria rascunho', t.st() === null);

  t = await abrir(); Object.defineProperty(t.w, 'localStorage', { get() { throw new Error('bloqueado'); } });
  t.digitar('empresa', 'ACME'); await esperar(900); ok('localStorage bloqueado: a tela segue funcionando', t.v('empresa') === 'ACME');
  console.log(falhas ? falhas + ' FALHARAM' : 'Todos OK'); process.exit(falhas ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
