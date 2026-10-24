// R30 (M7): telas — empresas.html (cadastro) e Novo Contrato lendo o cadastro (jsdom). Precisa: npm i jsdom. Rodar: node tests/cadastro-empresas-ui-test.js
const { JSDOM } = require('jsdom'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), rd = f => fs.readFileSync(path.join(root, f), 'utf8');
let falhas = 0; const ok = (n, c) => { if (!c) { falhas++; console.log('FALHOU', n); } else console.log('OK    ', n); };
const esperar = ms => new Promise(r => setTimeout(r, ms));
const dig = s => String(s || '').replace(/\D/g, '');
// Banco falso em memória que imita as regras do servidor (normalização, CNPJ único, CNPJ inválido, tabela inexistente)
function banco(tab) {
  const T = tab, ops = []; let prox = 1000;
  const cnpjOk = d => { if (d.length !== 14 || /^(\d)\1+$/.test(d)) return false; const dv = n => { const w = n === 12 ? [5,4,3,2,9,8,7,6,5,4,3,2] : [6,5,4,3,2,9,8,7,6,5,4,3,2]; const s = w.reduce((a, x, i) => a + x * Number(d[i]), 0) % 11; return s < 2 ? 0 : 11 - s; }; return dv(12) === Number(d[12]) && dv(13) === Number(d[13]); };
  return { ops, T, rpc: async () => ({ data: null, error: null }), auth: { getUser: async () => ({ data: { user: { id: 'u1', email: 'a@b.c' } } }) },
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
          const norm = x => { const o = { ...x }; if ('razao_social' in o) o.razao_social = String(o.razao_social || '').replace(/\s+/g, ' ').trim(); if ('cnpj' in o) o.cnpj = dig(o.cnpj) || null; return o; };
          const n = norm(st.p);
          if ('razao_social' in n && !n.razao_social) return res({ data: null, error: { code: '23514', message: 'razão social obrigatória' } });
          if (n.cnpj && !cnpjOk(n.cnpj)) return res({ data: null, error: { code: '23514', message: 'CNPJ inválido' } });
          const alvo = st.op === 'update' ? sel() : [];
          if (n.cnpj && rows.some(r => r.cnpj === n.cnpj && !alvo.includes(r))) return res({ data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint "cr_empresas_cnpj_uk"' } });
          if (st.op === 'insert') rows.push({ id: ++prox, ativo: true, ...n }); else alvo.forEach(r => Object.assign(r, n));
          res({ data: null, error: null });
        } }; return b; } };
}
const C1 = '11222333000181', C2 = '45723174000110';   // CNPJs válidos
async function abrirEmpresas(tab, opc) {
  const sbk = banco(tab), dom = new JSDOM(rd('empresas.html'), { runScripts: 'dangerously', url: 'http://localhost/empresas.html', beforeParse(w) { w.eval(rd('assets/cr-config.js')); w.confirm = () => (opc && opc.confirm !== undefined ? opc.confirm : true); } });
  const w = dom.window; w.eval(rd('assets/cr-utils.js')); w.HTMLElement.prototype.scrollIntoView = () => {}; w._sb = sbk; await esperar(400);
  return { w, D: w.document, sbk, txt: () => w.document.body.textContent, linhas: () => [...w.document.querySelectorAll('#emBody tr')].filter(tr => !tr.querySelector('.empty')).length };
}
const base = () => ({ cr_empresas: [
  { id: 1, razao_social: 'Acme Ltda', cnpj: C1, endereco: 'Rua A, 1', supervisor_nome: 'João', supervisor_cargo: 'Gerente', ativo: true },
  { id: 2, razao_social: 'Beta SA', cnpj: null, endereco: null, supervisor_nome: null, supervisor_cargo: null, ativo: true },
  { id: 3, razao_social: 'Velha Ltda', cnpj: null, endereco: null, supervisor_nome: null, supervisor_cargo: null, ativo: false }], cr_contratos: [] });
