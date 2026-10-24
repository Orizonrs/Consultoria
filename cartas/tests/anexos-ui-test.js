// R36 (M16): tela anexos.html em jsdom, com banco falso que imita as regras do servidor. Precisa: npm i jsdom. Rodar: node tests/anexos-ui-test.js
const { JSDOM } = require('jsdom'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), rd = f => fs.readFileSync(path.join(root, f), 'utf8');
let falhas = 0; const ok = (n, c) => { if (!c) { falhas++; console.log('FALHOU', n); } else console.log('OK    ', n); };
const esperar = ms => new Promise(r => setTimeout(r, ms));
function fake(perfil, o = {}) {
  const rpcs = []; let seq = 10;
  let lista = (o.lista || [{ id: 1, contrato_id: 7, categoria: 'documento_pessoal', nome: '<img src=x onerror=alert(1)>.pdf', tipo: 'pdf', tamanho: 1500, hash_sha256: 'abcdef0123456789ff', criado_em: '2026-10-20T10:00:00Z' }]).slice();
  return { rpcs, get lista() { return lista; },
    auth: { getUser: async () => ({ data: { user: { email: 'a@b.c' } } }) },
    rpc: async (fn, a) => {
      rpcs.push({ fn, a });
      if (fn === 'cr_meu_perfil') return { data: perfil, error: null };
      if (fn === 'cr_anexo_adicionar') {
        if (o.erroAdd) return { data: { erro: o.erroAdd }, error: null };
        lista.unshift({ id: ++seq, contrato_id: a.p_contrato, categoria: a.p_categoria, nome: a.p_nome, tipo: 'pdf', tamanho: 4, hash_sha256: 'h'.repeat(64), criado_em: '2026-10-23T10:00:00Z' });
        return { data: { ok: true }, error: null };
      }
      if (fn === 'cr_anexo_baixar') return { data: { nome: 'rg.pdf', tipo: 'pdf', base64: 'JVBERg==' }, error: null };
      if (fn === 'cr_anexo_excluir') {
        if (perfil === 'operador') return { data: null, error: { code: '42501' } };
        lista = lista.filter(x => x.id !== a.p_id); return { data: { ok: true }, error: null };
      }
      return { data: null, error: null };
    },
    from(t) {
      const b = { select() { return b; }, order() { return b; }, eq() { return b; }, single() { return b; },
        then(res) {
          if (t === 'cr_contratos') return res(o.contrato === null ? { data: null, error: { code: 'PGRST116' } } : { data: o.contrato || { id: 7, numero_contrato: 'TCE-2026-0007', titulo: 'T' }, error: null });
          if (t === 'cr_anexos') return res(o.semTabela ? { data: null, error: { code: 'PGRST205' } } : { data: lista.slice(), error: null });
          return res({ data: [], error: null });
        } };
      return b;
    } };
}
async function abrir(perfil, o = {}, query = '?id=7') {
  const sb = fake(perfil, o), dom = new JSDOM(rd('anexos.html'), { runScripts: 'dangerously', url: 'http://localhost/anexos.html' + query,
    beforeParse(w) {
      w.eval(rd('assets/cr-config.js')); w.eval(rd('assets/cr-utils.js'));
      w.confirm = () => (o.confirm !== undefined ? o.confirm : true);
      w.__confirmou = 0; const c0 = w.confirm; w.confirm = m => { w.__confirmou++; return c0(m); };
      w.__baixados = []; w.URL.createObjectURL = () => 'blob:x'; w.URL.revokeObjectURL = () => {};
      w.HTMLAnchorElement.prototype.click = function () { w.__baixados.push(this.download); };
    } });
  const w = dom.window; w._sb = sb; await esperar(400);
  const D = w.document;
  return { w, D, sb, id: i => D.getElementById(i), txt: () => D.body.textContent,
    escolher(nome, tam, tipo) { const f = new w.File([new Uint8Array(tam || 4)], nome, { type: tipo || '' }); Object.defineProperty(D.getElementById('axArq'), 'files', { value: [f], configurable: true }); },
    nLinhas: () => [...D.querySelectorAll('#axLista tr')].filter(tr => !tr.querySelector('.empty')).length };
}
(async () => {
  let t = await abrir('admin');
  ok('mostra o número do contrato e a lista (1 de 10)', t.id('axNumero').textContent === 'TCE-2026-0007' && /1 de 10/.test(t.id('axContagem').textContent) && t.nLinhas() === 1);
  ok('nome do arquivo com HTML aparece como TEXTO (sem <img> real)', !t.D.querySelector('#axLista img') && t.id('axLista').textContent.includes('<img src=x'));
  ok('mostra tipo, tamanho e começo do hash', /PDF/.test(t.id('axLista').textContent) && /1\.?,?5 KB|1,5 KB/.test(t.id('axLista').textContent) && t.id('axLista').textContent.includes('abcdef012345'));
  t.id('axEnviar').click(); await esperar(50);
  ok('sem escolher o tipo: avisa e não chama o servidor', !t.sb.rpcs.some(r => r.fn === 'cr_anexo_adicionar'));
  t.id('axCat').value = 'documento_pessoal'; t.id('axEnviar').click(); await esperar(50);
  ok('sem arquivo: avisa e não chama o servidor', !t.sb.rpcs.some(r => r.fn === 'cr_anexo_adicionar'));
  t.escolher('programa.exe', 10); t.id('axEnviar').click(); await esperar(80);
  ok('extensão .exe: recusada na tela, sem chamar o servidor', !t.sb.rpcs.some(r => r.fn === 'cr_anexo_adicionar') && /Só são aceitos/.test(t.txt()));
  t.escolher('grande.pdf', 2097153); t.id('axEnviar').click(); await esperar(80);
  ok('acima de 2 MB: recusado na tela', !t.sb.rpcs.some(r => r.fn === 'cr_anexo_adicionar') && /passa de 2 MB/.test(t.txt()));
  t.escolher('rg.pdf', 4); t.id('axEnviar').click(); await esperar(200);
  const env = t.sb.rpcs.filter(r => r.fn === 'cr_anexo_adicionar');
  ok('envia 1 vez: contrato, categoria, nome e conteúdo em base64 (sem prefixo data:)', env.length === 1 && env[0].a.p_contrato === 7 && env[0].a.p_categoria === 'documento_pessoal' && env[0].a.p_nome === 'rg.pdf' && /^AAAAAA==$/.test(env[0].a.p_base64));
  ok('depois de enviar: lista recarrega com 2 anexos e o campo de arquivo é limpo', t.nLinhas() === 2 && t.id('axArq').value === '');
  [...t.id('axLista').querySelectorAll('button')].find(b => /Baixar/.test(b.textContent)).click(); await esperar(100);
  ok('baixar: chama o servidor e dispara o download com o nome do arquivo', t.sb.rpcs.some(r => r.fn === 'cr_anexo_baixar') && t.w.__baixados.includes('rg.pdf'));
  [...t.id('axLista').querySelectorAll('button')].find(b => /Excluir/.test(b.getAttribute('aria-label') || '')).click(); await esperar(150);
  ok('admin exclui: confirma, chama o servidor e a lista diminui', t.w.__confirmou === 1 && t.sb.rpcs.some(r => r.fn === 'cr_anexo_excluir') && t.nLinhas() === 1);

  t = await abrir('admin', { erroAdd: 'duplicado' }); t.id('axCat').value = 'outro'; t.escolher('a.pdf', 4); t.id('axEnviar').click(); await esperar(200);
  ok('servidor recusa duplicado: mensagem clara e lista não muda', /já está anexado/.test(t.txt()) && t.nLinhas() === 1);
  t = await abrir('admin', { erroAdd: 'tipo_nao_aceito' }); t.id('axCat').value = 'outro'; t.escolher('falso.pdf', 4); t.id('axEnviar').click(); await esperar(200);
  ok('servidor recusa conteúdo que não é PDF/PNG/JPEG mesmo com nome .pdf', /Só são aceitos/.test(t.txt()) && t.nLinhas() === 1);

  t = await abrir('operador');
  [...t.id('axLista').querySelectorAll('button')].find(b => /Excluir/.test(b.getAttribute('aria-label') || '')).click(); await esperar(150);
  ok('operador: excluir não chama o servidor nem pergunta', !t.sb.rpcs.some(r => r.fn === 'cr_anexo_excluir') && t.w.__confirmou === 0 && /Somente administradores/.test(t.txt()));

  t = await abrir('admin', { semTabela: true });
  ok('sem a tabela: avisa para rodar o SQL (R36) e desabilita o envio', /rode sql\/cr-schema\.sql \(R36\)/.test(t.txt()) && t.id('axEnviar').disabled === true);
  t = await abrir('admin', { contrato: { id: 7, numero_contrato: 'TCE-1', titulo: 'x', anonimizado_em: '2026-01-01T00:00:00Z' } });
  ok('contrato anonimizado: esconde o formulário e avisa', t.id('axFormCard').style.display === 'none' && /anonimizado/.test(t.id('axAviso').textContent));
  t = await abrir('admin', {}, '');
  ok('sem ?id: avisa e esconde o formulário', t.id('axFormCard').style.display === 'none' && /botão/.test(t.id('axAviso').textContent));
  t = await abrir('admin', { contrato: null });
  ok('contrato inexistente: avisa e esconde o formulário', t.id('axFormCard').style.display === 'none' && /não encontrado/.test(t.id('axAviso').textContent));
  console.log(falhas ? '\n' + falhas + ' FALHA(S)' : '\nTudo OK'); process.exit(falhas ? 1 : 0);
})();
