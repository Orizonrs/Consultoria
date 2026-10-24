// R26 (M11): regras do cliente da ordem de assinatura e dos lembretes (sem dependências). Uso: node tests/ordem-test.js
// Espelham o SQL (cr_sig_bloqueador / cr_registrar_lembrete); quem manda é o servidor (tests/sql/ordem-teste.sql).
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const sb = { console, setInterval() {}, clearInterval() {}, setTimeout() {}, localStorage: { length: 0, getItem() { return null }, setItem() {}, removeItem() {} },
  document: { getElementById() { return null }, querySelector() { return null }, querySelectorAll() { return [] }, addEventListener() {}, readyState: 'complete' }, navigator: {},
  location: { origin: 'http://x', pathname: '/a/b.html' }, toast() {} };
sb.window = sb; vm.createContext(sb);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'assets/cr-config.js'), 'utf8'), sb);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'assets/cr-utils.js'), 'utf8'), sb);
let n = 0; const ok = (c, m) => { assert(c, m); n++; };
const dia = d => new Date(Date.UTC(2026, 9, 23, 12) + d * 86400000).toISOString(), agora = dia(0);
const seq = { id: 1, status: 'parcial', ordem_assinatura: 'sequencial', criado_em: dia(-10), atualizado_em: dia(-5) };
const S = [
  { id: 1, contrato_id: 1, nome: 'Orizon', ordem: 1, status: 'assinado', expira_em: dia(10) },
  { id: 2, contrato_id: 1, nome: 'Ana', ordem: 2, status: 'pendente', expira_em: dia(10) },
  { id: 3, contrato_id: 1, nome: 'Chefe', ordem: 3, status: 'pendente', expira_em: dia(10) },
  { id: 4, contrato_id: 1, nome: 'Escola', ordem: 3, status: 'pendente', expira_em: dia(10) },
  { id: 9, contrato_id: 2, nome: 'Outro contrato', ordem: 1, status: 'pendente', expira_em: dia(10) }];
