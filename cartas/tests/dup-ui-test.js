// R20: teste de tela (jsdom) de novo-contrato.html?dup=ID. Precisa: npm i jsdom. Rodar: node tests/dup-ui-test.js
const { JSDOM } = require('jsdom'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), html = fs.readFileSync(path.join(root, 'novo-contrato.html'), 'utf8');
const utils = fs.readFileSync(path.join(root, 'assets/cr-utils.js'), 'utf8'), cfg = fs.readFileSync(path.join(root, 'assets/cr-config.js'), 'utf8');
let falhas = 0; const ok = (n, c) => { if (!c) { falhas++; console.log('FALHOU', n); } else console.log('OK    ', n); };
const esperar = ms => new Promise(r => setTimeout(r, ms));
const orig = { id: 5, tipo: 'clt', numero_contrato: 'CLT-2026-0005', nome_candidato: 'Ana', cpf: '52998224725', email_candidato: 'a@x.com', matricula: 'M1', empresa: 'ACME', cnpj_empresa: '11222333000181', cargo: 'Dev', valor_bolsa: 1500, supervisor_nome: 'Chefe', periodo_fim: '2027-01-01' };
const sigsO = [{ contrato_id: 5, papel: 'candidato', nome: 'Ana', email: 'a@x.com' }, { contrato_id: 5, papel: 'empresa_nexus', nome: 'Orizon Consultoria', email: 'adm@orizon.com.br' }, { contrato_id: 5, papel: 'supervisor', nome: 'Chefe', email: 'c@x.com' }];
async function abrir(qs, fonte) {
  const logs = [];
  const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'http://localhost/novo-contrato.html' + qs, beforeParse(w) { w.eval(cfg); } });
  const w = dom.window; w.eval(utils); w.HTMLElement.prototype.scrollIntoView = () => {};
  const th = d => { const q = { eq() { return q; }, single() { return q; }, then(res) { res({ data: d, error: fonte === 'erro' ? { message: 'x' } : null }); } }; return q; };
  w._sb = { auth: { getUser: async () => ({ data: { user: null } }) }, from: t => ({ select: () => th(t === 'cr_contratos' ? orig : sigsO) }), rpc: async (fn, a) => { logs.push([fn, a]); return { data: null, error: null }; } };
  await esperar(500); return { w, D: w.document, logs, sigs: () => w.eval('_signatarios'), toasts: () => [...w.document.querySelectorAll('#toast-ct *')].map(x => x.textContent).join(' | ') };
}
(async () => {
  let t = await abrir('?dup=5'); const v = id => t.D.getElementById(id).value;
  ok('copia empresa, cargo, valor e supervisor', v('empresa') === 'ACME' && v('cargo') === 'Dev' && v('valor_bolsa') === '1500' && v('supervisor_nome') === 'Chefe' && v('cnpj_empresa') === '11222333000181');
  ok('NÃO copia candidato, CPF, e-mail, matrícula nem término', v('nome_candidato') === '' && v('cpf') === '' && v('email_candidato') === '' && v('matricula') === '' && v('periodo_fim') === '');
  ok('início continua sendo hoje', v('periodo_inicio') === new Date().toISOString().slice(0, 10));
  ok('tipo CLT aplicado (rótulo de salário)', /Salário/.test(t.D.getElementById('lbl_bolsa').textContent));
  ok('signatários: Orizon + candidato + supervisor copiado (sem duplicar Orizon/candidato)', t.sigs().map(s => s.papel).sort().join() === 'candidato,empresa_nexus,supervisor');
  ok('registra a ação no histórico e avisa', t.logs.some(l => l[0] === 'cr_log' && l[1].p_acao === 'duplicou_contrato') && /copiados de CLT-2026-0005/.test(t.toasts()));
  t = await abrir(''); ok('sem ?dup= nada é copiado', t.D.getElementById('empresa').value === '' && t.sigs().length === 2);
  t = await abrir('?dup=5', 'erro'); ok('erro ao ler a origem: avisa e o formulário segue utilizável', /Não consegui copiar/.test(t.toasts()) && t.D.getElementById('empresa').value === '');
  console.log(falhas ? falhas + ' FALHARAM' : 'Todos OK'); process.exit(falhas ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
