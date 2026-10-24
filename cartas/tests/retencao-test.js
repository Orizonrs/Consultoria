// R34 (M6): retenção e titular — verificações estáticas do SQL/tela e funções puras (sem dependências). Uso: node tests/retencao-test.js
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const root = path.join(__dirname, '..'), rd = f => fs.readFileSync(path.join(root, f), 'utf8');
let n = 0; const ok = (c, m) => { assert(c, m); n++; };
const sql = rd('sql/cr-schema.sql'), cfg = rd('configuracoes.html');
const sec = sql.slice(sql.indexOf('-- 17) R34'), sql.indexOf('-- 18) R35'));  // R35: a seção 17 termina onde começa a 18
const corpo = nome => { const i = sec.indexOf('create or replace function ' + nome + '('); assert(i >= 0, 'função ausente: ' + nome); const j = sec.indexOf('end $$;', i); return sec.slice(i, j); };

// ── SQL: toda função de retenção/titular é só admin, com login, e não vaza dado pessoal ──
for (const f of ['cr_retencao_resumo', 'cr_retencao_aplicar', 'cr_titular_buscar', 'cr_titular_anonimizar']) {
  const b = corpo(f);
  ok(/auth\.uid\(\) is null then raise exception/.test(b), f + ': exige login');
  ok(/not cr_e_admin\(\) then raise exception 'somente administradores'/.test(b), f + ': exige administrador');
  ok(/security definer set search_path = public/.test(b), f + ': definer com search_path fixo');
}
ok(/p_meses < 6 or p_meses > 240/.test(corpo('cr_retencao_resumo')) && /p_meses < 6 or p_meses > 240/.test(corpo('cr_retencao_aplicar')), 'prazo 6 a 240 meses validado no servidor (resumo e aplicar)');
ok(/status in \('assinado', 'cancelado'\)/.test(corpo('cr_contratos_retencao')) && !/'enviado'|'parcial'/.test(corpo('cr_contratos_retencao').split('not exists')[0]), 'só contratos terminados entram na retenção');
ok(/greatest\(c\.periodo_fim::timestamptz, coalesce\(c\.atualizado_em, c\.criado_em\)\)/.test(corpo('cr_ref_retencao')), 'data de referência = a mais recente entre fim do período e última alteração');
ok(/f\.status not in \('assinado', 'cancelado'\)/.test(corpo('cr_contratos_retencao')), 'movimento em andamento segura o contrato original');
const logs = [...sec.matchAll(/perform cr_log\([\s\S]*?\);/g)].map(m => m[0]);
ok(logs.length === 2, 'exatamente 2 chamadas de cr_log na seção (retenção e titular)');
ok(logs.every(l => !/cpf|nome|email|p_cpf|\bd\b/i.test(l.replace(/'(retencao_aplicada|titular_anonimizado|retencao|titular)'/g, ''))), 'o log recebe só contagens (RN-10): sem cpf, nome, e-mail nem o CPF digitado');
ok(/grant execute on function cr_retencao_resumo\(int\), cr_retencao_aplicar\(int\), cr_titular_buscar\(text\), cr_titular_anonimizar\(text\) to authenticated;/.test(sec) && !/to [^;]*anon/.test(sec.slice(sec.indexOf('revoke all on function cr_ref_retencao'))), 'só authenticated executa; anon nunca recebe grant');
ok(/revoke all on function cr_ref_retencao\(cr_contratos\), cr_contratos_retencao\(int\)/.test(sec), 'funções internas sem permissão para ninguém');
ok(/delete from cr_candidatos where cpf = d/.test(corpo('cr_titular_anonimizar')), 'pedido do titular EXCLUI o cadastro de candidato');
ok(/papel = 'candidato'/.test(corpo('cr_titular_anonimizar')), 'pedido do titular só anonimiza o signatário candidato (não os outros do contrato)');
ok(/contrato de origem anonimizado/.test(sec) && /before insert on cr_contratos/.test(sec), 'não nasce movimento de contrato anonimizado');
ok(!/delete from cr_contratos|delete from cr_signatarios|delete from cr_auditoria|delete from cr_cartas\b/.test(sec), 'nada de contrato, assinatura, auditoria ou carta é APAGADO: só anonimizado');

