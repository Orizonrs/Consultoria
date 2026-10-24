// R26 (M11): teste de tela (jsdom) — ordem de assinatura e lembretes em novo-contrato, index-contratos e assinar-contrato.
// Precisa: npm i jsdom.  Rodar: node tests/ordem-ui-test.js   (NÃO substitui testar no navegador com o Supabase real: M-82 a M-88)
const { JSDOM } = require('jsdom'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), rd = f => fs.readFileSync(path.join(root, f), 'utf8');
const cfg = rd('assets/cr-config.js'), utils = rd('assets/cr-utils.js');
let falhas = 0; const ok = (n, c) => { if (!c) { falhas++; console.log('FALHOU', n); } else console.log('OK    ', n); };
const esperar = ms => new Promise(r => setTimeout(r, ms));
const dia = n => new Date(Date.now() + n * 86400000).toISOString();
const thenable = d => { const q = { eq() { return q; }, order() { return q; }, single() { return q; }, like() { return q; }, limit() { return q; }, select() { return q; }, then(res) { res({ data: d, error: null }); } }; return q; };

// ───────── index-contratos
const contratos = [
  { id: 1, numero_contrato: 'TCE-2026-0001', titulo: 'TCE — Ana', tipo: 'estagio', status: 'parcial', nome_candidato: 'Ana', empresa: 'ACME', ordem_assinatura: 'sequencial', criado_em: dia(-9), atualizado_em: dia(-5) },
  { id: 2, numero_contrato: 'CLT-2026-0001', titulo: 'CLT — Bia', tipo: 'clt', status: 'enviado', nome_candidato: 'Bia', empresa: 'ACME', ordem_assinatura: 'livre', criado_em: dia(-1), atualizado_em: dia(-1) }];
const mkSigs = () => [
  { id: 10, contrato_id: 1, nome: 'Orizon', email: 'o@x.com', papel: 'empresa_nexus', token: 'tk10', ordem: 1, status: 'assinado', assinado_em: dia(-5), expira_em: dia(20) },
  { id: 11, contrato_id: 1, nome: 'Ana Souza', email: 'a@x.com', papel: 'candidato', token: 'tk11', ordem: 2, status: 'pendente', expira_em: dia(20) },
  { id: 12, contrato_id: 1, nome: 'Chefe', email: 'c@x.com', papel: 'supervisor', token: 'tk12', ordem: 3, status: 'pendente', expira_em: dia(20) },
  { id: 20, contrato_id: 2, nome: 'Bia', email: 'b@x.com', papel: 'candidato', token: 'tk20', status: 'pendente', expira_em: dia(20) }];
