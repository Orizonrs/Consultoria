// R32 (M7): telas — candidatos.html (cadastro) e Novo Contrato preenchendo pelo cadastro (jsdom). Precisa: npm i jsdom. Rodar: node tests/cadastro-candidatos-ui-test.js
const { JSDOM } = require('jsdom'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), rd = f => fs.readFileSync(path.join(root, f), 'utf8');
let falhas = 0; const ok = (n, c) => { if (!c) { falhas++; console.log('FALHOU', n); } else console.log('OK    ', n); };
const esperar = ms => new Promise(r => setTimeout(r, ms));
const dig = s => String(s || '').replace(/\D/g, '');
const CPF1 = '52998224725', CPF2 = '11144477735';
const cpfOk = d => { if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false; for (let t = 9; t < 11; t++) { let s = 0; for (let i = 0; i < t; i++) s += d[i] * (t + 1 - i); if (((s * 10) % 11) % 10 != d[t]) return false; } return true; };
// Banco falso em memória que imita as regras do servidor (normalização, CPF válido e único, nome único sem CPF, tabela inexistente)
function banco(tab) {
  const T = tab, ops = [], logs = []; let prox = 1000;
  return { ops, logs, T, rpc: async (fn, args) => { logs.push({ fn, args }); return { data: null, error: null }; }, auth: { getUser: async () => ({ data: { user: { id: 'u1', email: 'a@b.c' } } }) },
    from(t) {
      const st = { op: 'select', f: [], p: null }, b = {
        select() { return b; }, order() { return b; }, limit() { return b; }, eq(c, v) { st.f.push([c, v]); return b; },
        insert(p) { st.op = 'insert'; st.p = p; return b; }, update(p) { st.op = 'update'; st.p = p; return b; }, delete() { st.op = 'delete'; return b; },
        then(res) {
          if (!T[t]) return res({ data: null, error: { code: '42P01', message: 'relation "' + t + '" does not exist' } });
          const rows = T[t], sel = () => rows.filter(r => st.f.every(([c, v]) => r[c] === v));
          if (st.op === 'select') return res({ data: sel().map(r => ({ ...r })), error: null });
          ops.push({ t, op: st.op, p: st.p, f: st.f.slice() });
          if (st.op === 'delete') { sel().forEach(r => rows.splice(rows.indexOf(r), 1)); return res({ data: null, error: null }); }
          const n = { ...st.p }; if ('nome' in n) n.nome = String(n.nome || '').replace(/\s+/g, ' ').trim(); if ('cpf' in n) n.cpf = dig(n.cpf) || null;
          if ('nome' in n && !n.nome) return res({ data: null, error: { code: '23514', message: 'nome do candidato obrigatório' } });
          if (n.cpf && !cpfOk(n.cpf)) return res({ data: null, error: { code: '23514', message: 'CPF inválido' } });
          const alvo = st.op === 'update' ? sel() : [];
          if (n.cpf && rows.some(r => r.cpf === n.cpf && !alvo.includes(r))) return res({ data: null, error: { code: '23505', message: 'Key (cpf)=(' + n.cpf + ') already exists. cr_candidatos_cpf_uk' } });
          if (!n.cpf && n.nome && st.op === 'insert' && rows.some(r => !r.cpf && String(r.nome).toLowerCase() === n.nome.toLowerCase())) return res({ data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint "cr_candidatos_nome_uk"' } });
          if (st.op === 'insert') rows.push({ id: ++prox, ...n }); else alvo.forEach(r => Object.assign(r, n));
          res({ data: null, error: null });
        } }; return b; } };
}
async function abrir(tab, opc) {
  const sbk = banco(tab), dom = new JSDOM(rd('candidatos.html'), { runScripts: 'dangerously', url: 'http://localhost/candidatos.html', beforeParse(w) { w.eval(rd('assets/cr-config.js')); w.confirm = () => (opc && opc.confirm !== undefined ? opc.confirm : true); } });
  const w = dom.window; w.eval(rd('assets/cr-utils.js')); w.HTMLElement.prototype.scrollIntoView = () => {}; w._sb = sbk; await esperar(400);
  return { w, D: w.document, sbk, txt: () => w.document.body.textContent, linhas: () => [...w.document.querySelectorAll('#emBody tr')].filter(tr => !tr.querySelector('.empty')).length };
}
const base = () => ({ cr_candidatos: [
  { id: 1, nome: 'Maria da Silva', cpf: CPF1, email: 'maria@x.com', curso: 'Administração', semestre: '4º semestre', instituicao: 'UNISINOS', matricula: '2023001' },
  { id: 2, nome: 'João Souza', cpf: null, email: null, curso: 'Direito', semestre: null, instituicao: 'Ulbra', matricula: null }], cr_contratos: [] });
const set = (t, id, v) => { const el = t.D.getElementById(id); el.value = v; el.dispatchEvent(new t.w.Event('input', { bubbles: true })); };
(async () => {
  let t = await abrir(base());
  ok('lista os 2 candidatos', t.linhas() === 2);
  ok('CPF aparece MASCARADO na lista e o completo não aparece', /\*\*\*\.982\.247-\*\*/.test(t.txt()) && !t.txt().includes('529.982.247-25') && !t.txt().includes(CPF1));
  set(t, 'busca', '982247'); ok('busca por dígitos do CPF', t.linhas() === 1);
  set(t, 'busca', 'direito'); ok('busca por curso', t.linhas() === 1);
  set(t, 'busca', 'zzz'); ok('sem resultado: mensagem vazia', t.linhas() === 0 && /Nenhum candidato nesta busca/.test(t.txt()));
  const tx = base(); tx.cr_candidatos.push({ id: 9, nome: '<img src=x onerror="window.__xss=1">Hack', cpf: null, email: '<b>x</b>' });
  t = await abrir(tx); ok('texto do banco é escapado', !t.D.querySelector('#emBody img') && !t.w.__xss);
  t = await abrir({ cr_contratos: [] }); ok('sem a tabela: manda rodar o SQL', /cr-schema\.sql/.test(t.txt()) && t.linhas() === 0);
  // novo
  t = await abrir(base()); t.w.abrirForm(); set(t, 'f_nome', '  Ana   Lima '); set(t, 'f_cpf', CPF2); set(t, 'f_email', 'ana@x.com'); await t.w.salvar(); await esperar(60);
  const ins = t.sbk.ops.find(o => o.op === 'insert');
  ok('cadastra: CPF só dígitos, campos vazios viram null', !!ins && ins.p.cpf === CPF2 && ins.p.curso === null && ins.p.matricula === null && /Candidato cadastrado/.test(t.txt()) && /Ana Lima/.test(t.txt()));
  ok('LOG: criou_candidato sem CPF, nome nem e-mail', t.sbk.logs.length >= 1 && t.sbk.logs.every(l => !JSON.stringify(l).match(/529|111\.?444|Ana|ana@|Maria/)));
  // validações
  t = await abrir(base()); t.w.abrirForm(); await t.w.salvar(); ok('sem nome: avisa e não grava', /nome do candidato é obrigatório/i.test(t.txt()) && !t.sbk.ops.length);
  set(t, 'f_nome', 'X'); set(t, 'f_cpf', '529.982.247-26'); await t.w.salvar(); ok('CPF inválido: avisa e não grava', /CPF inválido/.test(t.txt()) && !t.sbk.ops.length);
  set(t, 'f_cpf', ''); set(t, 'f_email', 'sem-arroba'); await t.w.salvar(); ok('e-mail inválido: avisa e não grava', /E-mail inválido/.test(t.txt()) && !t.sbk.ops.length);
  set(t, 'f_email', ''); set(t, 'f_cpf', CPF1); await t.w.salvar(); await esperar(30);
  ok('CPF repetido: mensagem amigável SEM repetir o CPF e formulário continua aberto', /Já existe um candidato cadastrado com este CPF/.test(t.txt()) && !t.txt().includes(CPF1) && t.D.getElementById('emFormCard').style.display !== 'none');
  // editar
  t = await abrir(base()); t.w.abrirForm(1);
  ok('editar mostra o CPF completo formatado', t.D.getElementById('f_cpf').value === '529.982.247-25' && /Editar candidato/.test(t.D.getElementById('emFormTitulo').textContent));
  set(t, 'f_curso', 'Contábeis'); await t.w.salvar(); await esperar(60);
  const up = t.sbk.ops.find(o => o.op === 'update');
  ok('atualiza só o candidato escolhido', up && up.f[0][1] === 1 && t.sbk.T.cr_candidatos.find(r => r.id === 1).curso === 'Contábeis');
  ok('LOG da edição só tem "id 1"', t.sbk.logs.length >= 1 && t.sbk.logs.every(l => !JSON.stringify(l).match(/529|Maria|maria@|Cont/)));
  // excluir
  t = await abrir(base(), { confirm: false }); await t.w.excluir(1); await esperar(30); ok('excluir com Cancelar: nada apagado', t.sbk.T.cr_candidatos.length === 2);
  t = await abrir(base()); await t.w.excluir(1); await esperar(30);
  ok('excluir confirmado: apaga só o candidato', t.sbk.T.cr_candidatos.length === 1 && t.sbk.ops.every(o => o.t === 'cr_candidatos'));
  ok('LOG da exclusão sem nome nem CPF', t.sbk.logs.every(l => !JSON.stringify(l).match(/529|Maria/)));
  // CSV
  t = await abrir(base()); let csv = ''; t.w.exportarCSV = (n, cols, linhas) => { csv = linhas.map(l => cols.map(c => c[1](l)).join(';')).join('\n'); };
  t.w.exportar(); ok('CSV só com CPF mascarado', /\*\*\*\.982\.247-\*\*/.test(csv) && !csv.includes(CPF1) && !csv.includes('529.982'));
  ok('menu e página', /assets\/cr-shell\.js/.test(rd('candidatos.html')) && /\['candidatos\.html', '🧑‍🎓', 'Candidatos'\]/.test(rd('assets/cr-shell.js')));
  // ---- Novo Contrato
  async function nc(tab) {
    const dom = new JSDOM(rd('novo-contrato.html'), { runScripts: 'dangerously', url: 'http://localhost/novo-contrato.html', beforeParse(w) { w.eval(rd('assets/cr-config.js')); } });
    const w = dom.window; w.eval(rd('assets/cr-utils.js')); w.HTMLElement.prototype.scrollIntoView = () => {}; const sbk = banco(tab); w._sb = sbk; await esperar(500); return { w, D: w.document, sbk };
  }
  const tn = base(); tn.cr_candidatos.push({ id: 3, nome: 'MARIA  da silva', cpf: CPF2, email: 'outra@x.com' }); tn.cr_contratos = [];
  let n = await nc(base());
  ok('Novo Contrato: datalist de candidatos (com CPF mascarado como rótulo)', [...n.D.querySelectorAll('#lista-candidatos option')].map(o => o.value).join('|') === 'Maria da Silva|João Souza' && n.D.getElementById('nome_candidato').getAttribute('list') === 'lista-candidatos' && n.D.querySelector('#lista-candidatos option').label === '***.982.247-**');
  const sv = (id, v) => { n.D.getElementById(id).value = v; };
  sv('nome_candidato', 'maria da silva'); sv('curso', 'Meu curso'); n.w.aplicarCandidatoCadastro();
  const g = id => n.D.getElementById(id).value;
  ok('escolher o candidato preenche SÓ os vazios (CPF formatado, e-mail, instituição, matrícula) e mantém o curso digitado', g('cpf') === '529.982.247-25' && g('email_candidato') === 'maria@x.com' && g('instituicao') === 'UNISINOS' && g('matricula') === '2023001' && g('curso') === 'Meu curso' && g('nome_candidato') === 'maria da silva');
  n = await nc(base()); sv('nome_candidato', 'Maria'); n.w.aplicarCandidatoCadastro(); ok('nome parcial: nada preenchido', g('cpf') === '' && g('email_candidato') === '');
  n = await nc(tn); sv('nome_candidato', 'Maria da Silva'); n.w.aplicarCandidatoCadastro();
  ok('homônimos: nada preenchido e avisa para digitar o CPF', g('cpf') === '' && /2 candidatos com esse nome/.test(n.D.body.textContent));
  n = await nc({ cr_contratos: [] }); sv('nome_candidato', 'Maria da Silva'); n.w.aplicarCandidatoCadastro(); ok('sem a tabela: não quebra e não preenche', g('cpf') === '');
  ok('o rascunho continua sem CPF', /RASCUNHO_CAMPOS_IGNORADOS = \['cpf'/.test(rd('assets/cr-utils.js')));
  console.log(falhas ? '\n' + falhas + ' FALHA(S)' : '\nTodos OK'); process.exit(falhas ? 1 : 0);
})().catch(e => { console.error('ERRO', e); process.exit(1); });
