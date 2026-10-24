// R31 (M7): telas — instituicoes.html (cadastro) e Novo Contrato sugerindo o nome (jsdom). Precisa: npm i jsdom. Rodar: node tests/cadastro-instituicoes-ui-test.js
const { JSDOM } = require('jsdom'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), rd = f => fs.readFileSync(path.join(root, f), 'utf8');
let falhas = 0; const ok = (n, c) => { if (!c) { falhas++; console.log('FALHOU', n); } else console.log('OK    ', n); };
const esperar = ms => new Promise(r => setTimeout(r, ms));
const dig = s => String(s || '').replace(/\D/g, '');
// Banco falso em memória que imita as regras do servidor (normalização, CNPJ único, nome único sem CNPJ, CNPJ inválido, tabela inexistente)
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
          const norm = x => { const o = { ...x }; if ('nome' in o) o.nome = String(o.nome || '').replace(/\s+/g, ' ').trim(); if ('cnpj' in o) o.cnpj = dig(o.cnpj) || null; return o; };
          const n = norm(st.p);
          if ('nome' in n && !n.nome) return res({ data: null, error: { code: '23514', message: 'nome da instituição obrigatório' } });
          if (n.cnpj && !cnpjOk(n.cnpj)) return res({ data: null, error: { code: '23514', message: 'CNPJ inválido' } });
          const alvo = st.op === 'update' ? sel() : [];
          if (n.cnpj && rows.some(r => r.cnpj === n.cnpj && !alvo.includes(r))) return res({ data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint "cr_instituicoes_cnpj_uk"' } });
          if (!n.cnpj && n.nome && st.op === 'insert' && rows.some(r => !r.cnpj && String(r.nome).toLowerCase() === n.nome.toLowerCase())) return res({ data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint "cr_instituicoes_nome_uk"' } });
          if (st.op === 'insert') rows.push({ id: ++prox, ativo: true, ...n }); else alvo.forEach(r => Object.assign(r, n));
          res({ data: null, error: null });
        } }; return b; } };
}
const C1 = '11222333000181', C2 = '45723174000110';   // CNPJs válidos
async function abrir(tab, opc) {
  const sbk = banco(tab), dom = new JSDOM(rd('instituicoes.html'), { runScripts: 'dangerously', url: 'http://localhost/instituicoes.html', beforeParse(w) { w.eval(rd('assets/cr-config.js')); w.confirm = () => (opc && opc.confirm !== undefined ? opc.confirm : true); } });
  const w = dom.window; w.eval(rd('assets/cr-utils.js')); w.HTMLElement.prototype.scrollIntoView = () => {}; w._sb = sbk; await esperar(400);
  return { w, D: w.document, sbk, txt: () => w.document.body.textContent, linhas: () => [...w.document.querySelectorAll('#emBody tr')].filter(tr => !tr.querySelector('.empty')).length };
}
const base = () => ({ cr_instituicoes: [
  { id: 1, nome: 'UNISINOS', cnpj: C1, endereco: 'Av. Unisinos, 950', ativo: true },
  { id: 2, nome: 'Ulbra', cnpj: null, endereco: null, ativo: true },
  { id: 3, nome: 'Faculdade Antiga', cnpj: null, endereco: null, ativo: false }], cr_contratos: [] });
