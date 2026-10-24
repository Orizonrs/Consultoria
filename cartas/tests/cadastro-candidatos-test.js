// R32 (M7): cadastro de candidatos — funções puras (sem dependências). Uso: node tests/cadastro-candidatos-test.js
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const sb = { console, setInterval() {}, clearInterval() {}, setTimeout() {}, localStorage: { length: 0, getItem() { return null }, setItem() {}, removeItem() {} },
  document: { getElementById() { return null }, querySelector() { return null }, querySelectorAll() { return [] }, addEventListener() {}, readyState: 'complete' }, navigator: {}, location: { origin: 'http://x', pathname: '/x.html', search: '', href: 'http://x/x.html' } };
sb.window = sb; vm.createContext(sb);
['cr-config.js', 'cr-utils.js'].forEach(f => vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'assets', f), 'utf8'), sb));
let n = 0; const ok = (c, m) => { assert(c, m); n++; };
const CPF1 = '52998224725', CPF2 = '11144477735';
ok(sb.validarCPF(CPF1) && sb.validarCPF(CPF2), 'os CPFs de teste são válidos também no navegador (os mesmos do teste SQL)');
ok(sb.formatarCPF(CPF1) === '529.982.247-25' && sb.formatarCPF('529.982.247-25') === '529.982.247-25' && sb.formatarCPF('123') === '123' && sb.formatarCPF(null) === '', 'formatarCPF: já formatado não muda; incompleto/nulo volta como veio');
ok(sb.mascararCPF(CPF1) === '***.982.247-**' && sb.mascararCPF('529.982.247-25') === '***.982.247-**', 'mascararCPF mostra só os 6 do meio');
ok(sb.mascararCPF('123') === '' && sb.mascararCPF(null) === '' && sb.mascararCPF('') === '', 'CPF incompleto/ausente: vazio (não inventa)');
ok(sb.mascararCPF(CPF1).replace(/\D/g, '').length === 6, 'a máscara não deixa passar mais que 6 dígitos');
const R = o => Object.assign({ id: 1, nome: 'Maria da Silva', cpf: CPF1, email: 'maria@x.com', curso: 'Administração', semestre: '4º semestre', instituicao: 'UNISINOS', matricula: '2023001' }, o);
const f = sb.candidatoDoCadastro(R({ nome: '  Maria   da Silva ' }));
ok(f.nome_candidato === 'Maria da Silva' && f.cpf === '529.982.247-25' && f.email_candidato === 'maria@x.com' && f.curso === 'Administração' && f.semestre === '4º semestre' && f.instituicao === 'UNISINOS' && f.matricula === '2023001', 'converte a linha para os ids do formulário (CPF formatado)');
ok(sb.candidatoDoCadastro(null).nome_candidato === '' && sb.candidatoDoCadastro({ nome: 'X' }).cpf === '', 'nulo/campos ausentes não quebram');
const lista = [R(), R({ id: 2, nome: 'MARIA  DA SILVA', cpf: CPF2 }), R({ id: 3, nome: 'João Souza', cpf: null }), null];
ok(sb.candidatosPorNome(lista, 'maria da silva').length === 2, 'homônimos: devolve os dois (maiúscula e espaços não contam)');
ok(sb.candidatosPorNome(lista, ' João  Souza ').length === 1 && sb.candidatosPorNome(lista, 'João').length === 0 && sb.candidatosPorNome(lista, 'Maria').length === 0, 'nome parcial NÃO casa');
ok(sb.candidatosPorNome(lista, '').length === 0 && sb.candidatosPorNome(null, 'x').length === 0 && sb.candidatosPorNome(lista, null).length === 0, 'vazio/nulo não quebra');
const campos = sb.camposDoCandidato(R(), { cpf: '', email_candidato: '  ', curso: 'Meu curso', semestre: '', instituicao: 'Outra', matricula: '' });
ok(Object.keys(campos).sort().join(',') === 'cpf,email_candidato,matricula,semestre' && campos.cpf === '529.982.247-25' && campos.curso === undefined && campos.instituicao === undefined, 'preenche SÓ os vazios; nunca troca o que foi digitado');
ok(Object.keys(sb.camposDoCandidato(R({ cpf: null, email: '', curso: null }), {})).sort().join(',') === 'instituicao,matricula,semestre', 'o que o cadastro não tem não é preenchido (nem vazio)');
ok(Object.keys(sb.camposDoCandidato(null, {})).length === 0 && !('nome_candidato' in sb.camposDoCandidato(R(), {})), 'sem candidato: nada; o nome nunca é alterado');
ok(/este CPF/.test(sb.erroCandidato({ code: '23505', message: 'duplicate key value violates unique constraint "cr_candidatos_cpf_uk"' })), 'duplicado por CPF');
ok(/este nome/.test(sb.erroCandidato({ code: '23505', message: 'duplicate key value violates unique constraint "cr_candidatos_nome_uk"' })), 'duplicado por nome');
ok(/CPF inválido/.test(sb.erroCandidato({ code: '23514', message: 'CPF inválido' })) && /nome do candidato/i.test(sb.erroCandidato({ code: '23514', message: 'nome do candidato obrigatório' })), 'checagens do servidor');
ok(/cr-schema\.sql \(R32\)/.test(sb.erroCandidato({ code: '42P01', message: 'relation "cr_candidatos" does not exist' })), 'tabela inexistente manda rodar o SQL');
const vaza = sb.erroCandidato({ code: '23505', message: 'Key (cpf)=(52998224725) already exists.' }) + sb.erroCandidato({ message: 'boom 52998224725' });
ok(!vaza.includes('52998224725'), 'a mensagem mostrada NUNCA repete o texto do erro do banco (que pode trazer o CPF)');
// RN-10: candidatos.html só chama logAcao 2 vezes (salvar, que cria OU edita, e excluir) e nenhuma leva CPF/nome/e-mail.
// (A 1ª versão deste teste esperava 3 chamadas; o código tem 2 porque criar/editar usam uma só com ternário. O erro era do teste.)
const src = fs.readFileSync(path.join(__dirname, '..', 'candidatos.html'), 'utf8');
const logs = [...src.matchAll(/logAcao\(([^;]*)\)\s*;/g)].map(m => m[1]);
ok(logs.length === 2, 'candidatos.html: exatamente 2 chamadas de logAcao (salvar e excluir): ' + logs.length);
ok(logs.every(l => /^\s*(_editId \? 'editou_candidato' : 'criou_candidato'|'excluiu_candidato'), 'candidato', (_editId \? 'id ' \+ _editId : SEM_LOG|'id ' \+ id)\s*$/.test(l)), 'as chamadas de log só levam ação, tipo e "id N" (formato exato, sem CPF/nome/e-mail)');
ok(/const SEM_LOG = null;/.test(src), 'SEM_LOG continua nulo');
// nenhuma outra página/lib manda dados de candidato ao log
const nc = fs.readFileSync(path.join(__dirname, '..', 'novo-contrato.html'), 'utf8');
const i0 = nc.indexOf('// R32 (M7): candidatos do cadastro'), bloco = nc.slice(i0, nc.indexOf('// R31 (M7): instituições do cadastro e dos contratos anteriores.'));
ok(bloco.length > 500 && !/logAcao|localStorage|location\.|history\./.test(bloco), 'Novo Contrato: o preenchimento por cadastro não usa log, localStorage nem URL');
console.log('OK ' + n + ' verificações');
