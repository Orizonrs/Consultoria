// R30 (M7): cadastro de empresas — funções puras (sem dependências). Uso: node tests/cadastro-empresas-test.js
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const sb = { console, setInterval() {}, clearInterval() {}, setTimeout() {}, localStorage: { length: 0, getItem() { return null }, setItem() {}, removeItem() {} },
  document: { getElementById() { return null }, querySelector() { return null }, querySelectorAll() { return [] }, addEventListener() {}, readyState: 'complete' }, navigator: {}, location: { origin: 'http://x', pathname: '/x.html', search: '', href: 'http://x/x.html' } };
sb.window = sb; vm.createContext(sb);
['cr-config.js', 'cr-utils.js'].forEach(f => vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'assets', f), 'utf8'), sb));
let n = 0; const ok = (c, m) => { assert(c, m); n++; };
// formatarCNPJ / chaveEmpresa
ok(sb.formatarCNPJ('11222333000181') === '11.222.333/0001-81' && sb.formatarCNPJ('11.222.333/0001-81') === '11.222.333/0001-81', 'formata CNPJ (já formatado não muda)');
ok(sb.formatarCNPJ('123') === '123' && sb.formatarCNPJ(null) === '' && sb.formatarCNPJ('') === '', 'CNPJ incompleto/nulo: devolve como veio, sem quebrar');
ok(sb.chaveEmpresa('Acme', '11.222.333/0001-81') === 'c11222333000181' && sb.chaveEmpresa(' ACME  Ltda ', '') === 'nacme ltda' && sb.chaveEmpresa('', '') === '' && sb.chaveEmpresa('X', '123') === 'nx', 'chave: CNPJ de 14 dígitos, senão o nome normalizado; vazio = sem chave');
// empresaDoCadastro
const R = (o) => Object.assign({ id: 1, razao_social: 'Acme Ltda', cnpj: '11222333000181', endereco: 'Rua A, 1', supervisor_nome: 'João', supervisor_cargo: 'Gerente', ativo: true }, o);
const e = sb.empresaDoCadastro(R());
ok(e.empresa === 'Acme Ltda' && e.cnpj_empresa === '11.222.333/0001-81' && e.endereco_emp === 'Rua A, 1' && e.supervisor_nome === 'João' && e.supervisor_cargo === 'Gerente', 'converte linha do cadastro para o formato do formulário (CNPJ formatado)');
ok(sb.empresaDoCadastro(null).empresa === '' && sb.empresaDoCadastro({ razao_social: 'X' }).cnpj_empresa === '', 'nulo/campos ausentes não quebram');
// mesclarEmpresas
const rec = [
  { empresa: 'ACME LTDA', cnpj_empresa: '11.222.333/0001-81', endereco_emp: 'Rua Velha', supervisor_nome: 'Antigo', supervisor_cargo: '' },
  { empresa: 'Beta SA', cnpj_empresa: '', endereco_emp: 'Av B', supervisor_nome: '', supervisor_cargo: '' },
  { empresa: 'Gama', cnpj_empresa: '', endereco_emp: '', supervisor_nome: '', supervisor_cargo: '' },
  { empresa: 'Delta (nome do contrato)', cnpj_empresa: '45.723.174/0001-10', endereco_emp: '', supervisor_nome: '', supervisor_cargo: '' }];
