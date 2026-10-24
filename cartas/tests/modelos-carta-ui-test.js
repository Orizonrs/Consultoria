// R38 (M10): nova-carta.html usando o modelo ativo + aba Modelos com seletor, em jsdom com banco falso. Precisa: npm i jsdom. Rodar: node tests/modelos-carta-ui-test.js
const { JSDOM } = require('jsdom'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), rd = f => fs.readFileSync(path.join(root, f), 'utf8');
let falhas = 0; const ok = (n, c) => { if (!c) { falhas++; console.log('FALHOU', n); } else console.log('OK    ', n); };
const esperar = ms => new Promise(r => setTimeout(r, ms));
const ctx = () => new Proxy({}, { get: (x, k) => (k in x ? x[k] : () => {}), set: (x, k, v) => { x[k] = v; return true; } });
const MOD = 'Em {{nome}} vimos dedicação. Texto do MODELO versão 3, com bastante palavra para passar de cinquenta.';

function fake(o = {}) {
  const rpcs = [], inserts = [], filtros = [];
  const sbk = { rpcs, inserts, filtros, auth: { getUser: async () => ({ data: { user: { email: 'a@b.c' } } }) },
    rpc: async (fn, a) => { rpcs.push({ fn, a });
      if (fn === 'cr_meu_perfil') return { data: o.perfil || 'admin', error: null };
      if (fn === 'cr_proximo_numero') return { data: 'REC-2026-0001', error: null };
      if (fn === 'cr_modelo_publicar') return { data: { ok: true, id: 9, versao: 4 }, error: null };
      return { data: null, error: null }; },
    from(t) { const f = { t, eq: [] }; filtros.push(f);
      const b = { select() { return b; }, order() { return b; }, limit() { return b; }, single() { return b; }, eq(k, v) { f.eq.push([k, v]); return b; },
        insert(row) { inserts.push({ t, row }); return Promise.resolve({ error: null }); },
        then(res) {
          if (t === 'cr_modelos') {
            if (o.semTabela) return res({ data: null, error: { code: 'PGRST205' } });
            const ch = (f.eq.find(x => x[0] === 'chave') || [])[1];
            const ativo = f.eq.some(x => x[0] === 'ativo');
            let l = (o.modelos || [{ id: 1, chave: 'clausulas_tce', versao: 1, texto: 'x'.repeat(60), ativo: true, criado_em: '2026-10-01T10:00:00Z' }, { id: 2, chave: 'texto_recomendacao', versao: 3, texto: MOD, ativo: true, criado_em: '2026-10-02T10:00:00Z' }]).filter(x => x.chave === ch);
            if (ativo) l = l.filter(x => x.ativo);
            return res({ data: l, error: null });
          }
          if (t === 'cr_cartas') return res({ data: o.carta || null, error: null });
          return res({ data: [], error: null }); } }; return b; } };
  return sbk;
}
async function abrirCarta(o = {}, qs = '') {
  const sbk = fake(o), dom = new JSDOM(rd('nova-carta.html'), { runScripts: 'dangerously', url: 'http://localhost/nova-carta.html' + qs, beforeParse(w) {
    w.eval(rd('assets/cr-config.js')); w.eval(rd('assets/cr-utils.js')); w.open = () => {}; w.HTMLCanvasElement.prototype.getContext = ctx; w._sb = sbk; } });
  const w = dom.window; w.HTMLElement.prototype.scrollIntoView = () => {}; w._sb = sbk; await esperar(600);
  const D = w.document; return { w, D, sbk, id: i => D.getElementById(i), set(i, v) { D.getElementById(i).value = v; }, dados: () => w.eval('dadosForm()') };
}
const chamadas = (t, fn) => t.sbk.rpcs.filter(x => x.fn === fn);