async function painel() {
  const calls = [];
  const dom = new JSDOM(rd('index-contratos.html'), { runScripts: 'dangerously', url: 'http://localhost/index-contratos.html', beforeParse(w) { w.eval(cfg); } });
  const w = dom.window; w.eval(utils); w.eval(rd('assets/cr-otp.js')); w.confirm = () => true; w.HTMLElement.prototype.scrollIntoView = () => {};
  const sigs = mkSigs();
  w._sb = { auth: { getUser: async () => ({ data: { user: null } }) }, from: t => ({ select: () => thenable(t === 'cr_contratos' ? contratos : sigs) }),
    rpc: async (fn, a) => { calls.push([fn, a]); return { data: fn === 'cr_registrar_lembrete' ? { ok: true, lembrete_em: dia(0), lembretes_qtd: 1 } : {}, error: null }; } };
  await esperar(400);
  return { w, D: w.document, calls, sigs, modal: () => w.document.getElementById('modalLinksContent').innerHTML, linha: n => [...w.document.querySelectorAll('#tbodyContratos tr')].find(tr => tr.textContent.includes(n)) };
}
// ───────── assinar-contrato
async function assinar(resp) {
  const dom = new JSDOM(rd('assinar-contrato.html'), { runScripts: 'outside-only', url: 'http://localhost/assinar-contrato.html?t=abc' });
  const w = dom.window; w.eval(cfg);
  w.supabase = { createClient: () => ({ rpc: async () => ({ data: resp, error: null }) }) };
  w.HTMLCanvasElement.prototype.getContext = () => ({ clearRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {} });
  const inline = [...rd('assinar-contrato.html').matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n');
  w.eval(inline); await esperar(300);
  return { D: w.document, html: w.document.getElementById('app').innerHTML };
}
const base = { contrato: { titulo: 'TCE — Ana', tipo: 'estagio', numero_contrato: 'TCE-1', ordem_assinatura: 'sequencial' },
  signatarios: [{ nome: 'Orizon', papel: 'empresa_nexus', status: 'assinado', ordem: 1 }, { nome: 'Ana', papel: 'candidato', status: 'pendente', ordem: 2 }, { nome: 'Chefe <b>', papel: 'supervisor', status: 'pendente', ordem: 3 }] };

(async () => {
  // ── painel de contratos
  let t = await painel();
  ok('selo 🔔 na lista: contrato sequencial parado, só a Ana (na vez) merece lembrete', /lembrar Ana/.test(t.linha('TCE-2026-0001').textContent) && !/Chefe/.test(t.linha('TCE-2026-0001').querySelector('.tag-orange').title.split(':')[1] || ''));
  ok('contrato mexido há 1 dia não ganha o selo', !/lembrar/.test(t.linha('CLT-2026-0001').textContent));
  t.w.verLinks(1); let m = t.modal();
  ok('modal mostra "um de cada vez" e a ordem 1º/2º/3º', /um de cada vez/.test(m) && /1º · /.test(m) && /2º · /.test(m) && /3º · /.test(m));
  ok('na vez (Ana): botões de lembrete por WhatsApp e e-mail e "nenhum lembrete enviado"', /lembrarRegistrar\(11, 'whatsapp'\)/.test(m) && /enviarEmailLembrete/.test(m) && /nenhum lembrete enviado/.test(m));
  ok('fora da vez (Chefe): mostra "aguarda Ana Souza" e NÃO oferece lembrete', /aguarda <b>Ana Souza<\/b>/.test(m) && !/lembrarRegistrar\(12/.test(m) && !/data-sig="12"/.test(m));
  ok('quem já assinou não tem lembrete', !/lembrarRegistrar\(10/.test(m) && !/data-sig="10"/.test(m));
  ok('mensagem do WhatsApp é a de lembrete, com o link', decodeURIComponent((m.match(/wa\.me\/\?text=([^"]*Lembrete[^"]*)"/) || [])[1] || '').includes('Lembrete: o documento "TCE — Ana"'));
  await t.w.lembrarRegistrar(11, 'whatsapp');
  ok('lembrar chama cr_registrar_lembrete com o canal', t.calls.length === 1 && t.calls[0][0] === 'cr_registrar_lembrete' && t.calls[0][1].p_signatario === 11 && t.calls[0][1].p_canal === 'whatsapp');
  ok('depois de lembrar: tela mostra "1 lembrete · último hoje" e o selo da lista some', /1 lembrete · último hoje/.test(t.modal()) && !/lembrar Ana/.test(t.linha('TCE-2026-0001').textContent));
  ok('toast confirma o registro', /Lembrete registrado/.test(t.D.body.textContent));
  t.w.verLinks(2); m = t.modal();
  ok('contrato livre: sem ordem, sem "aguarda", com lembrete', !/um de cada vez/.test(m) && !/Ainda não é a vez/.test(m) && /lembrarRegistrar\(20, 'whatsapp'\)/.test(m));
  // link vencido: não oferece lembrete
  let v = await painel(); v.sigs.find(s => s.id === 11).expira_em = dia(-1); v.w.verLinks(1);
  ok('link vencido: pede para renovar antes e não oferece lembrete', /Link vencido: prorrogue/.test(v.modal()) && !/lembrarRegistrar\(11/.test(v.modal()));

  // ── novo-contrato
  const nc = rd('novo-contrato.html');
  async function novo() {
    const ins = [];
    const dom = new JSDOM(nc, { runScripts: 'dangerously', url: 'http://localhost/novo-contrato.html', beforeParse(w) { w.eval(cfg); } });
    const w = dom.window; w.eval(utils); w.HTMLElement.prototype.scrollIntoView = () => {};
    w._sb = { auth: { getUser: async () => ({ data: { user: { id: 'u1', email: 'a@b.c' } } }) },
      from: tb => ({ select: () => thenable([]), insert: rows => { ins.push([tb, rows]); return thenable(tb === 'cr_contratos' ? { ...rows, id: 77 } : rows.map((r, i) => ({ ...r, id: i + 1 }))); } }),
      rpc: async fn => ({ data: fn === 'cr_proximo_numero' ? 'TCE-2026-0001' : null, error: null }) };
    await esperar(400);
    const D = w.document; D.getElementById('nome_candidato').value = 'Ana'; D.getElementById('empresa').value = 'ACME';
    return { w, D, ins, nomes: () => w.eval('_signatarios.map(s => s.nome)') };
  }
  let n = await novo();
  ok('padrão é "todos juntos" e a lista não mostra numeração nem setas', n.D.getElementById('ordemAss').value === 'livre' && !/▲/.test(n.D.getElementById('sigList').innerHTML) && !/1º/.test(n.D.getElementById('sigList').innerHTML));
  await n.w.criarContrato(); await esperar(100);
  let ct = n.ins.find(x => x[0] === 'cr_contratos')[1], sg = n.ins.find(x => x[0] === 'cr_signatarios')[1];
  ok('livre: NÃO envia ordem_assinatura nem ordem (continua funcionando sem rodar o SQL da R26)', !('ordem_assinatura' in ct) && sg.length === 2 && sg.every(s => !('ordem' in s)));
  n = await novo(); n.D.getElementById('ordemAss').value = 'sequencial'; n.D.getElementById('ordemAss').dispatchEvent(new n.w.Event('change', { bubbles: true }));
  let html = n.D.getElementById('sigList').innerHTML;
  ok('sequencial: lista numerada 1º/2º com setas e dica', /1º/.test(html) && /2º/.test(html) && (html.match(/▲/g) || []).length === 2 && /um de cada vez|só consegue assinar depois/.test(n.D.body.textContent));
  ok('1ª não sobe e a última não desce (botões desativados)', /moverSig\(0, -1\)[^>]*disabled/.test(html) && /moverSig\(1, 1\)[^>]*disabled/.test(html));
  const antes = n.nomes(); n.w.moverSig(1, -1); const depois = n.nomes();
  ok('▲ troca a ordem (Candidato passa a assinar antes da Orizon)', antes[0] === depois[1] && antes[1] === depois[0]);
  n.w.moverSig(0, -1); ok('mover além do início não faz nada', n.nomes().join() === depois.join());
  n.D.getElementById('addNome').value = 'Chefe'; n.D.getElementById('addEmail').value = 'c@x.com'; n.w.adicionarSig();
  await n.w.criarContrato(); await esperar(100);
  ct = n.ins.find(x => x[0] === 'cr_contratos')[1]; sg = n.ins.find(x => x[0] === 'cr_signatarios')[1];
  ok('sequencial: contrato leva ordem_assinatura=sequencial', ct.ordem_assinatura === 'sequencial');
  ok('sequencial: signatários levam ordem 1..n na ordem escolhida', sg.map(s => s.ordem).join() === '1,2,3' && sg[0].nome === depois[0] && sg[2].nome === 'Chefe');
  const links = n.D.getElementById('linksList').textContent;
  ok('tela de links mostra 1º/2º/3º e quem espera quem', /1º · /.test(links) && /assina primeiro/.test(links) && new RegExp('só poderá assinar depois de ' + depois[0]).test(links));
  // confirmação
  let c2 = await novo(); c2.D.getElementById('ordemAss').value = 'sequencial'; c2.w.renderSigList();
  ok('ordem escolhida é guardada no rascunho (campo ordemAss)', /'ordemAss'[,\]]/.test(nc));

  // ── assinar-contrato
  let a = await assinar({ ...base, signatario: { nome: 'Chefe <b>', papel: 'supervisor', status: 'pendente', ordem: 3, aguardando: 'Ana' } });
  ok('fora da vez: mostra "Ainda não é a sua vez" e quem falta, sem canvas e sem botão de assinar', /Ainda não é a sua vez/.test(a.html) && /Falta a assinatura de <b>Ana<\/b>/.test(a.html) && !a.D.getElementById('cv') && !a.D.getElementById('bA'));
  ok('lista de signatários numerada na ordem', /1º · Orizon/.test(a.html) && /3º · Chefe &lt;b&gt;/.test(a.html) && !a.D.querySelector('#app b b'));
  a = await assinar({ ...base, signatario: { nome: 'Ana', papel: 'candidato', status: 'pendente', ordem: 2, aguardando: null } });
  ok('na vez: tela normal de assinatura com canvas', !!a.D.getElementById('cv') && !!a.D.getElementById('bA') && !/Ainda não é a sua vez/.test(a.html));
  a = await assinar({ ...base, contrato: { ...base.contrato, ordem_assinatura: 'livre' }, signatario: { nome: 'Ana', papel: 'candidato', status: 'pendente', aguardando: null } });
  ok('contrato livre: sem numeração na lista de signatários', [...a.D.querySelectorAll('.sig')].length === 3 && ![...a.D.querySelectorAll('.sig')].some(x => /\dº/.test(x.textContent)));
  ok('mensagem de erro aguardando_vez existe para o caso de corrida', /aguardando_vez:'Ainda não é a sua vez/.test(rd('assinar-contrato.html')));

  // ── histórico e linha do tempo
  ok('linha do tempo e histórico têm o evento "lembrete"', /ev === 'lembrete'/.test(rd('visualizar-assinado.html')) && /lembrete: '🔔/.test(rd('historico.html')));
  console.log(falhas ? '\n' + falhas + ' FALHA(S)' : '\nTodos OK'); process.exit(falhas ? 1 : 0);
})().catch(e => { console.error('ERRO', e); process.exit(1); });