let m = sb.mesclarEmpresas([R(), R({ id: 2, razao_social: 'Zeta', cnpj: null, ativo: true })], rec);
ok(m.length === 5 && m[0].empresa === 'Acme Ltda' && m[1].empresa === 'Zeta', 'cadastro vem primeiro');
ok(m[0].endereco_emp === 'Rua A, 1' && !m.some(x => x.empresa === 'ACME LTDA'), 'dado do CADASTRO vence o do contrato (mesmo CNPJ), sem repetir a empresa');
ok(m.map(x => x.empresa).slice(2).join('|') === 'Beta SA|Gama|Delta (nome do contrato)', 'empresas só dos contratos vêm depois, na ordem');
m = sb.mesclarEmpresas([R({ ativo: false }), R({ id: 3, razao_social: 'Beta SA', cnpj: null, ativo: false })], rec);
ok(!m.some(x => /acme/i.test(x.empresa)) && !m.some(x => x.empresa === 'Beta SA'), 'INATIVA no cadastro some da lista, inclusive a versão vinda dos contratos (mesmo CNPJ ou mesmo nome)');
ok(m.map(x => x.empresa).join('|') === 'Gama|Delta (nome do contrato)', 'o resto continua sugerido');
ok(sb.mesclarEmpresas(null, rec).length === 4 && sb.mesclarEmpresas([R()], null).length === 1 && sb.mesclarEmpresas(null, null).length === 0, 'sem cadastro (tabela ausente) ou sem contratos: funciona com o que houver');
ok(sb.mesclarEmpresas([R({ razao_social: '   ' })], []).length === 0, 'razão social em branco não vira sugestão');
// empresasParaImportar
const cad = [R(), R({ id: 2, razao_social: 'Beta SA', cnpj: null })];
let imp = sb.empresasParaImportar(rec.concat([{ empresa: 'Gama', cnpj_empresa: '', endereco_emp: 'dup' }, { empresa: 'Lixo', cnpj_empresa: '11.222.333/0001-82', endereco_emp: 'Rua L', supervisor_nome: 'Z' }, { empresa: '  ' }, null]), cad);
ok(imp.map(x => x.razao_social).join('|') === 'Gama|Delta (nome do contrato)|Lixo', 'importa só o que NÃO está no cadastro (por CNPJ ou nome), sem repetir dentro da lista e ignorando vazios');
ok(imp[1].cnpj === '45723174000110' && imp[0].cnpj === null && imp[0].endereco === null, 'CNPJ vai só com dígitos; vazio vira null');
ok(imp[2].cnpj === null && imp[2]._cnpjDescartado === true && imp[2].razao_social === 'Lixo' && imp[2].endereco === 'Rua L', 'CNPJ inválido (dado antigo) é descartado, mas a empresa e o resto são importados e ela é sinalizada');
ok(imp[0]._cnpjDescartado === false, 'sem CNPJ digitado não é "descartado"');
ok(sb.empresasParaImportar(rec, [R(), R({ id: 2, razao_social: 'Beta SA', cnpj: null }), R({ id: 3, razao_social: 'Gama', cnpj: null }), R({ id: 4, razao_social: 'X', cnpj: '45723174000110' })]).length === 0, 'tudo já cadastrado: nada a importar (inclusive por CNPJ com nome diferente)');
ok(sb.empresasParaImportar(null, null).length === 0, 'nulo não quebra');
ok(sb.empresasParaImportar([{ empresa: 'Acme', cnpj_empresa: '11.222.333/0001-81' }], [R({ ativo: false })]).length === 0, 'empresa INATIVA no cadastro não é reimportada');
// erroEmpresa
ok(/CNPJ cadastrada|este CNPJ/.test(sb.erroEmpresa({ code: '23505', message: 'duplicate key value violates unique constraint "cr_empresas_cnpj_uk"' })), 'duplicado por CNPJ');
ok(/mesmo nome|este nome/.test(sb.erroEmpresa({ code: '23505', message: 'duplicate key value violates unique constraint "cr_empresas_nome_uk"' })), 'duplicado por nome');
ok(/CNPJ inválido/.test(sb.erroEmpresa({ code: '23514', message: 'CNPJ inválido' })) && /razão social/i.test(sb.erroEmpresa({ code: '23514', message: 'razão social obrigatória' })), 'checagens do servidor');
ok(/cr-schema\.sql/.test(sb.erroEmpresa({ code: '42P01', message: 'relation "cr_empresas" does not exist' })) && /cr-schema\.sql/.test(sb.erroEmpresa({ message: 'Could not find the table public.cr_empresas in the schema cache' })), 'tabela inexistente manda rodar o SQL');
ok(/Não foi possível/.test(sb.erroEmpresa(null)) && /Não foi possível/.test(sb.erroEmpresa({ message: 'boom' })), 'erro desconhecido: mensagem genérica, sem vazar detalhe');
console.log('OK ' + n + ' verificações');