// ordem
ok(sb.sigAguardando(seq, S, S[0]) === null, '1º assinado: ninguém o bloqueia');
ok(sb.sigAguardando(seq, S, S[1]) === null, '2º está na vez (1º já assinou)');
ok(sb.sigAguardando(seq, S, S[2]) === 'Ana', '3º aguarda a Ana');
ok(sb.sigAguardando(seq, S, S[3]) === 'Ana', 'mesma ordem aguarda o mesmo bloqueador');
ok(sb.sigAguardando({ ...seq, ordem_assinatura: 'livre' }, S, S[3]) === null, 'ordem livre nunca bloqueia');
ok(sb.sigAguardando({ ...seq, ordem_assinatura: null }, S, S[3]) === null, 'contrato antigo (sem a coluna) não bloqueia');
ok(sb.sigAguardando(seq, S, S[4]) === null, 'signatário de outro contrato não conta');
ok(sb.sigAguardando(seq, [{ id: 1, contrato_id: 1, nome: 'A', ordem: 1, status: 'recusado' }, { id: 2, contrato_id: 1, nome: 'B', ordem: 2, status: 'pendente' }], { id: 2, contrato_id: 1, ordem: 2 }) === 'A', 'recusado de ordem menor bloqueia');
ok(sb.sigAguardando(seq, [{ id: 1, contrato_id: 1, nome: 'A', status: 'pendente' }, { id: 2, contrato_id: 1, nome: 'B', status: 'pendente' }], { id: 2, contrato_id: 1 }) === null, 'sem ordem preenchida não bloqueia');
ok(sb.sigAguardando(null, S, S[2]) === null && sb.sigAguardando(seq, S, null) === null, 'entradas nulas não quebram');
ok(sb.sigAguardando(seq, [{ id: 7, contrato_id: 1, nome: 'Z', ordem: 1, status: 'pendente' }, { id: 5, contrato_id: 1, nome: 'Y', ordem: 1, status: 'pendente' }, { id: 8, contrato_id: 1, nome: 'W', ordem: 2, status: 'pendente' }], { id: 8, contrato_id: 1, ordem: 2 }) === 'Y', 'vários bloqueadores: o de menor id da menor ordem');
// lembreteInfo
ok(sb.lembreteInfo({}).rotulo === 'nenhum lembrete enviado' && sb.lembreteInfo({ lembretes_qtd: 0 }).qtd === 0, 'sem lembrete');
ok(sb.lembreteInfo({ lembretes_qtd: 1, lembrete_em: dia(0) }, agora).rotulo === '1 lembrete · último hoje', 'hoje, singular');
ok(sb.lembreteInfo({ lembretes_qtd: 2, lembrete_em: dia(-1) }, agora).rotulo === '2 lembretes · último ontem', 'ontem, plural');
ok(sb.lembreteInfo({ lembretes_qtd: 3, lembrete_em: dia(-6) }, agora).rotulo === '3 lembretes · último há 6 dias', 'há N dias');
ok(sb.lembreteInfo({ lembretes_qtd: 3, lembrete_em: 'lixo' }, agora).qtd === 0, 'data inválida não quebra');
// precisaLembrete
let p = sb.precisaLembrete(seq, S, agora, 3);
ok(p.length === 1 && p[0].nome === 'Ana', 'só quem está na vez e parado há 3+ dias (Ana; o 3º não, o 1º já assinou)');
ok(sb.precisaLembrete({ ...seq, atualizado_em: dia(-1) }, S, agora, 3).length === 0, 'contrato mexido há 1 dia: ninguém');
ok(sb.precisaLembrete({ ...seq, atualizado_em: dia(-1) }, S.map(s => s.id === 2 ? { ...s, lembrete_em: dia(-4), lembretes_qtd: 1 } : s), agora, 3).length === 1, 'o último lembrete conta, não a atualização do contrato');
ok(sb.precisaLembrete(seq, S.map(s => s.id === 2 ? { ...s, lembrete_em: dia(-1), lembretes_qtd: 1 } : s), agora, 3).length === 0, 'lembrado ontem: não sugere de novo');
ok(sb.precisaLembrete(seq, S.map(s => s.id === 2 ? { ...s, expira_em: dia(-1) } : s), agora, 3).length === 0, 'link vencido: renovar antes, não lembrar');
ok(sb.precisaLembrete({ ...seq, status: 'cancelado' }, S, agora, 3).length === 0 && sb.precisaLembrete({ ...seq, status: 'assinado' }, S, agora, 3).length === 0, 'cancelado/assinado: nada');
ok(sb.precisaLembrete({ ...seq, ordem_assinatura: 'livre' }, S, agora, 3).map(s => s.nome).join() === 'Ana,Chefe,Escola', 'ordem livre: todos os pendentes');
ok(sb.precisaLembrete(seq, S, agora).length === 1 && sb.precisaLembrete({ ...seq, atualizado_em: dia(-2) }, S, agora).length === 0, 'padrão de 3 dias (CR_CONFIG.LEMBRETE_DIAS)');
ok(sb.precisaLembrete(null, S, agora).length === 0 && sb.precisaLembrete(seq, null, agora).length === 0, 'entradas nulas não quebram');
// mensagem e registro
const msg = sb.mensagemLembrete({ nome: 'Ana' }, 'TCE — Ana', 'http://x/a?t=1', dia(5));
ok(/^Olá Ana! Lembrete:/.test(msg) && msg.includes('"TCE — Ana"') && msg.includes('http://x/a?t=1') && /o link vale até/.test(msg), 'mensagem de lembrete com título, link e validade');
ok(!/o link vale até/.test(sb.mensagemLembrete({ nome: 'Ana' }, 'T', 'u', null)), 'sem prazo, sem frase de validade');
(async () => {
  const ch = []; const rpc = r => { sb._sb = { rpc: async (fn, a) => { ch.push([fn, a]); return r; } }; };
  rpc({ data: { ok: true, lembrete_em: 'x', lembretes_qtd: 2 }, error: null });
  let r = await sb.registrarLembrete(5, 'whatsapp');
  ok(r.ok && ch[0][0] === 'cr_registrar_lembrete' && ch[0][1].p_signatario === 5 && ch[0][1].p_canal === 'whatsapp', 'chama a função certa');
  for (const [e, re] of [['aguardando_vez', /aguarda a assinatura anterior/], ['link_vencido', /venceu/], ['cancelado', /cancelado/], ['ja_assinado', /já assinou/], ['canal_invalido', /Canal/]]) {
    rpc({ data: { erro: e }, error: null }); r = await sb.registrarLembrete(5, 'link'); ok(re.test(r.erro), 'erro ' + e + ' traduzido');
  }
  rpc({ data: null, error: { message: 'Could not find the function public.cr_registrar_lembrete (PGRST202)' } });
  const log = console.error; console.error = () => {}; r = await sb.registrarLembrete(5, 'link');
  ok(/rode sql\/cr-schema\.sql \(R26\)/.test(r.erro), 'função ausente orienta rodar o SQL');
  sb._sb = { rpc: async () => { throw new Error('rede'); } }; r = await sb.registrarLembrete(5, 'link'); console.error = log;
  ok(r.erro && !r.ok, 'falha de rede não derruba a tela');
  // lembrarRegistrar avisa a tela só quando registrou
  const avisos = [], erros = []; sb.toast = (m, t) => { if (t === 'err') erros.push(m); }; sb.aoLembrar = (id, x) => avisos.push([id, x.lembretes_qtd]);
  rpc({ data: { ok: true, lembrete_em: 'x', lembretes_qtd: 4 }, error: null });
  ok((await sb.lembrarRegistrar(8, 'email')) === true && avisos[0][0] === 8 && avisos[0][1] === 4, 'registrou: avisa a tela com a contagem do servidor');
  rpc({ data: { erro: 'aguardando_vez' }, error: null });
  ok((await sb.lembrarRegistrar(8, 'email')) === false && avisos.length === 1 && erros.length === 1, 'erro: não avisa a tela e mostra toast');
  // botão de e-mail
  const b = sb.btnEmailLembrete({ id: 3, nome: 'A"na <x>', email: 'a@x.com', expira_em: '' }, 'T"1', 'http://x?t=1&a=2');
  ok(/data-sig="3"/.test(b) && !/A"na/.test(b) && /&quot;/.test(b) && /enviarEmailLembrete/.test(b), 'botão de e-mail escapa aspas e guarda o id');
  ok(sb.btnEmailLembrete({ id: 3, nome: 'A', email: '' }, 'T', 'u') === '', 'sem e-mail, sem botão');
  console.log('ORDEM/LEMBRETE JS: ' + n + ' verificações OK');
})().catch(e => { console.error('FALHOU:', e.message); process.exit(1); });
