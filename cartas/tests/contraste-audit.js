// R23 (M18/P8): auditoria de contraste (WCAG 2.1 AA) em navegador real, tema claro e escuro. Precisa de Playwright + Chromium.
//   NODE_PATH=$(npm root -g) node tests/contraste-audit.js [claro|escuro|ambos] [--json]
// Abre cada página por file:// com um Supabase FALSO (dados de mentira), mede cor do texto x fundo composto e lista o que fica abaixo de 4,5:1
// (3:1 para texto grande). NÃO vê texto em gradiente/imagem (conta e avisa), nem estados que dependam de dados reais. Sai com código 1 se achar falhas.
const { chromium } = require('playwright'), path = require('path'), fs = require('fs');
const root = path.join(__dirname, '..'), modo = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'claro';
const agora = Date.now(), iso = d => new Date(agora + d * 86400000).toISOString(), dia = d => iso(d).slice(0, 10);
const contratos = ['rascunho', 'enviado', 'parcial', 'assinado', 'cancelado'].map((st, i) => ({ id: i + 1, tipo: i % 2 ? 'clt' : 'estagio', numero_contrato: 'TCE-2026-000' + (i + 1), titulo: 'TCE — Ana Souza — ACME', nome_candidato: 'Ana Souza', cpf: '52998224725', cargo: 'Assistente', email_candidato: 'ana@x.com', empresa: 'ACME Ltda', cnpj_empresa: '11222333000181', curso: 'Administração', instituicao: 'UNISINOS', status: st, periodo_inicio: dia(-30 * (i + 1)), periodo_fim: dia(60 - 40 * i), valor_bolsa: 1200, criado_em: iso(-i), hash_documento: 'ab'.repeat(32) }));
const sigs = []; contratos.forEach(c => ['empresa_nexus', 'candidato', 'supervisor'].forEach((p, j) => sigs.push({ id: c.id * 10 + j, contrato_id: c.id, nome: ['Orizon', 'Ana Souza', 'Chefe'][j], email: 'x@x.com', papel: p, token: 't' + c.id + j, status: ['assinado', 'pendente', 'recusado'][(c.id + j) % 3], motivo_recusa: 'Valor errado', assinado_em: iso(-1), expira_em: iso(j === 1 ? -3 : 20), visualizado_em: iso(-1) })));
const cartas = [1, 2, 3].map(i => ({ id: i, numero_carta: 'REC-2026-000' + i, nome: 'Bia Lima', tipo: ['recomendacao', 'cancelamento', 'recesso'][i - 1], tipo_carta: 'recomendacao', cargo: 'Dev', empresa: 'ACME', status: ['rascunho', 'enviada', 'assinada'][i - 1], criado_em: iso(-i), token: 'c' + i, titulo: 'Carta ' + i, conteudo: 'Texto da carta.' }));
const logs = [1, 2, 3, 4].map(i => ({ id: i, acao: ['criou_contrato', 'login', 'novo_link', 'reabriu_assinatura'][i - 1], entidade: 'contrato', ref: 'TCE-2026-0001', detalhe: 'detalhe', usuario_email: 'adm@orizon.com.br', criado_em: iso(-i) }));
const audits = [1, 2, 3].map(i => ({ id: i, contrato_id: 1, evento: ['criou', 'assinou', 'recusou'][i - 1], detalhe: 'Ana Souza', ip: '1.2.3.4', criado_em: iso(-i), signatario_id: 11 }));
const dados = { cr_candidatos: [{ id: 1, nome: 'Maria da Silva', cpf: '52998224725', email: 'maria@email.com', curso: 'Administração', semestre: '4º semestre', instituicao: 'UNISINOS', matricula: '2023001' }, { id: 2, nome: 'João Souza', cpf: null, email: null, curso: 'Direito', semestre: null, instituicao: null, matricula: null }], cr_instituicoes: [{ id: 1, nome: 'Universidade do Vale do Rio dos Sinos', cnpj: '11222333000181', endereco: 'Av. Unisinos, 950 · Cristo Rei · São Leopoldo/RS', ativo: true }, { id: 2, nome: 'Faculdade Antiga de Teste', cnpj: null, endereco: null, ativo: false }], cr_empresas: [{ id: 1, razao_social: 'Acme Tecnologia Ltda', cnpj: '11222333000181', endereco: 'Rua das Flores, 10 · Centro · Guaíba/RS', supervisor_nome: 'João Santos', supervisor_cargo: 'Gerente de RH', ativo: true }, { id: 2, razao_social: 'Velha Comércio SA', cnpj: null, endereco: null, supervisor_nome: null, supervisor_cargo: null, ativo: false }], cr_contratos: contratos, cr_signatarios: sigs, cr_cartas: cartas, cr_log: logs, cr_auditoria: audits, cr_config: [{ chave: 'x', valor: 'y' }] };
const FAKE = `(function(){var D=${JSON.stringify(dados)};
function q(t){var r=D[t]||[],o={};['select','eq','neq','in','like','ilike','order','limit','range','gte','lte','gt','lt','is','not','or','filter','match','contains'].forEach(function(m){o[m]=function(){return o}});
 o.single=o.maybeSingle=function(){return {then:function(f){f({data:r[0]||null,error:null})}}};o.insert=o.update=o.upsert=o.delete=function(){return o};
 o.then=function(f){f({data:r,error:null,count:r.length})};return o}
var u=window.__ANON__?null:{id:'u1',email:'adm@orizon.com.br',user_metadata:{full_name:'Adm Orizon'}};
window.supabase={createClient:function(){return {from:q,rpc:function(f){return Promise.resolve({data:f==='cr_ler_por_token'?(window.__DADOS__?{contrato:{tipo:'estagio',numero_contrato:'TCE-2026-0001',titulo:'TCE',nome_candidato:'Ana Souza',cpf:'529.982.247-25',cargo:'Assistente',empresa:'ACME',periodo_inicio:'2026-01-01',periodo_fim:'2026-12-31',valor_bolsa:1200},signatario:{nome:'Ana Souza',papel:'candidato',status:'pendente'},signatarios:[{nome:'Ana Souza',papel:'candidato',status:'pendente'},{nome:'Chefe',papel:'supervisor',status:'assinado'},{nome:'Orizon',papel:'empresa_nexus',status:'recusado'}]}:{erro:'token_invalido'}):null,error:null})},
 auth:{getUser:function(){return Promise.resolve({data:{user:u},error:null})},getSession:function(){return Promise.resolve({data:{session:u?{user:u}:null},error:null})},signOut:function(){return Promise.resolve({})},onAuthStateChange:function(){return {data:{subscription:{unsubscribe:function(){}}}}},signInWithPassword:function(){return Promise.resolve({data:{},error:null})}}}}}})();`;
