// R19: teste de tela (jsdom) do modal 🔗 de index-contratos.html — validade, prorrogar, link novo, cancelado, selo "link vencido".
// Precisa: npm i jsdom.  Rodar: node tests/link-ui-test.js   (NÃO substitui testar no navegador com o Supabase real: M-59 a M-64)
const { JSDOM } = require('jsdom'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), html = fs.readFileSync(path.join(root, 'index-contratos.html'), 'utf8');
const utils = fs.readFileSync(path.join(root, 'assets/cr-utils.js'), 'utf8'), cfg = fs.readFileSync(path.join(root, 'assets/cr-config.js'), 'utf8');
let falhas = 0; const ok = (n, c) => { if (!c) { falhas++; console.log('FALHOU', n); } else console.log('OK    ', n); };
const esperar = ms => new Promise(r => setTimeout(r, ms));
const dia = n => new Date(Date.now() + n * 86400000).toISOString();
const contratos = [
  { id: 1, numero_contrato: 'TCE-2026-0001', titulo: 'TCE — Ana', tipo: 'estagio', status: 'parcial', nome_candidato: 'Ana', empresa: 'ACME', criado_em: dia(-2) },
  { id: 2, numero_contrato: 'CLT-2026-0001', titulo: 'CLT — Bia', tipo: 'clt', status: 'cancelado', nome_candidato: 'Bia', empresa: 'ACME', criado_em: dia(-3) },
  { id: 3, numero_contrato: 'TCE-2026-0002', titulo: 'TCE — <b>Caio</b>', tipo: 'estagio', status: 'enviado', nome_candidato: 'Caio', empresa: 'ACME', criado_em: dia(-1) },
];
const mkSigs = () => [
  { id: 10, contrato_id: 1, nome: 'Orizon', email: 'o@x.com', papel: 'empresa_nexus', token: 'tok10', status: 'assinado', assinado_em: dia(-1), expira_em: dia(20) },
  { id: 11, contrato_id: 1, nome: 'Ana', email: 'a@x.com', papel: 'candidato', token: 'tok11', status: 'pendente', expira_em: dia(-2) },
  { id: 20, contrato_id: 2, nome: 'Bia', email: 'b@x.com', papel: 'candidato', token: 'tok20', status: 'pendente', expira_em: dia(-5) },
  { id: 30, contrato_id: 3, nome: 'Caio <i>x</i>', email: 'c@x.com', papel: 'candidato', token: 'tok30', status: 'pendente', expira_em: dia(20) },
  { id: 31, contrato_id: 3, nome: 'Dani', email: 'd@x.com', papel: 'supervisor', token: 'tok31', status: 'recusado', motivo_recusa: '<script>x</script>', expira_em: dia(20) },
];
async function abrir(rpcResp) {
  const calls = [];
  const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'http://localhost/index-contratos.html', beforeParse(win) { win.eval(cfg); } });
  const w = dom.window; w.eval(utils); w.eval(fs.readFileSync(path.join(root, 'assets/cr-otp.js'), 'utf8')); w.confirm = () => true; w.HTMLElement.prototype.scrollIntoView = () => {};
  const sigs = mkSigs();
  const thenable = d => { const q = { eq() { return q; }, order() { return q; }, then(res) { res({ data: d, error: null }); } }; return q; };
  w._sb = { auth: { getUser: async () => ({ data: { user: null } }) }, from: t => ({ select: () => thenable(t === 'cr_contratos' ? contratos : sigs) }),
    rpc: async (fn, args) => { calls.push([fn, args]); return { data: rpcResp(args), error: null }; } };
  await esperar(400); return { w, D: w.document, calls, sigs, modal: () => w.document.getElementById('modalLinksContent').innerHTML, toasts: () => [...w.document.querySelectorAll('#toast-ct *')].map(x => x.textContent).join(' | ') };
}
(async () => {
  const resp = a => ({ ok: true, token: a.p_novo_token ? 'tokNOVO' : 'tok11', expira_em: dia(a.p_dias), novo_link: a.p_novo_token });
  let t = await abrir(resp);
  const linha = n => [...t.D.querySelectorAll('#tbodyContratos tr')].find(tr => tr.textContent.includes(n));
  ok('selo "link vencido" no contrato em andamento com link vencido', /link vencido/.test(linha('TCE-2026-0001').textContent));
  ok('sem selo quando os links estão no prazo', !/link vencido/.test(linha('TCE-2026-0002').textContent));
  ok('sem selo em contrato cancelado (mesmo com link vencido)', !/link vencido/.test(linha('CLT-2026-0001').textContent));
  t.w.verLinks(1); let m = t.modal();
  ok('pendente vencido mostra "Link expirado em"', /Link expirado em/.test(m) && /tag-red/.test(m));
  ok('mostra botões Prorrogar e Novo link', /renovar\(11, false\)/.test(m) && /renovar\(11, true\)/.test(m));
  ok('assinado não ganha botão de renovar nem link', !/renovar\(10,/.test(m) && !/tok10/.test(m));
  const sel = () => t.D.getElementById('prazoRenovar');
  ok('seletor de prazo 7/15/30/60 presente, padrão 15', !!sel() && [...sel().options].map(o => o.value).join() === '7,15,30,60' && sel().value === '15');
  ok('WhatsApp leva a data de validade quando há prazo', decodeURIComponent((m.match(/wa\.me\/\?text=([^"]+)"/) || [])[1] || '').includes('o link vale até'));
  // prorrogar
  t.D.getElementById('prazoRenovar').value = '30';
  await t.w.renovar(11, false);
  ok('prorrogar chama cr_renovar_link com 30 dias e SEM token novo', t.calls.length === 1 && t.calls[0][0] === 'cr_renovar_link' && t.calls[0][1].p_signatario === 11 && t.calls[0][1].p_dias === 30 && t.calls[0][1].p_novo_token === false);
  ok('depois de prorrogar: link volta a valer na tela e o selo some', /Link expira em 30 dias/.test(t.modal()) && !/link vencido/.test(linha('TCE-2026-0001').textContent));
  ok('prazo escolhido é lembrado ao reabrir o modal', sel().value === '30');
  // link novo
  await t.w.renovar(11, true);
  ok('link novo envia p_novo_token=true e a tela passa a usar o token novo', t.calls[1][1].p_novo_token === true && /assinar-contrato\.html\?t=tokNOVO/.test(t.modal()) && !/\?t=tok11"/.test(t.modal()));
  ok('toast pede para reenviar o link novo', /reenvie/i.test(t.toasts()));
  // cancelar a confirmação não chama o servidor
  t.w.confirm = () => false; const n = t.calls.length; await t.w.renovar(11, true);
  ok('recusar a confirmação do link novo não chama o servidor', t.calls.length === n);
  // erro do servidor
  let e = await abrir(() => ({ erro: 'cancelado' })); await e.w.renovar(11, false);
  ok('erro do servidor vira toast e não altera a tela', /cancelado/i.test(e.toasts()) && e.sigs.find(s => s.id === 11).token === 'tok11');
  // cancelado e recusado
  t.w.verLinks(2); m = t.modal();
  ok('contrato cancelado: sem link, sem botões, sem seletor de prazo', /link está desativado/.test(m) && !/tok20/.test(m) && !/renovar\(/.test(m) && !/prazoRenovar/.test(m));
  t.w.verLinks(3); m = t.modal();
  const box = t.D.getElementById('modalLinksContent');
  ok('recusado: mostra o motivo como texto (sem criar <script>) e não oferece link', /Recusou a assinatura/.test(m) && !box.querySelector('script') && box.textContent.includes('<script>x</script>') && !/tok31/.test(m));
  ok('nome e título com HTML viram texto, não elementos (<b>, <i>)', !box.querySelector('b, i') && box.textContent.includes('<b>Caio</b>') && box.textContent.includes('Caio <i>x</i>'));
  // R20: reabrir quem recusou + duplicar
  let r = await abrir(a => a.p_dias ? { ok: true, token: 'tokREAB', expira_em: dia(a.p_dias) } : {});
  r.w.verLinks(3); ok('recusado ganha botão "Reabrir assinatura"', /reabrir\(31\)/.test(r.modal()) && !!r.D.getElementById('prazoRenovar'));
  r.w.confirm = () => false; await r.w.reabrir(31); ok('recusar a confirmação não chama o servidor', r.calls.length === 0);
  r.w.confirm = () => true; r.D.getElementById('prazoRenovar').value = '7'; await r.w.reabrir(31);
  ok('reabrir chama cr_reabrir_signatario com 7 dias', r.calls[0][0] === 'cr_reabrir_signatario' && r.calls[0][1].p_signatario === 31 && r.calls[0][1].p_dias === 7);
  ok('depois de reabrir: pendente, link novo, motivo da recusa some', /tokREAB/.test(r.modal()) && !/Recusou a assinatura/.test(r.modal()));
  ok('botão 📑 duplicar nos contratos normais', /novo-contrato\.html\?dup=1"/.test(r.D.getElementById('tbodyContratos').innerHTML));
  const du = r.w.contratoParaDuplicar({ id: 5, tipo: 'clt', nome_candidato: 'Ana', cpf: '1', email_candidato: 'a@x', matricula: 'm', empresa: 'ACME', valor_bolsa: 1500, supervisor_nome: 'Chefe', periodo_fim: '2027-01-01', cargo: 'Dev' },
    [{ contrato_id: 5, papel: 'candidato', nome: 'Ana' }, { contrato_id: 5, papel: 'empresa_nexus', nome: 'Orizon' }, { contrato_id: 5, papel: 'supervisor', nome: 'Chefe', email: 'c@x' }, { contrato_id: 6, papel: 'instituicao', nome: 'Outro' }]);
  ok('duplicar: copia empresa/valores/supervisor e NÃO copia candidato, CPF, e-mail, matrícula nem datas', du.tipo === 'clt' && du.campos.empresa === 'ACME' && du.campos.valor_bolsa === '1500' && du.campos.cargo === 'Dev' && !('nome_candidato' in du.campos) && !('cpf' in du.campos) && !('email_candidato' in du.campos) && !('matricula' in du.campos) && !('periodo_fim' in du.campos));
  ok('duplicar: só leva signatários extras do próprio contrato', du.signatarios.length === 1 && du.signatarios[0].papel === 'supervisor' && du.signatarios[0].email === 'c@x');
  ok('duplicar: origem nula não quebra', r.w.contratoParaDuplicar(null, []) === null);
  console.log(falhas ? '\n' + falhas + ' FALHARAM' : '\nTodos OK'); process.exit(falhas ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
