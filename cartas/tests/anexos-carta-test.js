// R39 (M16): anexos em cartas — verificações estáticas do SQL/telas e mensagens (sem dependências). Uso: node tests/anexos-carta-test.js
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const root = path.join(__dirname, '..'), rd = f => fs.readFileSync(path.join(root, f), 'utf8');
let n = 0; const ok = (c, m) => { assert(c, m); n++; };
const sql = rd('sql/cr-schema.sql'), i22 = sql.indexOf('-- 22) R39'), sec = sql.slice(i22);
ok(i22 > sql.indexOf('-- 21) R38'), 'seção 22 existe e é a última');
const corpo = nome => { const i = sec.indexOf('create or replace function ' + nome + '('); assert(i >= 0, 'função ausente: ' + nome); return sec.slice(i, sec.indexOf('end $$;', i)); };
for (const f of ['cr_anexo_carta_adicionar', 'cr_anexo_carta_baixar', 'cr_anexo_carta_excluir']) {
  const b = corpo(f); ok(/auth\.uid\(\) is null then raise exception/.test(b) && /security definer set search_path = public/.test(b), f + ': exige login, definer com search_path fixo');
}
ok(/not cr_e_admin\(\) then raise exception/.test(corpo('cr_anexo_carta_excluir')), 'excluir: só administrador');
ok(!/cr_e_admin/.test(corpo('cr_anexo_carta_adicionar')) && !/cr_e_admin/.test(corpo('cr_anexo_carta_baixar')), 'anexar e baixar: qualquer logado (como na R36)');
const add = corpo('cr_anexo_carta_adicionar');
ok(/2097152/.test(add) && />= 10/.test(add) && /'25504446'/.test(add) && /'89504e470d0a1a0a'/.test(add) && /'ffd8ff'/.test(add), 'regras: 2 MB, 10 por carta, tipo pelos bytes (PDF, PNG, JPEG)');
ok(/anonimizado_em is not null then return json_build_object\('erro', 'carta_anonimizada'\)/.test(add) && /sha256\(b\)/.test(add) && /pg_advisory_xact_lock/.test(add), 'regras: carta anonimizada recusa, hash calculado no servidor, trava contra anexos simultâneos (limite não estoura)');
ok(!/p_nome/.test(sec.slice(sec.indexOf('perform cr_log(')).split(';')[0]) && [...sec.matchAll(/perform cr_log\([^;]*;/g)].every(m => !/nome|p_nome/.test(m[0].replace(/'anexou_arquivo'|'excluiu_anexo'/, ''))), 'histórico: só número da carta e categoria, nunca o nome do arquivo');
ok(/cr_anexos_carta_anonimizar_tg after update of anonimizado_em on cr_cartas/.test(sec) && /delete from cr_anexos_carta where carta_id = new\.id/.test(sec), 'anonimizar a carta apaga os anexos');
ok(/references cr_cartas\(id\) on delete cascade/.test(sec), 'apagar a carta apaga os anexos (cascade)');
ok(/revoke all on cr_anexos_carta from anon, authenticated;\s*grant select \(id, carta_id, categoria, nome, tipo, tamanho, hash_sha256, criado_em\) on cr_anexos_carta to authenticated;/.test(sec) && !/grant select[^;]*\bdados\b/.test(sec), 'tabela: só colunas SEM o conteúdo para logado; escrita só pelas funções');
ok(!/to [^;]*\banon\b/.test(sec.replace(/revoke[^;]*;/g, '')), 'anon nunca recebe grant na seção');
ok(rd('tests/sql/rodar-m15.sh').includes('anexos-carta-teste.sql'), 'teste SQL novo está no roteiro de execução');

const sb = { console, document: { getElementById() { return null; }, querySelector() { return null; }, querySelectorAll() { return []; }, addEventListener() {}, readyState: 'complete' }, localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} }, setInterval() {}, clearInterval() {}, setTimeout() {} };
sb.window = sb; vm.createContext(sb); vm.runInContext(rd('assets/cr-utils.js'), sb);
const E = sb.erroAnexo;
ok(/Esta carta já tem 10/.test(E(null, { erro: 'limite' }, 'carta')) && /Este contrato já tem 10/.test(E(null, { erro: 'limite' })), 'mensagem de limite por alvo; sem alvo = contrato (R36 intacta)');
ok(/esta carta/.test(E(null, { erro: 'duplicado' }, 'carta')) && /este contrato/.test(E(null, { erro: 'duplicado' })), 'mensagem de duplicado por alvo');
ok(/Carta anonimizada/.test(E(null, { erro: 'carta_anonimizada' })) && /Contrato anonimizado/.test(E(null, { erro: 'contrato_anonimizado' })), 'anonimizado: carta e contrato');
ok(/R39/.test(E({ code: '42883' }, null, 'carta')) && /R36/.test(E({ code: '42883' })) && /Não encontrad/.test(E(null, { erro: 'carta_nao_encontrada' })), 'mensagem "rode o SQL" cita a rodada certa');
ok(!/segredo/.test(E({ code: 'X', message: 'segredo' }, null, 'carta')), 'erro desconhecido não repete texto do banco');
const ax = rd('anexos.html');
ok(/rpc\(ALVO\.add, \{ \[ALVO\.arg\]: _id/.test(ax) && /from\(ALVO\.tabela\)/.test(ax) && /ALVO\.baixar/.test(ax) && /ALVO\.excluir/.test(ax), 'anexos.html: tudo passa pelo alvo (nada fixo em contrato)');
ok(/cr_anexo_carta_adicionar/.test(ax) && /cr_anexos_carta/.test(ax), 'anexos.html conhece as funções e a tabela de cartas');
ok(/anexos\.html\?carta=/.test(rd('index-cartas.html')) && /carta=/.test(rd('assets/cr-shell.js')), 'index-cartas tem o botão 📎 e o menu destaca Cartas');
console.log('ANEXOS CARTA: ' + n + ' verificações OK');
