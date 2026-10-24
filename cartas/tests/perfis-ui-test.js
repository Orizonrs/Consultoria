// R33 (M5): telas com perfis (jsdom). Precisa: npm i jsdom. Rodar: node tests/perfis-ui-test.js
const { JSDOM } = require('jsdom'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), rd = f => fs.readFileSync(path.join(root, f), 'utf8');
let falhas = 0; const ok = (n, c) => { if (!c) { falhas++; console.log('FALHOU', n); } else console.log('OK    ', n); };
const esperar = ms => new Promise(r => setTimeout(r, ms));
// cliente falso: registra operações; rpc('cr_meu_perfil') devolve o perfil pedido; cr_definir_perfil pode devolver erro
function fake(tab, perfil, erroDefinir) {
  const ops = [], rpcs = []; let consultouLog = false;
  return { ops, rpcs, get consultouLog() { return consultouLog; },
    rpc: async (fn, args) => { rpcs.push({ fn, args }); if (fn === 'cr_meu_perfil') return perfil === 'erro' ? { data: null, error: { code: '42883' } } : { data: perfil, error: null }; if (fn === 'cr_definir_perfil') return { data: null, error: erroDefinir || null }; return { data: null, error: null }; },
    auth: { getUser: async () => ({ data: { user: { id: 'u1', email: 'a@b.c' } } }) },
    from(t) { const st = { op: 'select', f: [] }, b = {
      select() { return b; }, order() { return b; }, limit() { return b; }, eq(c, v) { st.f.push([c, v]); return b; },
      insert() { st.op = 'insert'; return b; }, update() { st.op = 'update'; return b; }, delete() { st.op = 'delete'; return b; }, upsert() { st.op = 'upsert'; return b; },
      then(res) {
        if (t === 'cr_log') consultouLog = true;
        if (st.op !== 'select') { ops.push({ t, op: st.op }); if (st.op === 'delete') { const r = tab[t] || []; const i = r.findIndex(x => st.f.every(([c, v]) => x[c] === v)); if (i >= 0) r.splice(i, 1); } return res({ data: null, error: null }); }
        if (!tab[t]) return res({ data: null, error: { code: '42P01', message: 'x' } });
        return res({ data: tab[t].map(r => ({ ...r })), error: null }); } }; return b; } };
}
async function abrir(pag, tab, perfil, extra) {
  const sbk = fake(tab, perfil, extra && extra.erro), dom = new JSDOM(rd(pag), { runScripts: 'dangerously', url: 'http://localhost/' + pag, beforeParse(w) { w.eval(rd('assets/cr-config.js')); w.confirm = () => true; w.HTMLCanvasElement.prototype.getContext = () => new Proxy({}, { get: (o, k) => (k in o ? o[k] : () => {}), set: (o, k, v) => { o[k] = v; return true; } }); } });
  const w = dom.window; w.eval(rd('assets/cr-utils.js')); w.HTMLElement.prototype.scrollIntoView = () => {}; w._sb = sbk; await esperar(450);
  return { w, D: w.document, sbk, txt: () => w.document.body.textContent };
}
const dados = () => ({ cr_candidatos: [{ id: 1, nome: 'Maria da Silva', cpf: '52998224725' }], cr_empresas: [{ id: 1, razao_social: 'Acme Ltda', ativo: true }], cr_instituicoes: [{ id: 1, nome: 'UNISINOS', ativo: true }], cr_contratos: [], cr_config: [], cr_log: [{ id: 1, acao: 'login', usuario_email: 'a@b.c', criado_em: '2026-10-01T10:00:00Z' }], cr_perfis: [{ email: 'a@b.c', perfil: 'admin' }] });
(async () => {
  for (const [pag, fn, tabela, lista] of [['candidatos.html', 'excluir(1)', 'cr_candidatos'], ['empresas.html', 'excluir(1)', 'cr_empresas'], ['instituicoes.html', 'excluir(1)', 'cr_instituicoes']]) {
    let t = await abrir(pag, dados(), 'operador'); await t.w.eval(fn); await esperar(60);
    ok(pag + ': OPERADOR não exclui (nenhuma operação de delete) e vê o aviso', !t.sbk.ops.some(o => o.op === 'delete') && /Somente administradores podem excluir cadastros/.test(t.txt()));
    t = await abrir(pag, dados(), 'admin'); await t.w.eval(fn); await esperar(60);
    ok(pag + ': ADMIN exclui', t.sbk.ops.some(o => o.op === 'delete' && o.t === tabela));
    t = await abrir(pag, dados(), 'erro'); await t.w.eval(fn); await esperar(60);
    ok(pag + ': sem a função de perfil (SQL antigo) a tela não bloqueia (o servidor decide)', t.sbk.ops.some(o => o.op === 'delete'));
  }
  let t = await abrir('candidatos.html', dados(), 'operador');
  ok('operador continua vendo a lista e podendo editar (CPF visível ao editar, como decidido)', t.D.querySelectorAll('#emBody tr').length === 1); t.w.abrirForm(1);
  ok('editar mostra o CPF completo ao operador', t.D.getElementById('f_cpf').value === '529.982.247-25');
  // configurações
  t = await abrir('configuracoes.html', dados(), 'operador');
  ok('config: operador vê "Seu perfil: operador" e NÃO vê o formulário de perfis', /Seu perfil: operador/.test(t.txt()) && t.D.getElementById('perfilAdmin').style.display === 'none');
  const r1 = await t.w.salvarChave('x', { a: 1 });
  ok('config: operador não grava configuração', r1 === false && !t.sbk.ops.some(o => o.op === 'upsert') && /Somente administradores podem alterar as configurações/.test(t.txt()));
  t = await abrir('configuracoes.html', dados(), 'admin');
  ok('config: admin vê o formulário e a lista de perfis', /Seu perfil: administrador/.test(t.txt()) && t.D.getElementById('perfilAdmin').style.display !== 'none' && /a@b\.c — administrador/.test(t.D.getElementById('perfilLista').textContent));
  const r2 = await t.w.salvarChave('x', { a: 1 }); ok('config: admin grava', r2 === true && t.sbk.ops.some(o => o.op === 'upsert'));
  t.D.getElementById('perfil_email').value = 'novo@x.com'; t.D.getElementById('perfil_tipo').value = 'admin'; await t.w.definirPerfil(); await esperar(60);
  const dp = t.sbk.rpcs.find(x => x.fn === 'cr_definir_perfil');
  ok('definir perfil chama a função do servidor com e-mail e perfil', dp && dp.args.p_email === 'novo@x.com' && dp.args.p_perfil === 'admin' && /Perfil definido/.test(t.txt()));
  t.D.getElementById('perfil_email').value = 'sem-arroba'; t.sbk.rpcs.length = 0; await t.w.definirPerfil();
  ok('e-mail inválido: avisa e não chama o servidor', !t.sbk.rpcs.some(x => x.fn === 'cr_definir_perfil') && /Informe o e-mail/.test(t.txt()));
  t = await abrir('configuracoes.html', dados(), 'admin', { erro: { code: '23514', message: 'último' } });
  t.D.getElementById('perfil_email').value = 'a@b.c'; t.D.getElementById('perfil_tipo').value = 'admin'; await t.w.definirPerfil(); await esperar(60);
  ok('erro do servidor (último admin) vira mensagem amigável na tela', /Não é possível remover o último administrador/.test(t.txt()));
  ok('erroPerfil traduz os códigos do banco', /último administrador/.test(t.w.erroPerfil({ code: '23514' })) && /Somente administradores/.test(t.w.erroPerfil({ code: '42501' })) && /não encontrado/.test(t.w.erroPerfil({ code: '22023' })) && /R33/.test(t.w.erroPerfil({ code: '42883' })) );
  // histórico
  t = await abrir('historico.html', dados(), 'operador');
  ok('histórico: operador não consulta cr_log e vê o aviso', !t.sbk.consultouLog && /Somente administradores podem ver o histórico/.test(t.txt()));
  t = await abrir('historico.html', dados(), 'admin'); ok('histórico: admin consulta e vê a lista', t.sbk.consultouLog && /login/.test(t.txt()));
  ok('histórico rotula "definiu_perfil"', /definiu_perfil: '👥/.test(rd('historico.html')));
  console.log(falhas ? '\n' + falhas + ' FALHA(S)' : '\nTodos OK'); process.exit(falhas ? 1 : 0);
})().catch(e => { console.error('ERRO', e); process.exit(1); });
