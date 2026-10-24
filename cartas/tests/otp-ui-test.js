// R37 (M3): teste de tela (jsdom) — código de confirmação na tela pública, no painel de links e no Novo Contrato.
// Precisa: npm i jsdom.  Rodar: node tests/otp-ui-test.js   (NÃO substitui testar no navegador com o Supabase real: M-129 a M-134)
const { JSDOM } = require('jsdom'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), rd = f => fs.readFileSync(path.join(root, f), 'utf8');
const cfg = rd('assets/cr-config.js'), utils = rd('assets/cr-utils.js'), otp = rd('assets/cr-otp.js');
let falhas = 0; const ok = (n, c) => { if (!c) { falhas++; console.log('FALHOU', n); } else console.log('OK    ', n); };
const esperar = ms => new Promise(r => setTimeout(r, ms));
const dia = n => new Date(Date.now() + n * 86400000).toISOString();
const thenable = d => { const q = { eq() { return q; }, order() { return q; }, single() { return q; }, like() { return q; }, limit() { return q; }, select() { return q; }, then(res) { res({ data: d, error: null }); } }; return q; };

// ───────── tela pública
const lerBase = otpEstado => ({ contrato: { titulo: 'TCE — Ana', tipo: 'estagio', numero_contrato: 'TCE-1' },
  signatario: { nome: 'Ana', papel: 'candidato', status: 'pendente', otp: otpEstado },
  signatarios: [{ nome: 'Ana', papel: 'candidato', status: 'pendente' }] });
