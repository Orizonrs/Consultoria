// Testes das regras do cliente do M15 (assets/cr-utils.js). Rodar: node tests/mov-test.js  (não precisa de jsdom)
const fs = require('fs'), vm = require('vm'), path = require('path');
const sb = { console, setInterval() {}, clearInterval() {}, setTimeout() {}, localStorage: { getItem() { return null }, setItem() {}, removeItem() {} },
  document: { getElementById() { return null }, querySelector() { return null }, querySelectorAll() { return [] }, addEventListener() {}, readyState: 'complete' }, navigator: {} };
sb.window = sb; vm.createContext(sb);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../assets/cr-utils.js'), 'utf8'), sb);
let falhas = 0; const ok = (n, c) => { if (!c) { falhas++; console.log('FALHOU', n); } else console.log('OK    ', n); };
const C = (id, o = {}) => Object.assign({ id, status: 'assinado', tipo: 'estagio', periodo_inicio: '2026-01-10', periodo_fim: '2026-07-10', contrato_origem_id: null, tipo_mov: null }, o);

let L = [C(1)];
ok('assinado sem movimento pode movimentar', sb.movPode(L, L[0]).ok);
ok('não assinado não pode', sb.movPode([C(1, { status: 'enviado' })], C(1, { status: 'enviado' })).motivo === 'origem_nao_assinada');
L = [C(1), C(2, { contrato_origem_id: 1, tipo_mov: 'aditivo', status: 'enviado' })];
ok('com movimento pendente, o original fica bloqueado', sb.movPode(L, L[0]).motivo === 'ja_possui_movimento');
L[1].status = 'cancelado';
ok('movimento cancelado libera de novo', sb.movPode(L, L[0]).ok);
L = [C(1), C(2, { contrato_origem_id: 1, tipo_mov: 'renovacao', periodo_inicio: '2026-07-11', periodo_fim: '2027-01-10' })];
ok('original com movimento assinado é "substituído"', sb.movSuperado(L, L[0]) === true);
ok('a versão mais recente não é substituída', sb.movSuperado(L, L[1]) === false);
ok('a mais recente pode ser movimentada', sb.movPode(L, L[1]).ok);
ok('raiz da cadeia', sb.movRaiz(L, L[1]).id === 1);
L.push(C(3, { contrato_origem_id: 2, tipo_mov: 'rescisao', periodo_fim: '2026-12-01' }));
ok('rescisão assinada: toda a cadeia vira rescindida', sb.movRescindido(L, L[0]) && sb.movRescindido(L, L[1]));
ok('a própria rescisão não aceita movimento', sb.movPode(L, L[2]).motivo === 'origem_rescindida');
ok('rescisão pendente NÃO rescinde ainda', !sb.movRescindido([C(1), C(2, { contrato_origem_id: 1, tipo_mov: 'rescisao', status: 'enviado' })], C(1)));
const loop = [C(1, { contrato_origem_id: 2 }), C(2, { contrato_origem_id: 1 })];
ok('ciclo de dados não trava (proteção)', !!sb.movRaiz(loop, loop[0]));
ok('alerta: passa de 2 anos', sb.movAlertaDuracao([C(1)], C(1), '2028-02-01').includes('2 anos'));
ok('alerta: dentro de 2 anos = sem aviso', sb.movAlertaDuracao([C(1)], C(1), '2027-12-31') === '');
ok('alerta: CLT nunca avisa', sb.movAlertaDuracao([C(1, { tipo: 'clt' })], C(1, { tipo: 'clt' }), '2035-01-01') === '');
ok('alerta soma a cadeia (usa início do ORIGINAL)', sb.movAlertaDuracao([C(1), C(2, { contrato_origem_id: 1, periodo_inicio: '2027-07-11' })], C(2, { contrato_origem_id: 1, periodo_inicio: '2027-07-11' }), '2028-03-01').includes('10/01/2026'));
ok('todo erro do servidor tem texto', ['origem_nao_assinada', 'ja_possui_movimento', 'sem_alteracao', 'campo_nao_permitido', 'valor_invalido', 'termo_nao_posterior', 'motivo_obrigatorio', 'data_obrigatoria', 'origem_rescindida', 'data_apos_termino', 'data_antes_do_inicio', 'origem_sem_termo', 'novo_termo_obrigatorio', 'termo_antes_do_inicio', 'origem_inexistente', 'tipo_invalido'].every(k => sb.MOV_ERROS[k]));
console.log(falhas ? '\n' + falhas + ' FALHA(S)' : '\nTodos OK'); process.exit(falhas ? 1 : 0);