(async () => {
  // ── carta com modelo ativo ──
  let t = await abrirCarta();
  ok('carta: pediu só o modelo ATIVO da recomendação', t.sbk.filtros.some(f => f.t === 'cr_modelos' && f.eq.some(x => x[0] === 'chave' && x[1] === 'texto_recomendacao') && f.eq.some(x => x[0] === 'ativo' && x[1] === true)));
  t.set('nome', 'Ana Souza'); t.w.eval('atualizarNotaTexto()');
  t.w.eval('irEtapa(3)'); t.w.eval("_etapa = 3; render_etapa()");
  ok('etapa 3: o campo mostra o texto do MODELO com o nome trocado', t.id('texto_livre').value === 'Em Ana Souza vimos dedicação. Texto do MODELO versão 3, com bastante palavra para passar de cinquenta.');
  ok('nota informa a versão do modelo', /modelo v3/.test(t.id('ncNota').textContent));
  let d = t.dados();
  ok('texto NÃO editado: a carta GRAVA o texto do modelo, com o nome, e a versão', d.texto_livre === t.id('texto_livre').value && d.modelo_versao === 3 && d.texto_editado === null);
  t.set('nome', 'Bia Lima');
  ok('nome mudou depois: o texto gravado acompanha o nome atual', t.dados().texto_livre.startsWith('Em Bia Lima vimos'));
  ok('nome vazio: aparece [nome]', (t.set('nome', ''), t.dados().texto_livre.startsWith('Em [nome] vimos')));
  t.set('nome', 'Ana Souza'); t.id('texto_livre').value = 'Texto escrito à mão pela pessoa.'; t.w.textoEditado();
  d = t.dados();
  ok('texto EDITADO: grava o que a pessoa escreveu, marca editado e não diz que veio do modelo', d.texto_livre === 'Texto escrito à mão pela pessoa.' && d.texto_editado === true && d.modelo_versao === null);
  t.w.restaurarTexto();
  ok('Restaurar volta ao texto do modelo', t.id('texto_livre').value.startsWith('Em Ana Souza vimos') && t.dados().modelo_versao === 3);
  // emitir: o que vai para o histórico
  t.set('nome', 'Ana Souza'); await t.w.gerar(); await esperar(80);
  const ins = t.sbk.inserts.find(x => x.t === 'cr_cartas');
  ok('emitir: cr_cartas recebe dados.texto_livre do modelo e dados.modelo_versao', ins && ins.row.dados.texto_livre.startsWith('Em Ana Souza vimos') && ins.row.dados.modelo_versao === 3);

  // outros tipos não mudam
  t = await abrirCarta(); t.w.setTipo('carta_cancelamento'); t.set('nome', 'Ana');
  d = t.dados(); ok('cancelamento: texto vazio continua vazio, sem versão de modelo', d.texto_livre === '' && d.modelo_versao === null && d.texto_editado === null);
  t.id('texto_livre').value = 'obs final'; t.w.textoEditado(); ok('cancelamento: observação final continua como antes', t.dados().texto_livre === 'obs final');

  // ── sem modelo (SQL da R38 não rodou / sem tabela) ──
  t = await abrirCarta({ semTabela: true }); t.set('nome', 'Ana Souza'); t.w.eval("_etapa = 3; render_etapa()");
  ok('sem modelo: campo mostra o texto fixo de sempre com o nome', /^Durante o período de estágio, Ana Souza demonstrou comprometimento/.test(t.id('texto_livre').value));
  d = t.dados(); ok('sem modelo: NÃO editado => texto_livre vazio (o documento usa o padrão dele), como na R37', d.texto_livre === '' && d.modelo_versao === null);
  ok('sem modelo: a tela segue utilizável (sem aviso de erro)', !/erro|falha/i.test((t.D.getElementById('toast-ct') || { textContent: '' }).textContent));
  t = await abrirCarta({ modelos: [{ id: 2, chave: 'texto_recomendacao', versao: 3, texto: 'curto {{cpf}}', ativo: true }] });
  t.set('nome', 'Ana'); ok('modelo inválido vindo do banco é ignorado (cai no texto fixo)', t.dados().texto_livre === '' && /^Durante o período/.test(t.w.eval('textoPadrao()')));

  // ── duplicar ──
  const base = { nome: 'Velho Nome', empresa: 'ACME', cargo: 'Analista' };
  t = await abrirCarta({ carta: { tipo_doc: 'carta_recomendacao', dados: { ...base, texto_livre: 'Em Velho Nome vimos antigo.', modelo_versao: 2 } } }, '?dup=7'); t.set('nome', 'Novo Nome');
  ok('duplicar carta com texto do MODELO: volta ao modelo ativo (não carrega o texto/nome antigos)', t.w.eval('_txtEditado') === false && t.dados().texto_livre.startsWith('Em Novo Nome vimos') && t.dados().modelo_versao === 3);
  t = await abrirCarta({ carta: { tipo_doc: 'carta_recomendacao', dados: { ...base, texto_livre: 'Texto manual antigo.', texto_editado: true } } }, '?dup=7');
  ok('duplicar carta com texto EDITADO à mão: mantém o texto da pessoa', t.w.eval('_txtEditado') === true && t.dados().texto_livre === 'Texto manual antigo.');
  t = await abrirCarta({ carta: { tipo_doc: 'carta_recomendacao', dados: { ...base, texto_livre: 'Carta de antes da R38, editada.' } } }, '?dup=7');
  ok('duplicar carta ANTIGA (sem versão) com texto: trata como editado, como na R37', t.w.eval('_txtEditado') === true && t.dados().texto_livre === 'Carta de antes da R38, editada.');
  t = await abrirCarta({ carta: { tipo_doc: 'carta_recomendacao', dados: { ...base } } }, '?dup=7'); t.set('nome', 'Z');
  ok('duplicar carta antiga SEM texto: usa o modelo ativo', t.w.eval('_txtEditado') === false && t.dados().modelo_versao === 3);

  // ── configurações: seletor de modelo ──
  const sbc = fake({ perfil: 'admin' });
  const dom = new JSDOM(rd('configuracoes.html'), { runScripts: 'dangerously', url: 'http://localhost/configuracoes.html', beforeParse(w) { w.eval(rd('assets/cr-config.js')); w.confirm = () => true; w.HTMLCanvasElement.prototype.getContext = ctx; } });
  const w = dom.window; w.eval(rd('assets/cr-utils.js')); w.HTMLElement.prototype.scrollIntoView = () => {}; w._sb = sbc; await esperar(500);
  const el = i => w.document.getElementById(i);
  ok('config: começa no TCE (como na R35)', el('mod_chave').value === 'clausulas_tce' && el('mod_texto').value === 'x'.repeat(60));
  el('mod_chave').value = 'texto_recomendacao'; w.modTrocar(); await esperar(200);
  ok('config: trocar para a recomendação carrega a versão ativa DELA', el('mod_texto').value === MOD && /v3 · .* · ATIVA/.test(el('modVersoes').textContent) && !/v1 · /.test(el('modVersoes').textContent));
  ok('config: explicação da recomendação aparece e a do TCE some', el('modExplica').style.display !== 'none' && /Carta de Recomendação/.test(el('modExplica').textContent) && el('modComoTce').style.display === 'none');
  el('mod_texto').value = 'a'.repeat(60) + ' {{apolice}}'; w.modMudou();
  ok('config: {{apolice}} na recomendação é recusado na tela, com a lista certa', /\{\{nome\}\}/.test(el('modAviso').textContent) && !/\{\{apolice\}\}, /.test(el('modAviso').textContent));
  await w.modPublicar(); await esperar(80);
  ok('config: texto inválido não chama o servidor', sbc.rpcs.filter(x => x.fn === 'cr_modelo_publicar').length === 0);
  el('mod_texto').value = 'Nova redação: {{nome}} foi muito bem durante todo o período em que esteve conosco aqui.'; w.modMudou(); w.modPrever();
  ok('config: prévia usa nome de EXEMPLO (sem dado real)', /Maria Exemplo da Silva/.test(el('modPrev').innerHTML));
  await w.modPublicar(); await esperar(150);
  const pc = sbc.rpcs.filter(x => x.fn === 'cr_modelo_publicar');
  ok('config: publicar manda a chave texto_recomendacao', pc.length === 1 && pc[0].a.p_chave === 'texto_recomendacao' && /Nova redação/.test(pc[0].a.p_texto));
  el('mod_chave').value = 'clausulas_tce'; w.modTrocar(); await esperar(200);
  ok('config: voltar ao TCE mostra o texto do TCE e a explicação dele', el('mod_texto').value === 'x'.repeat(60) && el('modComoTce').style.display !== 'none' && el('modExplica').style.display === 'none');
  el('mod_chave').value = 'texto_recomendacao'; w.modTrocar(); await esperar(100);

  console.log(falhas ? '\n' + falhas + ' FALHA(S)' : '\nTudo OK'); process.exit(falhas ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