const paginas = [
  ['index.html'], ['index-contratos.html'], ['index-contratos.html', 'modal 🔗', "verLinks(3)"], ['index-cartas.html'], ['historico.html'], ['empresas.html'], ['empresas.html', 'formulário aberto e inativas', "abrirForm();document.getElementById('fStatus').value='todas';render()"], ['instituicoes.html'], ['instituicoes.html', 'formulário aberto e inativas', "abrirForm();document.getElementById('fStatus').value='todas';render()"], ['candidatos.html'], ['candidatos.html', 'formulário aberto', "abrirForm()"], ['configuracoes.html', 'aba usuários e perfis', "document.querySelector('[data-p=usr]').click()"], ['configuracoes.html', 'aba modelos', "document.querySelector('[data-p=mod]').click()"], ['configuracoes.html', 'aba privacidade', "document.querySelector('[data-p=lgpd]').click()"], ['vencimentos.html'], ['configuracoes.html'],
  ['novo-contrato.html', 'etapa 1'], ['novo-contrato.html', 'etapa 2', "irStep(2)"], ['novo-contrato.html', 'etapa 3', "renderConfirm();irStep(3)"], ['novo-contrato.html', 'com alerta e rascunho', "document.getElementById('jornada_horas').value='9h/dia';irStep(2);document.getElementById('bannerRascunho').style.display=''"],
  ['nova-carta.html'], ['nova-carta-cancelamento.html'], ['novo-movimento.html'], ['visualizar-assinado.html?id=1'], ['visualizar.html'], ['verificar.html'], ['login.html', 'anon'], ['login-carta.html', 'anon'], ['assinar-contrato.html?t=abc'], ['assinar-contrato.html?t=abc', 'dados'], ['assinar.html'], ['assinar-carta.html'],
];
const MEDIR = () => {
  const lum = c => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(c[0]) + .7152 * f(c[1]) + .0722 * f(c[2]); };
  const pr = s => { const m = /rgba?\(([^)]+)\)/.exec(s || ''); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p[3] == null ? 1 : p[3]]; };
  const mix = (f, b) => [0, 1, 2].map(i => f[i] * f[3] + b[i] * (1 - f[3]));
  const out = [], gradiente = []; const vistos = new Set();
  const fundo = el => { let pilha = [], n = el, desconhecido = false; while (n && n.nodeType === 1) { const cs = getComputedStyle(n); if (cs.backgroundImage && cs.backgroundImage !== 'none') desconhecido = true; const b = pr(cs.backgroundColor); if (b && b[3] > 0) { pilha.push(b); if (b[3] >= 1) break; } n = n.parentElement; }
    let base = [255, 255, 255]; if (!pilha.length || pilha[pilha.length - 1][3] < 1) base = getComputedStyle(document.documentElement).colorScheme === 'dark' ? [0, 0, 0] : [255, 255, 255];
    for (let i = pilha.length - 1; i >= 0; i--) base = mix(pilha[i], base); return { rgb: base, desconhecido }; };
  const visivel = el => { const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return false; for (let n = el; n && n.nodeType === 1; n = n.parentElement) { const cs = getComputedStyle(n); if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return false; } return true; };
  const desc = el => { let s = el.tagName.toLowerCase(); if (el.id) s += '#' + el.id; else if (el.className && typeof el.className === 'string') s += '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.'); return s; };
  const testar = (el, texto, corStr, tipo) => {
    const cs = getComputedStyle(el); const fill = cs.webkitTextFillColor; let cor = pr(tipo === 'ph' ? corStr : (fill && fill !== corStr && pr(fill) ? fill : corStr));
    if (tipo !== 'ph' && fill && pr(fill) && pr(fill)[3] === 0 && cs.webkitBackgroundClip === 'text') { gradiente.push(desc(el) + ': ' + texto.slice(0, 30)); return; }
    if (!cor) return; const f = fundo(el); if (f.desconhecido) { gradiente.push(desc(el) + ' (fundo com imagem/gradiente): ' + texto.slice(0, 30)); return; }
    const t = mix(cor, f.rgb), L1 = lum(t), L2 = lum(f.rgb), r = (Math.max(L1, L2) + .05) / (Math.min(L1, L2) + .05);
    const px = parseFloat(cs.fontSize), grande = px >= 24 || (px >= 18.66 && Number(cs.fontWeight) >= 700), min = grande ? 3 : 4.5;
    if (r < min) { const k = desc(el) + '|' + cs.color + '|' + f.rgb.map(Math.round).join(','); if (vistos.has(k)) return; vistos.add(k);
      out.push({ el: desc(el), texto: texto.trim().slice(0, 40), razao: Math.round(r * 100) / 100, min, cor: 'rgb(' + t.map(Math.round).join(',') + ')', fundo: 'rgb(' + f.rgb.map(Math.round).join(',') + ')', tamanho: px }); } };
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n; (n = w.nextNode());) { const t = n.nodeValue.trim(); if (!t) continue; const el = n.parentElement; if (!el || /^(SCRIPT|STYLE|NOSCRIPT|OPTION)$/.test(el.tagName) || !visivel(el)) continue; testar(el, t, getComputedStyle(el).color, 'txt'); }
  document.querySelectorAll('input,textarea').forEach(el => { if (!visivel(el)) return; if (el.placeholder && !el.value) testar(el, 'placeholder: ' + el.placeholder, getComputedStyle(el, '::placeholder').color, 'ph'); if (el.value && el.type !== 'hidden' && el.type !== 'checkbox' && el.type !== 'radio') testar(el, 'valor: ' + el.value, getComputedStyle(el).color, 'txt'); });
  return { falhas: out, gradiente };
};
(async () => {
  const temas = modo === 'ambos' ? ['light', 'dark'] : [modo === 'escuro' ? 'dark' : 'light'];
  const b = await chromium.launch(); let total = 0; const relatorio = [];
  for (const tema of temas) for (const [pg, rotulo, acao] of paginas) {
    const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: tema }), p = await ctx.newPage();
    if (rotulo === 'anon') await ctx.addInitScript(() => { window.__ANON__ = true; });
    if (rotulo === 'dados') await ctx.addInitScript(() => { window.__DADOS__ = true; });
    await ctx.addInitScript(t => { try { localStorage.setItem('cr_theme', t); } catch (e) {} }, tema);
    await p.route('**/*', r => { const u = r.request().url(); if (u.startsWith('file://')) return r.continue(); if (/supabase/.test(u)) return r.fulfill({ contentType: 'application/javascript', body: FAKE }); if (/fonts\.(googleapis|gstatic)/.test(u)) return r.abort(); return r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }); });
    const erros = []; p.on('pageerror', e => erros.push(e.message.slice(0, 80)));
    await p.goto('file://' + path.join(root, pg), { waitUntil: 'load' }).catch(() => {}); await p.waitForTimeout(900);
    await p.evaluate(t => document.documentElement.setAttribute('data-theme', t), tema);
    if (acao && rotulo !== 'anon') { await p.evaluate(a => { try { (0, eval)(a); } catch (e) {} }, acao); await p.waitForTimeout(300); }
    const r = await p.evaluate(MEDIR); const nome = pg + (rotulo && rotulo !== 'anon' ? ' [' + rotulo + ']' : ''); total += r.falhas.length; relatorio.push({ tema, pagina: nome, falhas: r.falhas, gradiente: r.gradiente.length, erros });
    console.log((r.falhas.length ? 'FALHAS ' + String(r.falhas.length).padStart(3) : 'ok         ') + ' ' + tema.padEnd(5) + ' ' + nome + (r.gradiente.length ? '  (não medido: ' + r.gradiente.length + ' texto(s) em gradiente/imagem)' : '') + (erros.length ? '  [erro JS: ' + erros[0] + ']' : ''));
    await ctx.close();
  }
  await b.close();
  if (process.argv.includes('--json')) fs.writeFileSync(path.join(__dirname, 'contraste-resultado.json'), JSON.stringify(relatorio, null, 1));
  const agrup = {}; relatorio.forEach(r => r.falhas.forEach(f => { const k = r.tema + ' | ' + f.el + ' | ' + f.cor + ' sobre ' + f.fundo + ' = ' + f.razao + ':1 (mín ' + f.min + ')'; (agrup[k] = agrup[k] || []).push(r.pagina + ' "' + f.texto + '"'); }));
  Object.keys(agrup).slice(0, 80).forEach(k => console.log('\n' + k + '\n   ex.: ' + agrup[k].slice(0, 2).join(' ; ') + (agrup[k].length > 2 ? ' (+' + (agrup[k].length - 2) + ')' : '')));
  console.log('\n' + (total ? total + ' combinações abaixo do mínimo' : 'Nenhuma falha de contraste medida')); process.exit(total ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
