// R35 (M10): modelos editáveis — verificações estáticas do SQL/telas e funções puras (sem dependências). Uso: node tests/modelos-test.js
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const root = path.join(__dirname, '..'), rd = f => fs.readFileSync(path.join(root, f), 'utf8');
let n = 0; const ok = (c, m) => { assert(c, m); n++; };
const sql = rd('sql/cr-schema.sql'), sec = sql.slice(sql.indexOf('-- 18) R35'), sql.indexOf('-- 19) R36') > 0 ? sql.indexOf('-- 19) R36') : undefined);
ok(sec.length > 1000, 'seção 18 existe no SQL');
const corpo = nome => { const i = sec.indexOf('create or replace function ' + nome + '('); assert(i >= 0, 'função ausente: ' + nome); return sec.slice(i, sec.indexOf('end $$;', i)); };

// ── SQL ──
for (const f of ['cr_modelo_publicar', 'cr_modelo_ativar']) {
  const b = corpo(f);
  ok(/auth\.uid\(\) is null then raise exception/.test(b), f + ': exige login');
  ok(/not cr_e_admin\(\) then raise exception/.test(b), f + ': exige administrador');
  ok(/security definer set search_path = public/.test(b), f + ': definer com search_path fixo');
  ok(/pg_advisory_xact_lock/.test(b), f + ': trava contra publicação simultânea');
}
ok(/\\\{\\\{\(apolice\|numero\|empresa\|agencia\)\\\}\\\}/.test(corpo('cr_modelo_validar')), 'variáveis permitidas: só apolice, numero, empresa, agencia');
ok(!/cpf|nome_candidato|email/i.test(corpo('cr_modelo_validar')), 'validação não menciona dado pessoal');
const logs = [...sec.matchAll(/perform cr_log\([\s\S]*?\);/g)].map(m => m[0]);
ok(logs.length === 2 && logs.every(l => !/p_texto|texto/.test(l)), 'o histórico recebe só chave e número da versão, nunca o texto');
ok(/create trigger cr_modelo_snapshot_tg before insert on cr_contratos/.test(sec) && /new\.modelo_clausulas_texto := null/.test(corpo('cr_modelo_snapshot')), 'servidor ZERA o que o app mandar e copia a versão ativa');
ok(/contrato_origem_id is not null/.test(corpo('cr_modelo_snapshot')), 'movimento herda do contrato de origem');
ok(/create trigger cr_modelo_snapshot_trava_tg before update on cr_contratos/.test(sec), 'cópia travada contra alteração');
ok(/create trigger cr_modelos_imutavel_tg before update or delete on cr_modelos/.test(sec), 'versões imutáveis e sem exclusão');
ok(/revoke all on cr_modelos from anon, authenticated;\s*grant select on cr_modelos to authenticated;/.test(sec), 'tabela: só leitura para logado; escrita só pelas funções');
ok(!/to [^;]*\banon\b/.test(sec.replace(/revoke[^;]*;/g, '')), 'anon nunca recebe grant na seção');
ok(/insert into cr_modelos[\s\S]*where not exists \(select 1 from cr_modelos where chave = 'clausulas_tce'\)/.test(sec), 'versão 1 (texto antigo) entra só se não houver nenhuma versão');
// o texto da v1 é o mesmo que estava fixo em visualizar-assinado.html (contratos antigos e novos mostram a mesma coisa)
const v1 = sec.slice(sec.indexOf('$tx$') + 4, sec.indexOf('$tx$', sec.indexOf('$tx$') + 4));
const fixo = rd('visualizar-assinado.html'); const iFixo = fixo.indexOf('const clausulasFixas');
const trechoFixo = fixo.slice(iFixo, fixo.indexOf('`;', iFixo));
const norm = x => x.replace(/<\/?p[^>]*>/g, '').replace(/<\/?strong>/g, '**').replace(/\$\{c\.apolice_seguro \|\| '—'\}/g, '{{apolice}}').replace(/\s+/g, ' ').trim();
ok(norm(v1) === norm(trechoFixo.slice(trechoFixo.indexOf('<p'))), 'versão 1 do modelo = texto que era fixo no código');