// ── Tela ──
const bloco = cfg.slice(cfg.indexOf('// ── Privacidade / LGPD (R34'), cfg.indexOf('async function carregarPerfis'));
ok(bloco.length > 1500, 'bloco LGPD encontrado na tela');
ok((bloco.match(/exigirAdmin\(/g) || []).length === 4, 'as 4 ações (ver, aplicar, buscar, aplicar titular) pedem perfil de admin antes');
ok(/_retVisto !== n/.test(bloco) && /_titVisto !== cpf\.replace/.test(bloco), 'aplicar só depois de ver/buscar com o MESMO prazo/CPF');
ok((bloco.match(/confirm\(/g) || []).length === 2, 'os dois aplicar pedem confirmação');
ok(!/logAcao/.test(bloco), 'a tela NÃO chama logAcao (o servidor já registra; evita linha duplicada e dado a mais)');
const semTexto = bloco.replace(/'(?:[^'\\\n]|\\.)*'/g, "''");  // tira os textos entre aspas: o que importa é o IDENTIFICADOR cpf
ok(!/(console\.[a-z]+|toast)\([^)]*\bcpf\b/.test(semTexto), 'o CPF nunca vai para console nem para toast');
ok(!/textContent = [^;]*\bcpf\b/.test(bloco.replace(/_titVisto = cpf/g, '')), 'o CPF não é escrito de volta na tela');
ok(!/localStorage|sessionStorage|location\.(search|hash)|history\./.test(bloco), 'o CPF não vai para armazenamento do navegador nem URL (RN-10)');
ok(/data-p="lgpd"/.test(cfg) && /id="p-lgpd"/.test(cfg), 'aba Privacidade (LGPD) existe');
ok(/vazio|Somente administradores usam esta aba/.test(cfg), 'operador vê só o aviso');
ok(/não dá para desfazer|Não dá para desfazer/.test(cfg) && /backup/.test(cfg), 'a tela avisa: irreversível e faça backup');
ok(/confirme com o jurídico/.test(cfg), 'a tela NÃO decide o prazo legal: manda confirmar com o jurídico');
ok(/retencao_aplicada/.test(rd('historico.html')) && /titular_anonimizado/.test(rd('historico.html')), 'histórico rotula as duas ações');
ok(/c\.anonimizado_em/.test(rd('visualizar-assinado.html')), 'contrato anonimizado mostra aviso na visualização');

// ── Funções puras ──
const sb = { console, setInterval() {}, clearInterval() {}, setTimeout() {}, localStorage: { length: 0, getItem() { return null }, setItem() {}, removeItem() {} },
  document: { getElementById() { return null }, querySelector() { return null }, querySelectorAll() { return [] }, addEventListener() {}, readyState: 'complete' }, navigator: {}, location: { origin: 'http://x', pathname: '/' } };
sb.window = sb; vm.createContext(sb);
['cr-config.js', 'cr-utils.js'].forEach(f => vm.runInContext(rd('assets/' + f), sb));
const E = sb.erroRetencao;
ok(/6 e 240/.test(E(null, { erro: 'meses_invalido' })) && /CPF inválido/.test(E(null, { erro: 'cpf_invalido' })), 'erroRetencao: prazo e CPF');
ok(/administradores/.test(E({ code: '42501' })) && /R34/.test(E({ code: '42883' })) && /R34/.test(E({ code: 'PGRST202' })) && /R34/.test(E({ code: '42P01' })), 'erroRetencao: permissão e SQL ainda não rodado');
ok(typeof E({ code: 'x' }) === 'string' && E(undefined, undefined).length > 10, 'erroRetencao: código desconhecido/vazio não quebra');
ok(!/\d{3}\.?\d{3}\.?\d{3}-?\d{2}/.test(E({ code: '23514', message: 'CPF 529.982.247-25' }, { erro: 'cpf_invalido' })), 'erroRetencao nunca repete CPF');
console.log('RETENCAO TESTE: ' + n + ' verificações OK');
