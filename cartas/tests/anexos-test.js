// R36 (M16): anexos — verificações estáticas do SQL/telas e funções puras (sem dependências). Uso: node tests/anexos-test.js
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const root = path.join(__dirname, '..'), rd = f => fs.readFileSync(path.join(root, f), 'utf8');
let n = 0; const ok = (c, m) => { assert(c, m); n++; };
const sql = rd('sql/cr-schema.sql'), sec = sql.slice(sql.indexOf('-- 19) R36'), sql.indexOf('-- 20) R37'));
ok(sec.length > 1000, 'seção 19 existe');
const corpo = nome => { const i = sec.indexOf('create or replace function ' + nome + '('); assert(i >= 0, 'função ausente: ' + nome); return sec.slice(i, sec.indexOf('end $$;', i)); };
for (const f of ['cr_anexo_adicionar', 'cr_anexo_baixar', 'cr_anexo_excluir']) {
  const b = corpo(f);
  ok(/auth\.uid\(\) is null then raise exception/.test(b), f + ': exige login');
}
ok(/security definer set search_path = public/.test(corpo('cr_anexo_adicionar')) && /security definer set search_path = public/.test(corpo('cr_anexo_baixar')) && /security definer set search_path = public/.test(corpo('cr_anexo_excluir')), 'funções definer com search_path fixo');
ok(/not cr_e_admin\(\) then raise exception/.test(corpo('cr_anexo_excluir')), 'excluir só admin');
const add = corpo('cr_anexo_adicionar');
ok(/2097152/.test(add) && />= 10/.test(add) && /sha256\(b\)/.test(add), 'servidor: 2 MB, 10 por contrato, hash SHA-256');
ok(/25504446/.test(add) && /89504e470d0a1a0a/.test(add) && /ffd8ff/.test(add), 'tipo decidido pelos bytes iniciais (PDF, PNG, JPEG)');
const casoTipo = add.split('v_tipo := case')[1].split('else null end;')[0];
ok(!/p_nome|v_nome/.test(casoTipo), 'o tipo não depende do nome do arquivo');
const logs = [...sec.matchAll(/perform cr_log\([\s\S]*?\);/g)].map(m => m[0]);
ok(logs.length === 2 && logs.every(l => !/nome|p_nome|v_nome/.test(l.replace(/numero_contrato|v_num/g, ''))), 'histórico: só número do contrato e categoria, nunca o nome do arquivo');
ok(/grant select \(id, contrato_id, categoria, nome, tipo, tamanho, hash_sha256, criado_em\) on cr_anexos to authenticated/.test(sec) && !/grant select on cr_anexos/.test(sec), 'select só nas colunas de metadados (dados fora)');
ok(/revoke all on cr_anexos from anon, authenticated/.test(sec), 'sem escrita direta');
ok(/after update of anonimizado_em on cr_contratos/.test(sec) && /delete from cr_anexos where contrato_id = new\.id/.test(sec), 'anonimizar o contrato apaga os anexos');
ok(/on delete cascade/.test(sec), 'apagar o contrato leva os anexos');
ok(!/\bto (authenticated, )?anon\b/.test(sec.replace(/revoke all on cr_anexos from anon, authenticated/, '')), 'anon não recebe nenhuma permissão nesta seção');
// funções puras do cliente
const sb = { window: {}, console }; sb.window.window = sb.window; vm.createContext(sb);
const utils = rd('assets/cr-utils.js'); const ini = utils.indexOf('// R36 (M16)');
ok(ini > 0, 'bloco R36 no cr-utils.js');
vm.runInContext(utils.slice(ini), sb);
const W = sb.window;
ok(W.ANEXO_MAX_BYTES === 2097152 && W.ANEXO_MAX_QTD === 10, 'limites do cliente = limites do servidor');
ok(W.anexoValidar({ name: 'a.pdf', size: 10 }) === null && W.anexoValidar({ name: 'A.JPEG', size: 10 }) === null && W.anexoValidar({ name: 'a.png', size: 2097152 }) === null, 'validar: aceita pdf/png/jpeg e 2 MB exatos');
ok(W.anexoValidar({ name: 'a.pdf', size: 0 }) === 'vazio' && W.anexoValidar({ name: 'a.pdf', size: 2097153 }) === 'grande' && W.anexoValidar({ name: 'a.exe', size: 5 }) === 'tipo' && W.anexoValidar({ name: 'pdf', size: 5 }) === 'tipo' && W.anexoValidar(null) === 'vazio', 'validar: vazio, grande, tipo');
ok(W.formatarTamanho(500) === '500 B' && W.formatarTamanho(1500) === '1,5 KB' && W.formatarTamanho(2097152) === '2,0 MB', 'formatarTamanho');
for (const k of ['vazio', 'grande', 'tipo_nao_aceito', 'limite', 'duplicado', 'arquivo_invalido', 'contrato_anonimizado', 'categoria_invalida', 'nao_encontrado']) ok(W.erroAnexo(null, { erro: k }) !== W.erroAnexo(null, { erro: 'zzz' }), 'mensagem própria para ' + k);
ok(/R36/.test(W.erroAnexo({ code: 'PGRST205' })) && /permissão/.test(W.erroAnexo({ code: '42501' })), 'erros de tabela ausente e de permissão');
// telas
const pag = rd('anexos.html');
ok(/cr_anexo_adicionar/.test(pag) && /cr_anexo_baixar/.test(pag) && /cr_anexo_excluir/.test(pag), 'tela usa as 3 funções');
ok(/exigirAdmin\('excluir anexos'\)/.test(pag) && /confirm\(/.test(pag), 'excluir: exige admin e confirma');
ok(!/innerHTML\s*=\s*[^;]*\ba\.nome\b(?![^;]*esc\()/.test(pag) && /esc\(a\.nome\)/.test(pag), 'nome do arquivo sempre escapado');
ok(!/\.select\('\*'\)/.test(pag) && !/\bdados\b/.test(pag.replace(/lerBase64|base64/g, '')), 'a tela nunca seleciona a coluna dados');
ok(!/logAcao/.test(pag), 'a tela não grava log com nome de arquivo (o servidor registra)');
ok(/anexos\.html\?id=/.test(rd('index-contratos.html')) && /anexos\.html\?id=/.test(rd('visualizar-assinado.html')), 'botões 📎 no painel e no PDF');
ok(/anexos\.html/.test(rd('assets/cr-shell.js')), 'menu: anexos.html destaca Contratos');
ok(/anexou_arquivo/.test(rd('historico.html')) && /excluiu_anexo/.test(rd('historico.html')), 'histórico: 2 rótulos novos');
console.log('ANEXOS: ' + n + ' verificações OK');