const set = (t, id, v) => { const el = t.D.getElementById(id); el.value = v; el.dispatchEvent(new t.w.Event('input', { bubbles: true })); };
(async () => {
  // ---- listagem e filtros
  let t = await abrir(base());
  ok('lista só as ATIVAS por padrão', t.linhas() === 2 && /UNISINOS/.test(t.txt()) && !/Faculdade Antiga/.test(t.txt()));
  ok('CNPJ aparece formatado', /11\.222\.333\/0001-81/.test(t.txt()));
  t.D.getElementById('fStatus').value = 'inativas'; t.w.render(); ok('filtro Inativas', t.linhas() === 1 && /Faculdade Antiga/.test(t.txt()));
  t.D.getElementById('fStatus').value = 'todas'; t.w.render(); ok('filtro Todas', t.linhas() === 3);
  set(t, 'busca', '11.222.333'); ok('busca por CNPJ (com ou sem pontuação)', t.linhas() === 1);
  set(t, 'busca', 'ulb'); ok('busca por parte do nome', t.linhas() === 1);
  set(t, 'busca', 'zzz'); ok('sem resultado: mensagem de lista vazia', t.linhas() === 0 && /Nenhuma instituição nesta seleção/.test(t.txt()));
  // ---- XSS
  const tx = base(); tx.cr_instituicoes.push({ id: 9, nome: '<img src=x onerror="window.__xss=1">Hack', cnpj: null, endereco: '<b>x</b>', ativo: true });
  t = await abrir(tx);
  ok('texto vindo do banco é escapado (sem HTML injetado)', !t.D.querySelector('#emBody img') && !t.w.__xss && /<img src=x/.test(t.D.getElementById('emBody').textContent));
  // ---- tabela inexistente
  t = await abrir({ cr_contratos: [] });
  ok('sem a tabela: diz para rodar o SQL (aviso e na lista), sem quebrar', /cr-schema\.sql/.test(t.txt()) && t.linhas() === 0);
  // ---- salvar novo
  t = await abrir(base()); t.w.abrirForm(); set(t, 'f_nome', '  Nova   Faculdade '); set(t, 'f_cnpj', C2); await t.w.salvar(); await esperar(50);
  const ins = t.sbk.ops.find(o => o.op === 'insert');
  ok('cadastra: nome aparado, CNPJ só com dígitos e endereço vazio vira null', !!ins && ins.p.nome === 'Nova   Faculdade' && ins.p.cnpj === C2 && ins.p.endereco === null);
  ok('depois de salvar: aviso, formulário fecha e a lista recarrega com a nova', /Instituição cadastrada/.test(t.txt()) && t.D.getElementById('emFormCard').style.display === 'none' && /Nova Faculdade/.test(t.txt()));
  // ---- validações do navegador
  t = await abrir(base()); t.w.abrirForm(); await t.w.salvar();
  ok('sem nome: avisa e não grava', /nome da instituição é obrigatório/i.test(t.txt()) && !t.sbk.ops.length);
  set(t, 'f_nome', 'X'); set(t, 'f_cnpj', '11.222.333/0001-82'); await t.w.salvar();
  ok('CNPJ inválido: avisa no navegador e não grava', /CNPJ inválido/.test(t.txt()) && !t.sbk.ops.length);
  // ---- recusa do servidor
  set(t, 'f_cnpj', C1); await t.w.salvar(); await esperar(30);
  ok('CNPJ já cadastrado: mensagem amigável e formulário continua aberto (nada perdido)', /Já existe uma instituição cadastrada com este CNPJ/.test(t.txt()) && t.D.getElementById('emFormCard').style.display !== 'none' && t.D.getElementById('f_nome').value === 'X');
  t = await abrir(base()); t.w.abrirForm(); set(t, 'f_nome', 'ULBRA'); await t.w.salvar(); await esperar(30);
  ok('mesmo nome sem CNPJ: mensagem amigável', /Já existe uma instituição cadastrada com este nome/.test(t.txt()));
  // ---- editar
  t = await abrir(base()); t.w.abrirForm(1);
  ok('editar abre o formulário preenchido (CNPJ formatado)', t.D.getElementById('f_nome').value === 'UNISINOS' && t.D.getElementById('f_cnpj').value === '11.222.333/0001-81' && /Editar instituição/.test(t.D.getElementById('emFormTitulo').textContent));
  set(t, 'f_end', 'Av. Nova, 99'); await t.w.salvar(); await esperar(50);
  const up = t.sbk.ops.find(o => o.op === 'update');
  ok('atualiza só a instituição escolhida (eq id) e o endereço novo', up && up.f[0][0] === 'id' && up.f[0][1] === 1 && up.p.endereco === 'Av. Nova, 99' && t.sbk.T.cr_instituicoes.find(r => r.id === 1).endereco === 'Av. Nova, 99');
  // ---- desativar / reativar
  await t.w.alternarAtivo(1); await esperar(30);
  ok('desativar grava ativo=false e some da lista de ativas', t.sbk.T.cr_instituicoes.find(r => r.id === 1).ativo === false && !/UNISINOS/.test(t.D.getElementById('emBody').textContent));
  await t.w.alternarAtivo(3); await esperar(30);
  ok('reativar grava ativo=true', t.sbk.T.cr_instituicoes.find(r => r.id === 3).ativo === true);
  // ---- excluir
  t = await abrir(base(), { confirm: false }); await t.w.excluir(1); await esperar(30);
  ok('excluir com "Cancelar": nada é apagado', t.sbk.T.cr_instituicoes.length === 3 && !t.sbk.ops.some(o => o.op === 'delete'));
  t = await abrir(base()); await t.w.excluir(1); await esperar(30);
  ok('excluir confirmado: apaga SÓ a instituição, não toca em contratos', t.sbk.T.cr_instituicoes.length === 2 && !t.sbk.T.cr_instituicoes.some(r => r.id === 1) && t.sbk.ops.every(o => o.t === 'cr_instituicoes'));
  // ---- importar dos contratos
  const ti = base(); ti.cr_contratos = [
    { instituicao: 'unisinos', criado_em: '2026-01-01' }, { instituicao: 'Feevale', criado_em: '2026-02-01' }, { instituicao: 'Nova  Faculdade', criado_em: '2026-03-01' },
    { instituicao: 'faculdade antiga', criado_em: '2026-04-01' }, { instituicao: null, criado_em: '2026-05-01' }];
  t = await abrir(ti); await t.w.importar(); await esperar(80);
  const novos = t.sbk.T.cr_instituicoes.filter(r => r.id > 1000);
  ok('importa só quem não está no cadastro (nem ativa nem inativa): Feevale e Nova Faculdade', novos.map(r => r.nome).sort().join('|') === 'Feevale|Nova Faculdade');
  ok('entram só com o nome (sem CNPJ e endereço)', novos.every(r => r.cnpj === null && r.endereco === null));
  t = await abrir(ti); await t.w.importar(); await esperar(50); t.sbk.ops.length = 0; await t.w.importar(); await esperar(50);
  ok('importar de novo: nada a importar (não duplica)', /Nada a importar/.test(t.txt()) && !t.sbk.ops.length);
  t = await abrir(base(), { confirm: false }); t.sbk.T.cr_contratos.push({ instituicao: 'Nova', criado_em: '2026-01-01' }); await t.w.importar(); await esperar(50);
  ok('importar com "Cancelar": não grava nada', !t.sbk.ops.length);
  // ---- buscar CNPJ (só vazios)
  t = await abrir(base()); t.w.fetch = async () => ({ status: 200, ok: true, json: async () => ({ razao_social: 'NOME DA RECEITA', logradouro: 'DAS FLORES', numero: '10', municipio: 'SAO LEOPOLDO', uf: 'RS', descricao_situacao_cadastral: 'ATIVA' }) });
  t.w.abrirForm(); set(t, 'f_nome', 'Meu nome'); set(t, 'f_cnpj', C2); await t.w.buscarPorCNPJ();
  ok('Buscar CNPJ não troca o que foi digitado e preenche o vazio', t.D.getElementById('f_nome').value === 'Meu nome' && /DAS FLORES, 10/.test(t.D.getElementById('f_end').value));
  // ---- menu
  ok('a página usa o menu único e a entrada Instituições existe', /assets\/cr-shell\.js/.test(rd('instituicoes.html')) && /\['instituicoes\.html', '🎓', 'Instituições'\]/.test(rd('assets/cr-shell.js')));
  // ---- Novo Contrato sugere o nome
  const tn = { cr_instituicoes: [
    { nome: 'UNISINOS', cnpj: C1, endereco: 'Av. Unisinos, 950', ativo: true },
    { nome: 'Faculdade Antiga', cnpj: null, endereco: null, ativo: false }],
    cr_contratos: [{ instituicao: 'unisinos', criado_em: '2026-09-01' }, { instituicao: 'Faculdade Antiga', criado_em: '2026-08-01' }, { instituicao: 'Só Contrato', criado_em: '2026-07-01' }, { instituicao: null, criado_em: '2026-06-01' }] };
  const dom = new JSDOM(rd('novo-contrato.html'), { runScripts: 'dangerously', url: 'http://localhost/novo-contrato.html', beforeParse(w) { w.eval(rd('assets/cr-config.js')); } });
  const w = dom.window; w.eval(rd('assets/cr-utils.js')); w.HTMLElement.prototype.scrollIntoView = () => {}; w._sb = banco(tn); await esperar(500);
  const opts = [...w.document.querySelectorAll('#lista-instituicoes option')].map(o => o.value);
  ok('Novo Contrato sugere: cadastro ativo + contratos que não estão no cadastro; inativa e repetida somem', opts.join('|') === 'UNISINOS|Só Contrato');
  ok('o campo Instituição está ligado à lista de sugestões', w.document.getElementById('instituicao').getAttribute('list') === 'lista-instituicoes');
  // sem a tabela (SQL ainda não rodado): continua com os contratos
  const dom2 = new JSDOM(rd('novo-contrato.html'), { runScripts: 'dangerously', url: 'http://localhost/novo-contrato.html', beforeParse(w2) { w2.eval(rd('assets/cr-config.js')); } });
  const w2 = dom2.window; w2.eval(rd('assets/cr-utils.js')); w2.HTMLElement.prototype.scrollIntoView = () => {}; w2._sb = banco({ cr_contratos: tn.cr_contratos }); await esperar(500);
  ok('sem a tabela cr_instituicoes: o Novo Contrato continua sugerindo as instituições dos contratos', [...w2.document.querySelectorAll('#lista-instituicoes option')].map(o => o.value).sort().join('|') === 'Faculdade Antiga|Só Contrato|unisinos');
  console.log(falhas ? '\n' + falhas + ' FALHA(S)' : '\nTodos OK'); process.exit(falhas ? 1 : 0);
})().catch(e => { console.error('ERRO', e); process.exit(1); });