// ── funções puras do cliente ──
const sb = { console, document: { getElementById() { return null; }, querySelector() { return null; }, querySelectorAll() { return []; }, addEventListener() {}, readyState: 'complete' }, localStorage: { getItem() { return null; }, setItem() {}, removeItem() {}, length: 0 }, navigator: {}, setInterval() {}, clearInterval() {}, setTimeout() {} };
sb.window = sb; vm.createContext(sb); vm.runInContext(rd('assets/cr-utils.js'), sb);
const val = sb.modeloValidar, ren = sb.modeloRenderizar, err = sb.erroModelo, X = 'a'.repeat(60);
ok(val('curto') === 'curto' && val(null) === 'curto' && val(undefined) === 'curto', 'validar: curto/nulo');
ok(val('a'.repeat(20001)) === 'longo' && val('a'.repeat(20000)) === null, 'validar: limite 20000');
ok(val(X + '{{cpf}}') === 'variavel_invalida' && val(X + '{{apolice') === 'variavel_invalida' && val(X + '{{ apolice }}') === 'variavel_invalida' && val(X + 'apolice}}') === 'variavel_invalida', 'validar: variável fora da lista / mal escrita');
ok(val(X + '{{apolice}}{{numero}}{{empresa}}{{agencia}}') === null, 'validar: 4 variáveis permitidas');
for (const [t, esperado] of [['curto', 'curto'], [X + '{{cpf}}', 'variavel_invalida'], ['a'.repeat(20001), 'longo']]) ok(val(t) === esperado, 'espelho do servidor: ' + esperado);
ok(ren('**Cláusula 1ª:** Texto {{apolice}}.\n\nSegundo parágrafo.', { apolice: '123' }) === '<p style="margin-bottom:7px"><strong>Cláusula 1ª:</strong> Texto 123.</p><p style="margin-bottom:7px">Segundo parágrafo.</p>', 'renderizar: parágrafos, negrito e variável');
ok(ren('<img src=x onerror=alert(1)> {{empresa}}', { empresa: '<script>x</script>' }).indexOf('<img') < 0 && ren('{{empresa}}', { empresa: '<script>x</script>' }).indexOf('<script') < 0, 'renderizar: HTML do texto e do valor é escapado (sem XSS)');
ok(/—/.test(ren('{{apolice}}', {})) && /—/.test(ren('{{apolice}}', { apolice: '' })) && /—/.test(ren('{{apolice}}', { apolice: null })), 'renderizar: variável vazia vira traço');
ok(ren('{{cpf}}', { cpf: '123' }).indexOf('123') < 0 && /\{\{cpf\}\}/.test(ren('{{cpf}}', { cpf: '123' })), 'renderizar: variável desconhecida NÃO é trocada (não vaza dado pessoal)');
ok(ren('{{apolice}}', { apolice: '**x**' }).indexOf('<strong>') < 0, 'renderizar: valor com ** não vira negrito');
ok(ren('linha1\nlinha2').indexOf('<br/>') > 0 && ren('   ') === '' && ren(null) === '', 'renderizar: quebra simples vira <br/>, vazio vira vazio');
ok(/rode sql\/cr-schema\.sql \(R35\)/.test(err({ code: '42883' })) && /administradores/.test(err({ code: '42501' })) && /igual/.test(err(null, { erro: 'igual_a_ativa' })) && !/42501|stack/.test(err({ code: 'X', message: 'segredo' })) && !/segredo/.test(err({ code: 'X', message: 'segredo' })), 'mensagens de erro (sem repetir texto do banco)');

// ── telas ──
const cfg = rd('configuracoes.html');
ok(/data-p="mod"/.test(cfg) && /id="p-mod"/.test(cfg), 'configuracoes: aba Modelos');
ok(/rpc\('cr_modelo_publicar'/.test(cfg) && /rpc\('cr_modelo_ativar'/.test(cfg) && /exigirAdmin\('publicar modelos'\)/.test(cfg) && /exigirAdmin\('ativar modelos'\)/.test(cfg), 'configuracoes: publicar/ativar passam pelo perfil e pelo servidor');
ok(/confirm\('Publicar como NOVA versão/.test(cfg) && /confirm\('Tornar a versão/.test(cfg), 'configuracoes: confirmação antes de publicar e de ativar');
const va = rd('visualizar-assinado.html');
ok(/c\.modelo_clausulas_texto\s*\?\s*window\.modeloRenderizar/.test(va) && /: clausulasFixas/.test(va), 'visualizar-assinado: usa a cópia do contrato e cai no texto fixo se não houver');
ok(/publicou_modelo/.test(rd('historico.html')) && /ativou_modelo/.test(rd('historico.html')), 'historico: rótulos');
console.log('MODELOS: ' + n + ' verificações OK');
