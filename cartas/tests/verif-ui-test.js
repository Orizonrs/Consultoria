// Teste de tela da R15 (4.5): visualizar-assinado.html (hash do servidor + QR + trilha cr_auditoria) e verificar.html. Precisa: npm i jsdom.  Rodar: node tests/verif-ui-test.js
// Nível "XX" (jsdom): confere o que a tela mostra/envia. NÃO substitui abrir no navegador com o Supabase real (M-52 a M-55).
const { JSDOM } = require('jsdom'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), rd = f => fs.readFileSync(path.join(root, f), 'utf8');
let falhas = 0; const ok = (n, c) => { if (!c) { falhas++; console.log('FALHOU', n); } else console.log('OK    ', n); };
const esperar = ms => new Promise(r => setTimeout(r, ms));
const H = 'ab'.repeat(32), HS1 = 'cd'.repeat(32), HS2 = 'ef'.repeat(32);
const thenable = d => { const q = { eq() { return q; }, order() { return q; }, single() { return { then(res) { res({ data: d && d[0] ? d[0] : null, error: null }); } }; }, then(res) { res({ data: d, error: null }); } }; return q; };

async function visualizar(contrato, sigs, audit, base) {
  const dom = new JSDOM(rd('visualizar-assinado.html'), { runScripts: 'outside-only', url: 'http://localhost/visualizar-assinado.html?id=7' });
  const w = dom.window;
  // monta o que os <script src> carregariam (sem rede)
  w.CR_CONFIG = { BASE_URL: base };
  w.eval(rd('assets/cr-qr.js'));
  const tabela = { cr_contratos: [contrato], cr_signatarios: sigs, cr_auditoria: audit };
  w._sb = { auth: { getUser: async () => ({ data: { user: null } }) }, from: t => ({ select: () => thenable(tabela[t]) }) };
  const inline = [...rd('visualizar-assinado.html').matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n');
  w.eval(inline); await esperar(500);
  return { w, D: w.document, doc: w.document.getElementById('docArea').innerHTML, painel: w.document.getElementById('statusPanel').innerHTML };
}
const C = { id: 7, tipo: 'estagio', numero_contrato: 'TCE-2026-0007', titulo: 'TCE — Ana — ACME', nome_candidato: 'Ana', empresa: 'ACME', status: 'assinado', criado_em: '2026-10-01T10:00:00Z', atualizado_em: '2026-10-03T15:00:00Z', hash_documento: H };
const S = [{ id: 1, nome: 'Orizon', papel: 'empresa_nexus', status: 'assinado', assinado_em: '2026-10-02T12:00:00Z', hash_assinatura: HS1, ip: '1.2.3.4' }, { id: 2, nome: 'Ana <b>x</b>', papel: 'candidato', status: 'assinado', assinado_em: '2026-10-03T15:00:00Z', hash_assinatura: HS2, ip: '5.6.7.8' }];
const A = [{ evento: 'visualizou', detalhe: 'Orizon', ip: '1.2.3.4', criado_em: '2026-10-02T11:00:00Z' }, { evento: 'assinou', detalhe: 'Orizon | ' + HS1, ip: '1.2.3.4', criado_em: '2026-10-02T12:00:00Z' }, { evento: 'assinou', detalhe: 'Ana <b>x</b> | ' + HS2, ip: '5.6.7.8', criado_em: '2026-10-03T15:00:00Z' }];

(async () => {
  // 1) contrato assinado, endereço público
  let t = await visualizar(C, S, A, 'https://orizon.com.br/documentos/');
  ok('mostra o hash SHA-256 do servidor (64 hex) no certificado', t.doc.includes(H));
  ok('mostra o hash de cada assinatura vindo do servidor', t.doc.includes(HS1) && t.doc.includes(HS2));
  ok('não existe mais hash curto calculado na tela', !/genHash|Hash Final/.test(t.w.document.documentElement.innerHTML) && !t.doc.includes('Hash Final'));
  ok('QR (svg) presente no certificado', /<div class="qr-box"><svg/.test(t.doc));
  ok('endereço de verificação impresso sob o QR', t.doc.includes('https://orizon.com.br/documentos/verificar.html'));
  ok('sem aviso de endereço local quando a base é pública', !t.doc.includes('qr-aviso') || !/class="qr-aviso"/.test(t.doc));
  ok('trilha usa cr_auditoria (mostra IP)', t.painel.includes('IP 1.2.3.4') && t.painel.includes('assinou o documento'));
  ok('hash NÃO aparece na trilha (só o nome)', !t.painel.includes(HS1));
  ok('nome com HTML é escapado na trilha', !t.painel.includes('<b>x</b>') && t.painel.includes('&lt;b&gt;x&lt;/b&gt;'));
  const ordem = [...t.painel.matchAll(/audit-ts">([^<]*)</g)].map(m => m[1]);
  ok('trilha tem 5 eventos (criação + 3 auditoria + finalizado)', ordem.length === 5);

  // 2) endereço local => aviso (não sai na impressão)
  t = await visualizar(C, S, A, 'http://localhost:8080/');
  ok('base local mostra o aviso para preencher BASE_URL_FIXA', /class="qr-aviso"/.test(t.doc) && t.doc.includes('BASE_URL_FIXA'));
  ok('aviso fica oculto na impressão (CSS)', rd('visualizar-assinado.html').includes('.toolbar, .qr-aviso, .cr-skip { display:none !important; }'));

  // 3) contrato ainda não finalizado: sem QR
  t = await visualizar({ ...C, status: 'parcial', hash_documento: null }, [S[0], { ...S[1], status: 'pendente', assinado_em: null, hash_assinatura: null }], A.slice(0, 2), 'https://x.com/');
  ok('parcial: sem QR e avisa que o hash sai quando todos assinarem', !t.doc.includes('qr-box"><svg') && t.doc.includes('gerado quando todos assinarem'));
  ok('parcial: só mostra hash de quem assinou', t.doc.includes(HS1) && !t.doc.includes(HS2));

  // 4) sem registros em cr_auditoria: cai no modo antigo (monta pelos signatários)
  t = await visualizar({ ...C, hash_documento: null }, S.map(s => ({ ...s, visualizado_em: '2026-10-01T09:00:00Z' })), [], 'https://x.com/');
  ok('sem auditoria no banco: trilha montada pelos signatários', t.painel.includes('visualizou o documento') && t.painel.includes('assinou o documento'));
  ok('assinado sem hash (contrato antigo): avisa em vez de inventar', t.doc.includes('anterior ao registro de hash'));

  // 5) verificar.html
  async function verificar(resp, q) {
    const dom = new JSDOM(rd('verificar.html'), { runScripts: 'outside-only', url: 'http://localhost/verificar.html' + (q || '') });
    const w = dom.window, calls = [];
    w.supabase = { createClient: () => ({ rpc: async (fn, a) => { calls.push([fn, a]); return resp instanceof Error ? { data: null, error: resp } : { data: resp, error: null }; } }) };
    w.CR_CONFIG = { SB_URL: 'u', SB_KEY: 'k' };
    w.eval([...rd('verificar.html').matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n'));
    await esperar(100); return { w, D: w.document, calls, res: () => w.document.getElementById('res').innerHTML };
  }
  let v = await verificar({ encontrado: true, nivel: 'documento', numero: 'TCE-2026-0007', tipo: 'estagio', status: 'assinado', inicio: '2026-01-01', fim: '2026-12-31', finalizado_em: '2026-10-03T15:00:00Z', partes: [{ papel: 'candidato', status: 'assinado', assinado_em: '2026-10-03T15:00:00Z' }] }, '?h=' + H);
  ok('?h= consulta sozinho, só chama cr_verificar_documento', v.calls.length === 1 && v.calls[0][0] === 'cr_verificar_documento' && v.calls[0][1].p_hash === H);
  ok('autêntico mostra número, situação e partes por papel', /Documento autêntico/.test(v.res()) && v.res().includes('TCE-2026-0007') && v.res().includes('Candidato/Colaborador'));
  v = await verificar({ encontrado: false }, '?h=' + H); ok('não encontrado => vermelho', /não encontrado/.test(v.res()) && v.res().includes('class="er"'));
  v = await verificar({ erro: 'hash_invalido' }, '?h=abc'); ok('código inválido explica o formato', /Código inválido/.test(v.res()));
  v = await verificar({ encontrado: true, nivel: 'documento', numero: 'X<img src=x>', tipo: 'clt', status: 'cancelado', partes: [] }, '?h=' + H);
  ok('cancelado aparece como CANCELADO e dados são escapados', /CANCELADO/.test(v.res()) && !v.res().includes('<img src=x>'));
  v = await verificar({ encontrado: true, nivel: 'documento', numero: 'TCE-1', tipo: 'estagio', status: 'assinado', posterior: { numero: 'RES-2026-0001', tipo_mov: 'rescisao', status: 'assinado' }, partes: [] }, '?h=' + H);
  ok('movimento posterior (rescisão) é avisado', /movimento posterior/.test(v.res()) && /encerrado/.test(v.res()));
  v = await verificar({ encontrado: true, nivel: 'assinatura', numero: 'TCE-2026-0007', status: 'parcial', papel: 'candidato', assinado_em: '2026-10-03T15:00:00Z' }, '?h=' + HS1);
  ok('hash de assinatura individual => "Assinatura autêntica"', /Assinatura autêntica/.test(v.res()));
  v = await verificar(new Error('rede'), '?h=' + H); ok('erro de rede => mensagem, sem quebrar', /Não foi possível consultar/.test(v.res()));
  v = await verificar({ encontrado: false }, ''); ok('sem ?h= não consulta nada', v.calls.length === 0);
  ok('página pública NÃO exige login (sem cr-auth.js)', !rd('verificar.html').includes('cr-auth.js') && !rd('verificar.html').includes('cr-shell.js'));
  console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTudo OK'); process.exit(falhas ? 1 : 0);
})();