async function publica(otpEstado, handlers) {
  const calls = [];
  const dom = new JSDOM(rd('assinar-contrato.html'), { runScripts: 'outside-only', url: 'http://localhost/assinar-contrato.html?t=abc' });
  const w = dom.window; w.eval(cfg); w.eval(otp);
  w.alert = m => calls.push(['alert', m]);
  w.supabase = { createClient: () => ({ rpc: async (fn, a) => { calls.push([fn, a]); if (fn === 'cr_ler_por_token') return { data: lerBase(otpEstado), error: null }; return handlers[fn](a); } }) };
  w.HTMLCanvasElement.prototype.getContext = () => ({ clearRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {}, fillText() {} });
  w.HTMLCanvasElement.prototype.toDataURL = () => 'data:image/png;base64,' + 'A'.repeat(200);
  const inline = [...rd('assinar-contrato.html').matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n');
  w.eval(inline); await esperar(300);
  return { w, D: w.document, calls, app: () => w.document.getElementById('app').innerHTML, vis: id => { const el = w.document.getElementById(id); return !!el && el.style.display !== 'none'; } };
}
// usa o modo "Digitar" da própria tela (marca _ink de verdade; o let do eval não é visível de fora)
function preparar(t) { t.w.setMode('type'); t.D.getElementById('nm').value = 'Ana Souza'; t.w.typed(); t.D.getElementById('ck').checked = true; }
(async () => {
  // sem OTP: nada muda
  let t = await publica({ exigido: false }, { cr_assinar: async () => ({ data: { ok: true, hash: 'h', numero: 'TCE-1', assinado_em: new Date().toISOString() }, error: null }) });
  ok('sem código: não há caixa do código e a assinatura aparece', !t.D.getElementById('otpBox') && t.vis('sigBox'));
  preparar(t); await t.w.assinar(); await esperar(50);
  let a = t.calls.find(c => c[0] === 'cr_assinar');
  ok('sem código: cr_assinar vai SEM p_codigo (funciona sem o SQL da R37)', a && !('p_codigo' in a[1]) && a[1].p_token === 'abc');

  // com OTP
  const certo = '123456'; let tent = 5;
  const H = {
    cr_otp_validar: async a => a.p_codigo === certo ? { data: { ok: true, exigido: true }, error: null } : { data: { erro: 'codigo_invalido', restantes: --tent }, error: null },
    cr_assinar: async a => a.p_codigo === certo ? { data: { ok: true, hash: 'hh', numero: 'TCE-1', assinado_em: new Date().toISOString() }, error: null } : { data: { erro: 'codigo_expirado' }, error: null } };
  t = await publica({ exigido: true, emitido: true, expirado: false, bloqueado: false, restantes: 5 }, H);
  ok('com código: mostra a caixa do código e ESCONDE a assinatura', t.vis('otpBox') && !t.vis('sigBox'));
  ok('campo: teclado numérico e one-time-code', /inputmode="numeric"/.test(t.app()) && /autocomplete="one-time-code"/.test(t.app()));
  ok('antes de confirmar, não há aviso de erro', t.D.getElementById('otpMsg').textContent === '');
  t.D.getElementById('otpIn').value = '12'; await t.w.validarOtp();
  ok('código incompleto: pede os 6 dígitos e NÃO chama o servidor', /6 dígitos/.test(t.D.getElementById('otpMsg').textContent) && !t.calls.some(c => c[0] === 'cr_otp_validar'));
  t.D.getElementById('otpIn').value = '999999'; await t.w.validarOtp();
  ok('código errado: mostra "Restam 4 tentativas" e segue escondendo a assinatura', /Restam 4 tentativas/.test(t.D.getElementById('otpMsg').textContent) && !t.vis('sigBox') && t.vis('otpBox'));
  t.D.getElementById('otpIn').value = '123 456'; await t.w.validarOtp(); await esperar(30);
  const v = t.calls.filter(c => c[0] === 'cr_otp_validar').pop();
  ok('código certo (com espaço): envia só dígitos ao servidor', v[1].p_codigo === '123456' && v[1].p_token === 'abc');
  ok('código certo: esconde a caixa e mostra a assinatura', !t.vis('otpBox') && t.vis('sigBox'));
  preparar(t); await t.w.assinar(); await esperar(50);
  a = t.calls.find(c => c[0] === 'cr_assinar');
  ok('assinar leva p_codigo (o servidor confere DE NOVO)', a && a[1].p_codigo === '123456');
  ok('assinado: mostra o hash e some o formulário', /Documento assinado/.test(t.app()) && /hh/.test(t.app()));
  // servidor recusa o código na hora de assinar (venceu no meio): volta para a caixa
  t = await publica({ exigido: true, emitido: true, expirado: false, bloqueado: false, restantes: 5 }, { ...H, cr_assinar: async () => ({ data: { erro: 'codigo_expirado' }, error: null }) });
  t.D.getElementById('otpIn').value = certo; await t.w.validarOtp();
  preparar(t); await t.w.assinar(); await esperar(50);
  ok('erro de código ao assinar: volta para a caixa do código com a mensagem, sem assinar', t.vis('otpBox') && !t.vis('sigBox') && /venceu/.test(t.D.getElementById('otpMsg').textContent) && !/Documento assinado/.test(t.app()));
  // estados que a tela já avisa de partida
  t = await publica({ exigido: true, emitido: false, expirado: false, bloqueado: false, restantes: 5 }, H);
  ok('código ainda não gerado: avisa para pedir à Orizon', /ainda não gerou/.test(t.D.getElementById('otpMsg').textContent));
  t = await publica({ exigido: true, emitido: true, expirado: false, bloqueado: true, restantes: 0 }, H);
  ok('código bloqueado: avisa de partida', /bloqueado/.test(t.D.getElementById('otpMsg').textContent));
  t = await publica({ exigido: true, emitido: true, expirado: true, bloqueado: false, restantes: 5 }, H);
  ok('código vencido: avisa de partida', /venceu/.test(t.D.getElementById('otpMsg').textContent));
  // tentar assinar escondendo a caixa na mão: a tela não deixa (e o servidor também não)
  t = await publica({ exigido: true, emitido: true, expirado: false, bloqueado: false, restantes: 5 }, H);
  preparar(t); await t.w.assinar(); await esperar(30);
  ok('assinar sem ter confirmado o código: não chama cr_assinar', !t.calls.some(c => c[0] === 'cr_assinar') && t.vis('otpBox'));

  // ───────── painel de contratos
  const contratos = [{ id: 1, numero_contrato: 'TCE-2026-0001', titulo: 'TCE — Ana', tipo: 'estagio', status: 'enviado', nome_candidato: 'Ana', empresa: 'ACME', ordem_assinatura: 'livre', criado_em: dia(-1), atualizado_em: dia(-1) }];
  const mkSigs = () => [
    { id: 11, contrato_id: 1, nome: 'Ana Souza', email: 'a@x.com', papel: 'candidato', token: 'tk11', status: 'pendente', expira_em: dia(20), otp_exigido: false },
    { id: 12, contrato_id: 1, nome: 'Chefe', email: 'c@x.com', papel: 'supervisor', token: 'tk12', status: 'pendente', expira_em: dia(20), otp_exigido: true, otp_emitido_em: dia(0), otp_expira_em: dia(1), otp_tentativas: 2 }];
  async function painel(rpcFn) {
    const calls = [];
    const dom = new JSDOM(rd('index-contratos.html'), { runScripts: 'dangerously', url: 'http://localhost/index-contratos.html', beforeParse(w) { w.eval(cfg); } });
    const w = dom.window; w.eval(utils); w.eval(otp); w.confirm = () => true; w.HTMLElement.prototype.scrollIntoView = () => {};
    const sigs = mkSigs();
    w._sb = { auth: { getUser: async () => ({ data: { user: null } }) }, from: tb => ({ select: () => thenable(tb === 'cr_contratos' ? contratos : sigs) }),
      rpc: async (fn, a) => { calls.push([fn, a]); return rpcFn(fn, a); } };
    await esperar(400);
    return { w, D: w.document, calls, sigs, modal: () => w.document.getElementById('modalLinksContent').innerHTML };
  }
  const exp = new Date(Date.now() + 3600000).toISOString();
  let p = await painel(async (fn, a) => fn === 'cr_otp_emitir' ? { data: { ok: true, codigo: '012345', expira_em: exp, qtd: 1 }, error: null } : { data: { ok: true, exigido: false }, error: null });
  p.w.verLinks(1); let m = p.modal();
  ok('sem código: mostra "só o link" e o botão "Exigir e gerar código"', /Sem código: só o link/.test(m) && /Exigir e gerar código/.test(m));
  ok('com código gerado: mostra o estado (vale até, 2 erros) e "Gerar outro código" + "Dispensar código"', /Código gerado, vale até/.test(m) && /2 erro/.test(m) && /Gerar outro código/.test(m) && /otpDispensar\(12\)/.test(m));
  ok('nenhum código aparece antes de gerar', !/data-otp-codigo/.test(m));
  await p.w.otpGerar(11); m = p.modal();
  const ch = p.calls.find(c => c[0] === 'cr_otp_emitir');
  ok('gerar chama cr_otp_emitir com signatário e minutos (padrão 60)', ch && ch[1].p_signatario === 11 && ch[1].p_minutos === 60);
  ok('o código aparece UMA vez, formatado 012 345, com copiar e WhatsApp', /data-otp-codigo="11"/.test(m) && /012 345/.test(m) && /Copiar código/.test(m) && /Enviar código por WhatsApp/.test(m));
  const wa = decodeURIComponent((m.match(/wa\.me\/\?text=([^"]*)"[^>]*>\s*📱 Enviar código/) || [])[1] || '');
  ok('mensagem do WhatsApp do código leva o código e NÃO leva o link', /012 345/.test(wa) && !/https?:|assinar-contrato/.test(wa));
  ok('a tela passa a mostrar o signatário como exigido', p.sigs[0].otp_exigido === true && /Exigir e gerar código/.test(m) === false);
  ok('o código não foi para localStorage nem sessionStorage', !Object.keys(p.w.localStorage).some(k => p.w.localStorage.getItem(k).includes('012345')) && !Object.keys(p.w.sessionStorage).some(k => p.w.sessionStorage.getItem(k).includes('012345')));
  p.w.closeModal(); p.w.verLinks(1);
  ok('fechar o painel apaga o código da memória (não volta ao reabrir)', !/data-otp-codigo/.test(p.modal()) && !/012 345/.test(p.modal()));
  await p.w.otpDispensar(12); await esperar(20);
  const dc = p.calls.find(c => c[0] === 'cr_otp_definir');
  ok('dispensar chama cr_otp_definir(exigir=false) e a tela volta para "só o link"', dc && dc[1].p_signatario === 12 && dc[1].p_exigir === false && p.sigs[1].otp_exigido === false);
  // erro do servidor aparece como aviso e não vira código
  p = await painel(async () => ({ data: { erro: 'link_vencido' }, error: null }));
  p.w.verLinks(1); await p.w.otpGerar(11);
  ok('erro do servidor: toast com a mensagem e nenhum código na tela', /venceu/.test(p.D.body.textContent) && !/data-otp-codigo/.test(p.modal()));
  p = await painel(async () => ({ data: null, error: { code: 'PGRST202', message: 'function' } }));
  p.w.verLinks(1); await p.w.otpGerar(11);
  ok('sem o SQL: avisa para rodar sql/cr-schema.sql (R37)', /rode sql\/cr-schema\.sql \(R37\)/.test(p.D.body.textContent));
  // WhatsApp do convite avisa que vem código
  p = await painel(async () => ({ data: {}, error: null })); p.w.verLinks(1); m = p.modal();
  ok('convite de quem exige código avisa que haverá um código; de quem não exige, não', /precisar de um código/.test(decodeURIComponent((m.match(/wa\.me\/\?text=([^"]*assinar-contrato[^"]*)"/g) || []).join(' '))) );

  // ───────── novo contrato
  async function novo() {
    const ins = [];
    const dom = new JSDOM(rd('novo-contrato.html'), { runScripts: 'dangerously', url: 'http://localhost/novo-contrato.html', beforeParse(w) { w.eval(cfg); } });
    const w = dom.window; w.eval(utils); w.eval(otp); w.HTMLElement.prototype.scrollIntoView = () => {};
    w._sb = { auth: { getUser: async () => ({ data: { user: { id: 'u1', email: 'a@b.c' } } }) },
      from: tb => ({ select: () => thenable([]), insert: rows => { ins.push([tb, rows]); return thenable(tb === 'cr_contratos' ? { ...rows, id: 77 } : rows.map((r, i) => ({ ...r, id: i + 1 }))); } }),
      rpc: async fn => ({ data: fn === 'cr_proximo_numero' ? 'TCE-2026-0001' : null, error: null }) };
    await esperar(400);
    const D = w.document; D.getElementById('nome_candidato').value = 'Ana'; D.getElementById('empresa').value = 'ACME';
    return { w, D, ins };
  }
  let n = await novo();
  ok('Novo Contrato: padrão é "só o link"', n.D.getElementById('exigirOtp').value === 'nao');
  await n.w.criarContrato(); await esperar(100);
  let sg = n.ins.find(x => x[0] === 'cr_signatarios')[1];
  ok('só o link: NÃO envia otp_exigido (continua funcionando sem o SQL da R37)', sg.length === 2 && sg.every(s => !('otp_exigido' in s)));
  ok('só o link: sem aviso de código na tela de links', !n.D.querySelector('[data-otp-aviso]'));
  n = await novo(); n.D.getElementById('exigirOtp').value = 'sim';
  await n.w.criarContrato(); await esperar(100);
  sg = n.ins.find(x => x[0] === 'cr_signatarios')[1];
  ok('exigir código: TODOS os signatários saem com otp_exigido=true', sg.length === 2 && sg.every(s => s.otp_exigido === true));
  ok('exigir código: a tela de links avisa para gerar o código no painel', !!n.D.querySelector('[data-otp-aviso]') && /Painel de Contratos/.test(n.D.querySelector('[data-otp-aviso]').textContent));
  ok('exigir código: o WhatsApp do convite avisa que virá um código', /precisar de um código/.test(decodeURIComponent((n.D.getElementById('linksList').innerHTML.match(/wa\.me\/\?text=([^"]*)"/) || [])[1] || '')));
  // padrão pela configuração
  { const dom = new JSDOM(rd('novo-contrato.html'), { runScripts: 'dangerously', url: 'http://localhost/novo-contrato.html', beforeParse(w) { w.eval(cfg.replace("OTP_PADRAO = 'nao'", "OTP_PADRAO = 'sim'")); } });
    const w = dom.window; w.eval(utils); w.eval(otp);
    w._sb = { auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) }, from: () => ({ select: () => thenable([]) }), rpc: async () => ({ data: null, error: null }) };
    await esperar(400);
    ok('OTP_PADRAO="sim" no cr-config.js já vem marcado', w.document.getElementById('exigirOtp').value === 'sim'); }
  console.log(falhas ? '\n' + falhas + ' FALHA(S)' : '\nTodos OK'); process.exit(falhas ? 1 : 0);
})();