const set = (t, id, v) => { const el = t.D.getElementById(id); el.value = v; el.dispatchEvent(new t.w.Event('input', { bubbles: true })); };
(async () => {
  // ---- listagem e filtros
  let t = await abrirEmpresas(base());
  ok('lista só as ATIVAS por padrão', t.linhas() === 2 && /Acme Ltda/.test(t.txt()) && !/Velha Ltda/.test(t.txt()));
  ok('CNPJ aparece formatado', /11\.222\.333\/0001-81/.test(t.txt()));
  t.D.getElementById('fStatus').value = 'inativas'; t.w.render(); ok('filtro Inativas', t.linhas() === 1 && /Velha Ltda/.test(t.txt()));
  t.D.getElementById('fStatus').value = 'todas'; t.w.render(); ok('filtro Todas', t.linhas() === 3);
  set(t, 'busca', '11.222.333'); ok('busca por CNPJ (com ou sem pontuação)', t.linhas() === 1);
  set(t, 'busca', 'joão'); ok('busca pelo supervisor', t.linhas() === 1);
  set(t, 'busca', 'zzz'); ok('sem resultado: mensagem de lista vazia', t.linhas() === 0 && /Nenhuma empresa nesta seleção/.test(t.txt()));
  // ---- XSS
  const tx = base(); tx.cr_empresas.push({ id: 9, razao_social: '<img src=x onerror="window.__xss=1">Hack', cnpj: null, endereco: '<b>x</b>', supervisor_nome: null, supervisor_cargo: null, ativo: true });
  t = await abrirEmpresas(tx);
  ok('texto vindo do banco é escapado (sem HTML injetado)', !t.D.querySelector('#emBody img') && !t.w.__xss && /<img src=x/.test(t.D.getElementById('emBody').textContent));
  // ---- tabela inexistente
  t = await abrirEmpresas({ cr_contratos: [] });
  ok('sem a tabela: diz para rodar o SQL (aviso e na lista), sem quebrar', /cr-schema\.sql/.test(t.txt()) && t.linhas() === 0);
  // ---- salvar novo
  t = await abrirEmpresas(base()); t.w.abrirForm(); set(t, 'f_razao', '  Nova   Empresa SA '); set(t, 'f_cnpj', C2); set(t, 'f_sup', 'Maria'); await t.w.salvar(); await esperar(50);
  const ins = t.sbk.ops.find(o => o.op === 'insert');
  ok('cadastra: CNPJ vai só com dígitos e campos vazios viram null', ins && ins.p.cnpj === C2 && ins.p.endereco === null && ins.p.supervisor_cargo === null && ins.p.supervisor_nome === 'Maria');
  ok('depois de salvar: aviso, formulário fecha e a lista recarrega com a nova', /Empresa cadastrada/.test(t.txt()) && t.D.getElementById('emFormCard').style.display === 'none' && /Nova Empresa SA/.test(t.txt()));
  // ---- validações do navegador (não chega ao servidor)
  t = await abrirEmpresas(base()); t.w.abrirForm(); await t.w.salvar();
  ok('sem razão social: avisa e não grava', /razão social é obrigatória/i.test(t.txt()) && !t.sbk.ops.length);
  set(t, 'f_razao', 'X'); set(t, 'f_cnpj', '11.222.333/0001-82'); await t.w.salvar();
  ok('CNPJ inválido: avisa no navegador e não grava', /CNPJ inválido/.test(t.txt()) && !t.sbk.ops.length);
  // ---- recusa do servidor
  set(t, 'f_cnpj', C1); await t.w.salvar(); await esperar(30);
  ok('CNPJ já cadastrado: mensagem amigável e formulário continua aberto (nada perdido)', /Já existe uma empresa cadastrada com este CNPJ/.test(t.txt()) && t.D.getElementById('emFormCard').style.display !== 'none' && t.D.getElementById('f_razao').value === 'X');
  // ---- editar
  t = await abrirEmpresas(base()); t.w.abrirForm(1);
  ok('editar abre o formulário preenchido (CNPJ formatado)', t.D.getElementById('f_razao').value === 'Acme Ltda' && t.D.getElementById('f_cnpj').value === '11.222.333/0001-81' && /Editar empresa/.test(t.D.getElementById('emFormTitulo').textContent));
  set(t, 'f_end', 'Av. Nova, 99'); await t.w.salvar(); await esperar(50);
  const up = t.sbk.ops.find(o => o.op === 'update');
  ok('atualiza só a empresa escolhida (eq id) e o endereço novo', up && up.f[0][0] === 'id' && up.f[0][1] === 1 && up.p.endereco === 'Av. Nova, 99' && t.sbk.T.cr_empresas.find(r => r.id === 1).endereco === 'Av. Nova, 99');
  // ---- desativar / reativar
  await t.w.alternarAtivo(1); await esperar(30);
  ok('desativar grava ativo=false e some da lista de ativas', t.sbk.T.cr_empresas.find(r => r.id === 1).ativo === false && !/Acme Ltda/.test(t.D.getElementById('emBody').textContent));
  await t.w.alternarAtivo(3); await esperar(30);
  ok('reativar grava ativo=true', t.sbk.T.cr_empresas.find(r => r.id === 3).ativo === true);
  // ---- excluir
  t = await abrirEmpresas(base(), { confirm: false }); await t.w.excluir(1); await esperar(30);
  ok('excluir com "Cancelar": nada é apagado', t.sbk.T.cr_empresas.length === 3 && !t.sbk.ops.some(o => o.op === 'delete'));
  t = await abrirEmpresas(base()); await t.w.excluir(1); await esperar(30);
  ok('excluir confirmado: apaga SÓ a empresa, não toca em contratos', t.sbk.T.cr_empresas.length === 2 && !t.sbk.T.cr_empresas.some(r => r.id === 1) && t.sbk.ops.every(o => o.t === 'cr_empresas'));
  // ---- importar dos contratos
  const ti = base(); ti.cr_contratos = [
    { empresa: 'ACME LTDA', cnpj_empresa: '11.222.333/0001-81', endereco_emp: 'x', criado_em: '2026-01-01' },
    { empresa: 'Delta SA', cnpj_empresa: '45.723.174/0001-10', endereco_emp: 'Rua D', supervisor_nome: 'Ana', criado_em: '2026-02-01' },
    { empresa: 'Lixo Ltda', cnpj_empresa: '11.222.333/0001-82', endereco_emp: 'Rua L', criado_em: '2026-03-01' },
    { empresa: 'Beta SA', cnpj_empresa: '', criado_em: '2026-04-01' }, { empresa: 'Velha Ltda', cnpj_empresa: '', criado_em: '2026-05-01' }];
  t = await abrirEmpresas(ti); await t.w.importar(); await esperar(80);
  const novos = t.sbk.T.cr_empresas.filter(r => r.id > 1000);
  ok('importa só quem não está no cadastro (nem ativo nem inativo): Delta e Lixo', novos.map(r => r.razao_social).sort().join('|') === 'Delta SA|Lixo Ltda');
  ok('CNPJ inválido de contrato antigo não barra a importação (entra sem CNPJ) e o aviso diz isso', novos.find(r => r.razao_social === 'Lixo Ltda').cnpj === null && /1 sem CNPJ válido/.test(t.txt()));
  ok('traz endereço e supervisor do contrato', novos.find(r => r.razao_social === 'Delta SA').supervisor_nome === 'Ana' && novos.find(r => r.razao_social === 'Delta SA').endereco === 'Rua D');
  t = await abrirEmpresas(ti); await t.w.importar(); await esperar(50); t.sbk.ops.length = 0; await t.w.importar(); await esperar(50);
  ok('importar de novo: nada a importar (não duplica)', /Nada a importar/.test(t.txt()) && !t.sbk.ops.length);
  t = await abrirEmpresas(base(), { confirm: false }); t.sbk.T.cr_contratos.push({ empresa: 'Nova', criado_em: '2026-01-01' }); await t.w.importar(); await esperar(50);
  ok('importar com "Cancelar": não grava nada', !t.sbk.ops.length);
  // ---- buscar CNPJ (só vazios)
  t = await abrirEmpresas(base()); t.w.fetch = async () => ({ status: 200, ok: true, json: async () => ({ razao_social: 'RAZAO DA RECEITA', logradouro: 'DAS FLORES', numero: '10', municipio: 'GUAIBA', uf: 'RS', descricao_situacao_cadastral: 'ATIVA' }) });
  t.w.abrirForm(); set(t, 'f_razao', 'Meu nome'); set(t, 'f_cnpj', C2); await t.w.buscarPorCNPJ();
  ok('Buscar CNPJ não troca o que foi digitado e preenche o vazio', t.D.getElementById('f_razao').value === 'Meu nome' && /DAS FLORES, 10/.test(t.D.getElementById('f_end').value));
  // ---- menu
  ok('a página usa o menu único e a entrada Empresas existe', /assets\/cr-shell\.js/.test(rd('empresas.html')) && /\['empresas\.html', '🏢', 'Empresas'\]/.test(rd('assets/cr-shell.js')));
  // ---- Novo Contrato lê o cadastro
  const tn = { cr_empresas: [
    { razao_social: 'Acme Ltda', cnpj: C1, endereco: 'Rua do CADASTRO', supervisor_nome: 'Sup Cadastro', supervisor_cargo: 'Chefe', ativo: true },
    { razao_social: 'Velha Ltda', cnpj: null, endereco: null, supervisor_nome: null, supervisor_cargo: null, ativo: false }],
    cr_contratos: [{ empresa: 'ACME LTDA', cnpj_empresa: '11.222.333/0001-81', endereco_emp: 'Rua do CONTRATO', supervisor_nome: 'Sup Contrato', criado_em: '2026-09-01' },
      { empresa: 'Velha Ltda', cnpj_empresa: '', criado_em: '2026-08-01' }, { empresa: 'Só Contrato SA', cnpj_empresa: '', endereco_emp: 'Rua S', criado_em: '2026-07-01' }] };
  const dom = new JSDOM(rd('novo-contrato.html'), { runScripts: 'dangerously', url: 'http://localhost/novo-contrato.html', beforeParse(w) { w.eval(rd('assets/cr-config.js')); } });
  const w = dom.window; w.eval(rd('assets/cr-utils.js')); w.HTMLElement.prototype.scrollIntoView = () => {}; w._sb = banco(tn); await esperar(500);
  const opts = [...w.document.querySelectorAll('#lista-empresas option')].map(o => o.value);
  ok('Novo Contrato sugere: cadastro ativo + contratos que não estão no cadastro; inativa e repetida somem', opts.join('|') === 'Acme Ltda|Só Contrato SA');
  const v = id => w.document.getElementById(id);
  v('empresa').value = 'Acme Ltda'; v('empresa').dispatchEvent(new w.Event('change', { bubbles: true }));
  ok('ao escolher, vale o dado do CADASTRO (não o do contrato antigo)', v('endereco_emp').value === 'Rua do CADASTRO' && v('supervisor_nome').value === 'Sup Cadastro' && v('supervisor_cargo').value === 'Chefe' && dig(v('cnpj_empresa').value) === C1);
  // sem a tabela (SQL ainda não rodado): continua com os contratos
  const dom2 = new JSDOM(rd('novo-contrato.html'), { runScripts: 'dangerously', url: 'http://localhost/novo-contrato.html', beforeParse(w2) { w2.eval(rd('assets/cr-config.js')); } });
  const w2 = dom2.window; w2.eval(rd('assets/cr-utils.js')); w2.HTMLElement.prototype.scrollIntoView = () => {}; w2._sb = banco({ cr_contratos: tn.cr_contratos }); await esperar(500);
  ok('sem a tabela cr_empresas: o Novo Contrato continua sugerindo as empresas dos contratos', [...w2.document.querySelectorAll('#lista-empresas option')].map(o => o.value).sort().join('|') === 'ACME LTDA|Só Contrato SA|Velha Ltda');
  console.log(falhas ? '\n' + falhas + ' FALHA(S)' : '\nTodos OK'); process.exit(falhas ? 1 : 0);
})().catch(e => { console.error('ERRO', e); process.exit(1); });
