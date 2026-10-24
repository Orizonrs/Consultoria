// R20: regras do cliente para reabrir assinatura recusada e duplicar contrato (sem dependências). Uso: node tests/reabrir-test.js
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const sb = { console, setInterval() {}, clearInterval() {}, setTimeout() {}, localStorage: { length: 0, getItem() { return null }, setItem() {}, removeItem() {} },
  document: { getElementById() { return null }, querySelector() { return null }, querySelectorAll() { return [] }, addEventListener() {}, readyState: 'complete' }, navigator: {} };
sb.window = sb; vm.createContext(sb);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'assets/cr-utils.js'), 'utf8'), sb);
let n = 0; const ok = (c, m) => { assert(c, m); n++; };
(async () => {
  const chamadas = []; const rpc = resp => { sb._sb = { rpc: async (fn, a) => { chamadas.push([fn, a]); return resp; } }; };
  rpc({ data: { ok: true, token: 'novo', expira_em: 'x' }, error: null });
  let r = await sb.reabrirSignatario(9, 10);
  ok(r.ok && r.token === 'novo' && chamadas[0][0] === 'cr_reabrir_signatario' && chamadas[0][1].p_signatario === 9 && chamadas[0][1].p_dias === 10, 'chama a função certa com os parâmetros');
  rpc({ data: { erro: 'nao_recusado' }, error: null }); r = await sb.reabrirSignatario(9, 10);
  ok(!r.ok && /não está com a assinatura recusada/.test(r.erro), 'erro nao_recusado traduzido');
  rpc({ data: { erro: 'contrato_assinado' }, error: null }); r = await sb.reabrirSignatario(9, 10);
  ok(/já assinado/.test(r.erro), 'erro contrato_assinado traduzido');
  rpc({ data: { erro: 'cancelado' }, error: null }); r = await sb.reabrirSignatario(9, 10);
  ok(/cancelado/.test(r.erro), 'erro cancelado traduzido');
  rpc({ data: null, error: { message: 'Could not find the function public.cr_reabrir_signatario (PGRST202)' } });
  const log = console.error; console.error = () => {}; r = await sb.reabrirSignatario(9, 10);
  ok(/rode sql\/cr-schema\.sql \(R20\)/.test(r.erro), 'função ausente orienta rodar o SQL');
  sb._sb = { rpc: async () => { throw new Error('rede'); } }; r = await sb.reabrirSignatario(9, 10); console.error = log;
  ok(r.erro && !r.ok, 'falha de rede não derruba a tela');
  const c = { id: 5, tipo: 'clt', nome_candidato: 'Ana', cpf: '1', email_candidato: 'a@x', matricula: 'm', numero_contrato: 'CLT-1', status: 'assinado', periodo_inicio: '2026-01-01', periodo_fim: '2027-01-01', empresa: 'ACME', valor_bolsa: 1500, valor_vt: 0, cargo: 'Dev', curso: '', supervisor_nome: 'Chefe' };
  const d = sb.contratoParaDuplicar(c, [{ contrato_id: 5, papel: 'candidato', nome: 'Ana' }, { contrato_id: 5, papel: 'empresa_nexus', nome: 'Orizon' }, { contrato_id: 5, papel: 'supervisor', nome: 'Chefe', email: null }, { contrato_id: 6, papel: 'instituicao', nome: 'Outro' }]);
  ok(d.tipo === 'clt' && d.campos.empresa === 'ACME' && d.campos.valor_bolsa === '1500' && d.campos.valor_vt === '0' && d.campos.cargo === 'Dev', 'copia empresa, valores e cargo (zero é valor válido)');
  ok(!('curso' in d.campos), 'campo vazio não é copiado');
  ['nome_candidato', 'cpf', 'email_candidato', 'matricula', 'numero_contrato', 'status', 'periodo_inicio', 'periodo_fim'].forEach(k => ok(!(k in d.campos), 'não copia ' + k));
  ok(d.signatarios.length === 1 && d.signatarios[0].papel === 'supervisor' && d.signatarios[0].email === '', 'só o supervisor do próprio contrato; e-mail nulo vira vazio');
  ok(sb.contratoParaDuplicar({ id: 1, tipo: 'qualquer' }, null).tipo === 'estagio', 'tipo desconhecido cai em estágio; sem signatários não quebra');
  ok(sb.contratoParaDuplicar(null, []) === null, 'origem nula devolve null');
  console.log('REABRIR/DUPLICAR JS: ' + n + ' verificações OK');
})().catch(e => { console.error('FALHOU:', e.message); process.exit(1); });
