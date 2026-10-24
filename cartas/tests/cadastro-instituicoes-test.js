// R31 (M7): cadastro de instituições — funções puras (sem dependências). Uso: node tests/cadastro-instituicoes-test.js
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const sb = { console, setInterval() {}, clearInterval() {}, setTimeout() {}, localStorage: { length: 0, getItem() { return null }, setItem() {}, removeItem() {} },
  document: { getElementById() { return null }, querySelector() { return null }, querySelectorAll() { return [] }, addEventListener() {}, readyState: 'complete' }, navigator: {}, location: { origin: 'http://x', pathname: '/x.html', search: '', href: 'http://x/x.html' } };
sb.window = sb; vm.createContext(sb);
['cr-config.js', 'cr-utils.js'].forEach(f => vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'assets', f), 'utf8'), sb));
let n = 0; const ok = (c, m) => { assert(c, m); n++; };
const R = (o) => Object.assign({ id: 1, nome: 'UNISINOS', cnpj: '11222333000181', endereco: 'Av. Unisinos, 950', ativo: true }, o);
// instituicoesRecentes
const contr = [
  { instituicao: 'unisinos', criado_em: '2026-01-01' }, { instituicao: '  UNISINOS ', criado_em: '2026-03-01' }, { instituicao: 'Ulbra', criado_em: '2026-02-01' },
  { instituicao: null, criado_em: '2026-04-01' }, { instituicao: '   ', criado_em: '2026-05-01' }, { instituicao: 'Feevale', criado_em: '2026-06-01' }, null];
let rc = sb.instituicoesRecentes(contr);
ok(rc.map(x => x.instituicao).join('|') === 'Feevale|UNISINOS|Ulbra', 'uma por nome (sem diferenciar maiúscula/espaços), vale a grafia do contrato MAIS RECENTE, mais novas primeiro, vazios e nulos ignorados');
ok(sb.instituicoesRecentes(contr, 2).length === 2 && sb.instituicoesRecentes(null).length === 0 && sb.instituicoesRecentes([]).length === 0, 'limite e nulo não quebram');
ok(sb.instituicoesRecentes([{ instituicao: 'A  B', criado_em: '1' }])[0].instituicao === 'A B', 'espaços duplicados viram um só');
// instituicaoDoCadastro
const i = sb.instituicaoDoCadastro(R({ nome: '  Universidade   X ' }));
ok(i.instituicao === 'Universidade X' && i.cnpj === '11.222.333/0001-81' && i.endereco === 'Av. Unisinos, 950', 'converte linha do cadastro (nome normalizado, CNPJ formatado)');
ok(sb.instituicaoDoCadastro(null).instituicao === '' && sb.instituicaoDoCadastro({ nome: 'X' }).cnpj === '', 'nulo/campos ausentes não quebram');
// mesclarInstituicoes
let m = sb.mesclarInstituicoes([R(), R({ id: 2, nome: 'Zeta', cnpj: null })], rc);
ok(m.map(x => x.instituicao).join('|') === 'UNISINOS|Zeta|Feevale|Ulbra', 'cadastro primeiro; depois só as dos contratos que NÃO estão no cadastro (sem repetir UNISINOS)');
m = sb.mesclarInstituicoes([R({ ativo: false })], rc);
ok(m.map(x => x.instituicao).join('|') === 'Feevale|Ulbra', 'INATIVA no cadastro some da lista, inclusive a versão vinda dos contratos (mesmo nome)');
ok(sb.mesclarInstituicoes(null, rc).length === 3 && sb.mesclarInstituicoes([R()], null).length === 1 && sb.mesclarInstituicoes(null, null).length === 0, 'sem cadastro (tabela ausente) ou sem contratos: funciona com o que houver');
ok(sb.mesclarInstituicoes([R({ nome: '   ' })], []).length === 0, 'nome em branco não vira sugestão');
ok(sb.mesclarInstituicoes([R({ id: 5, nome: 'ULBRA', ativo: true })], rc).map(x => x.instituicao).join('|') === 'ULBRA|Feevale|UNISINOS', 'mesmo nome com outra grafia de maiúscula: vale a do CADASTRO e não repete');
// instituicoesParaImportar
const cad = [R(), R({ id: 2, nome: 'Feevale', cnpj: null, ativo: false })];
let imp = sb.instituicoesParaImportar(rc.concat([{ instituicao: 'ulbra' }, { instituicao: 'Nova  Faculdade' }, { instituicao: '  ' }, null]), cad);
ok(imp.map(x => x.nome).join('|') === 'Ulbra|Nova Faculdade', 'importa só o que NÃO está no cadastro (nem ativa nem inativa), sem repetir e ignorando vazios');
ok(imp[0].cnpj === null && imp[0].endereco === null, 'entra só com o nome: CNPJ e endereço null');
ok(sb.instituicoesParaImportar(rc, [R(), R({ id: 2, nome: 'Feevale', cnpj: null }), R({ id: 3, nome: 'Ulbra', cnpj: null })]).length === 0 && sb.instituicoesParaImportar(null, null).length === 0, 'tudo já cadastrado ou nulo: nada a importar');
// erroInstituicao
ok(/este CNPJ/.test(sb.erroInstituicao({ code: '23505', message: 'duplicate key value violates unique constraint "cr_instituicoes_cnpj_uk"' })), 'duplicada por CNPJ');
ok(/este nome/.test(sb.erroInstituicao({ code: '23505', message: 'duplicate key value violates unique constraint "cr_instituicoes_nome_uk"' })), 'duplicada por nome');
ok(/CNPJ inválido/.test(sb.erroInstituicao({ code: '23514', message: 'CNPJ inválido' })) && /nome da instituição/i.test(sb.erroInstituicao({ code: '23514', message: 'nome da instituição obrigatório' })), 'checagens do servidor');
ok(/cr-schema\.sql \(R31\)/.test(sb.erroInstituicao({ code: '42P01', message: 'relation "cr_instituicoes" does not exist' })) && /cr-schema\.sql/.test(sb.erroInstituicao({ message: 'Could not find the table public.cr_instituicoes in the schema cache' })), 'tabela inexistente manda rodar o SQL');
ok(/Não foi possível/.test(sb.erroInstituicao(null)) && !/boom/.test(sb.erroInstituicao({ message: 'boom' })), 'erro desconhecido: mensagem genérica, sem vazar detalhe');
console.log('OK ' + n + ' verificações');
