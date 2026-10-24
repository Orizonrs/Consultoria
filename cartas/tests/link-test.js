// R19: testes das regras do cliente para o prazo do link (sem dependências). Uso: node tests/link-test.js
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const sb = { console, setInterval() {}, clearInterval() {}, setTimeout() {}, localStorage: { length: 0, getItem() { return null }, setItem() {}, removeItem() {} },
  document: { getElementById() { return null }, querySelector() { return null }, querySelectorAll() { return [] }, addEventListener() {}, readyState: 'complete' }, navigator: {} };
sb.window = sb; vm.createContext(sb);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'assets/cr-utils.js'), 'utf8'), sb);
const agora = '2026-10-23T12:00:00Z', plus = h => new Date(Date.parse(agora) + h * 3600000).toISOString();
let n = 0; const ok = (c, m) => { assert(c, m); n++; };
// linkValidade
let v = sb.linkValidade(null, agora);           ok(v.estado === 'sem_prazo' && v.dias === null, 'sem prazo');
v = sb.linkValidade('lixo', agora);             ok(v.estado === 'sem_prazo', 'data inválida não quebra');
v = sb.linkValidade(plus(-1), agora);           ok(v.estado === 'expirado' && v.dias === 0 && /^expirado em/.test(v.rotulo), 'expirado');
v = sb.linkValidade(agora, agora);              ok(v.estado === 'expirado', 'exatamente agora = expirado');
v = sb.linkValidade(plus(5), agora);            ok(v.estado === 'vencendo' && /menos de 24 h/.test(v.rotulo), '5 h = vencendo');
v = sb.linkValidade(plus(24), agora);           ok(v.estado === 'vencendo' && v.dias === 1, '24 h = 1 dia');
v = sb.linkValidade(plus(24 * 3), agora);       ok(v.estado === 'vencendo' && v.dias === 3, '3 dias = vencendo');
v = sb.linkValidade(plus(24 * 3 + 1), agora);   ok(v.estado === 'ok' && v.dias === 4, 'mais de 3 dias = ok (arredonda para cima)');
v = sb.linkValidade(plus(24 * 30), agora);      ok(v.estado === 'ok' && v.dias === 30 && /expira em 30 dias/.test(v.rotulo), '30 dias');
// renovarLink: chama a função certa, traduz erros do servidor e do banco sem a função
(async () => {
  let chamada; const mk = r => ({ rpc: async (fn, args) => { chamada = { fn, args }; return r; } });
  sb._sb = mk({ data: { ok: true, token: 'x', expira_em: 'y' }, error: null });
  let r = await sb.renovarLink(7, 15, true);
  ok(chamada.fn === 'cr_renovar_link' && chamada.args.p_signatario === 7 && chamada.args.p_dias === 15 && chamada.args.p_novo_token === true && r.ok, 'rpc com os parâmetros certos');
  r = await sb.renovarLink(7, 15); ok(chamada.args.p_novo_token === false, 'novoToken ausente = false (só prorroga)');
  sb._sb = mk({ data: { erro: 'cancelado' }, error: null });
  r = await sb.renovarLink(7, 15, true); ok(/cancelado/i.test(r.erro), 'erro do servidor traduzido');
  sb._sb = mk({ data: { erro: 'ja_assinado' }, error: null });
  r = await sb.renovarLink(7, 15, true); ok(/já assinou/.test(r.erro), 'já assinou');
  sb._sb = mk({ data: null, error: { message: 'Could not find the function public.cr_renovar_link in the schema cache' } });
  const log = console.error; console.error = () => {};
  r = await sb.renovarLink(7, 15, true); console.error = log;
  ok(/rode sql\/cr-schema\.sql/.test(r.erro), 'função ausente orienta rodar o SQL');
  sb._sb = { rpc: async () => { throw new Error('rede'); } };
  console.error = () => {}; r = await sb.renovarLink(7, 15, true); console.error = log;
  ok(r.erro && !r.ok, 'falha de rede não derruba a tela');
  console.log('LINK UI/JS: ' + n + ' verificações OK');
})().catch(e => { console.error('FALHOU:', e.message); process.exit(1); });
