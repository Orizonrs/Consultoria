// R22 (M9): regras dos pontos de atenção (parseJornada, avisosContrato). Sem dependências. Uso: node tests/avisos-test.js
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const sb = { console, setInterval() {}, clearInterval() {}, setTimeout() {}, localStorage: { length: 0, getItem() { return null }, setItem() {}, removeItem() {} },
  document: { getElementById() { return null }, querySelector() { return null }, querySelectorAll() { return [] }, addEventListener() {}, readyState: 'complete' }, navigator: {} };
sb.window = sb; vm.createContext(sb);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'assets/cr-utils.js'), 'utf8'), sb);
let n = 0; const ok = (c, m) => { assert(c, m); n++; };
const J = t => JSON.parse(JSON.stringify(sb.parseJornada(t)));
const cods = (d, o) => sb.avisosContrato(d, o).map(a => a.cod).sort().join();
const est = (campos, papeis, tipo) => ({ tipo: tipo || 'estagio', campos, papeis: papeis || [] });
// parseJornada
ok(J('6h/dia · 30h/sem').dia === 6 && J('6h/dia · 30h/sem').sem === 30, '6h/dia · 30h/sem');
ok(J('6 horas diárias e 30 semanais').dia === 6 && J('6 horas diárias e 30 semanais').sem === 30, 'por extenso');
ok(J('8h/dia 44h/semana').dia === 8 && J('8h/dia 44h/semana').sem === 44, '8h/dia 44h/semana');
ok(J('6h30/dia').dia === 6.5, '6h30 = 6,5 h (não 30 h/dia)');
ok(J('4,5h/dia').dia === 4.5, 'vírgula decimal');
ok(J('').dia === null && J(null).sem === null && J('segunda a sexta, manhã').dia === null, 'texto livre/vazio não quebra e não inventa');
ok(J('30h semanais').sem === 30 && J('30h semanais').dia === null, 'só semanal');
// estágio: jornada
ok(cods(est({ jornada_horas: '6h/dia · 30h/sem' })) === '', 'jornada padrão sem alerta');
ok(cods(est({ jornada_horas: '8h/dia · 40h/sem' })) === 'jornada_dia,jornada_sem', '8h/dia 40h/sem alerta dia e semana (>30 só com teoria/prática)');
ok(sb.avisosContrato(est({ jornada_horas: '6h/dia · 41h/sem' })).find(a => a.cod === 'jornada_sem').texto.includes('40 h'), 'acima de 40 h cita o teto');
ok(cods(est({ jornada_horas: '7h/dia' })) === 'jornada_dia', '7h/dia');
// duração e recesso
const dur = (i, f) => est({ periodo_inicio: i, periodo_fim: f });
ok(cods(dur('2026-01-01', '2028-01-01')) === 'recesso', 'exatamente 2 anos: sem alerta de duração');
ok(cods(dur('2026-01-01', '2028-01-02')) === 'duracao_max,recesso', 'um dia a mais que 2 anos: alerta');
let r = sb.avisosContrato(dur('2026-01-01', '2026-12-31')); ok(r.length === 1 && r[0].nivel === 'info' && /30 dias/.test(r[0].texto), '1 ano (01/01 a 31/12) = recesso de 30 dias');
r = sb.avisosContrato(dur('2026-01-01', '2026-06-30')); ok(/proporcional, cerca de 15 dias/.test(r[0].texto), '6 meses = cerca de 15 dias');
ok(cods(dur('2026-06-01', '2026-01-01')) === '' && cods(dur('lixo', '2027-01-01')) === '' && cods(dur('', '')) === '', 'datas invertidas/inválidas/vazias: sem alerta e sem erro');
ok(sb.avisosContrato(dur('2026-01-01', '2026-12-31')).every(a => a.nivel !== 'aviso'), 'recesso é só informação');
// completo (etapa 2+)
const base = { periodo_inicio: '2026-01-01', periodo_fim: '2026-12-31', valor_bolsa: '900', apolice_seguro: 'AP-1', jornada_horas: '6h/dia · 30h/sem' };
ok(cods(est({}, []), { completo: false }) === '', 'formulário em branco na etapa 1: nenhum alerta (sem poluir)');
ok(cods(est({}, ['candidato', 'empresa_nexus']), { completo: true }) === 'sem_apolice,sem_bolsa,sem_concedente,sem_instituicao,sem_termino', 'etapa 2+: aponta o que falta');
ok(cods(est(base, ['candidato', 'empresa_nexus', 'instituicao', 'supervisor']), { completo: true }) === 'recesso', 'tudo certo: só a informação de recesso');
ok(cods(est(base, ['candidato', 'empresa_nexus', 'instituicao', 'empresa_cliente']), { completo: true }) === 'recesso', 'empresa_cliente também vale como concedente');
ok(cods(est({ ...base, valor_bolsa: '0' }, ['instituicao', 'supervisor']), { completo: true }).includes('sem_bolsa'), 'bolsa zero alerta');
ok(!cods(est({ ...base, periodo_fim: '' }, ['instituicao', 'supervisor']), { completo: false }).includes('sem_termino'), 'sem término só alerta a partir da etapa 2');
// CLT
ok(cods(est({ jornada_horas: '8h/dia · 44h/sem' }, [], 'clt')) === '', 'CLT 8h/44h ok');
ok(cods(est({ jornada_horas: '9h/dia · 48h/sem' }, [], 'clt')) === 'jornada_dia,jornada_sem', 'CLT acima de 8h/44h');
ok(cods(est({}, [], 'clt'), { completo: true }) === 'sem_salario', 'CLT sem salário (etapa 2+)');
ok(cods(est({ jornada_horas: '6h/dia · 30h/sem', periodo_inicio: '2020-01-01', periodo_fim: '2030-01-01' }, [], 'clt')) === '', 'CLT não recebe regras de estágio (duração, recesso)');
ok(sb.avisosContrato(null).length === 0 && sb.avisosContrato(undefined, {}).length === 0, 'entrada nula não quebra');
console.log('AVISOS JS: ' + n + ' verificações OK');
