// R40 (M6 + M16): contagem de anexos na retenção LGPD e no pedido do titular — verificações estáticas do SQL e da tela (sem dependências). Uso: node tests/retencao-anexos-test.js
const fs = require('fs'), path = require('path'), assert = require('assert');
const root = path.join(__dirname, '..'), rd = f => fs.readFileSync(path.join(root, f), 'utf8');
let n = 0; const ok = (c, m) => { assert(c, m); n++; };
const sql = rd('sql/cr-schema.sql'), cfg = rd('configuracoes.html');
const corpo = nome => { const i = sql.indexOf('create or replace function ' + nome + '('); assert(i >= 0, 'função ausente: ' + nome); return sql.slice(i, sql.indexOf('end $$;', i)); };

// ── SQL ──
const cont = corpo('cr_contar_anexos');
ok(/security definer set search_path = public/.test(cont), 'cr_contar_anexos: definer com search_path fixo');
ok(/to_regclass\('public\.cr_anexos'\) is not null/.test(cont) && /to_regclass\('public\.cr_anexos_carta'\) is not null/.test(cont), 'cr_contar_anexos: só conta se a tabela existe (SQL antigo => nulo, não 0)');
ok(/execute 'select count\(\*\) from cr_anexos where contrato_id = any\(\$1\)'/.test(cont) && /execute 'select count\(\*\) from cr_anexos_carta where carta_id = any\(\$1\)'/.test(cont), 'cr_contar_anexos: SQL dinâmico (não quebra na criação se a tabela não existe)');
ok(/revoke all on function [^;]*cr_contar_anexos\(bigint\[\], bigint\[\]\)[^;]* from public;/.test(sql), 'cr_contar_anexos: sem permissão para ninguém');
ok(!/grant execute on function [^;]*cr_contar_anexos/.test(sql), 'cr_contar_anexos: nunca recebe grant');
ok(/'anexos_contratos'/.test(corpo('cr_retencao_resumo')) && /'anexos_cartas'/.test(corpo('cr_retencao_resumo')), 'resumo devolve as duas contagens');
for (const f of ['cr_retencao_aplicar', 'cr_titular_anonimizar']) {
  const b = corpo(f), iAx = b.indexOf('ax := cr_contar_anexos'), iUp = b.search(/update cr_contratos|update cr_cartas/);
  ok(iAx > 0 && iUp > 0 && iAx < iUp, f + ': conta os anexos ANTES de anonimizar (o gatilho apaga depois)');
  ok(/'anexos_contratos'/.test(b) && /'anexos_cartas'/.test(b), f + ': devolve as contagens');
  ok(/anexos de contratos, .*anexos de cartas apagados/.test(b.replace(/\n/g, ' ')), f + ': o histórico registra só as contagens');
}
ok(/'anexos_contratos'/.test(corpo('cr_titular_buscar')) && /status in \('assinado', 'cancelado'\)/.test(corpo('cr_titular_buscar').split('ax := cr_contar_anexos')[1].split('return json_build_object')[0]), 'titular buscar: só conta anexos de contrato TERMINADO');
ok(!/nome_arquivo|arquivo_nome/.test(corpo('cr_retencao_aplicar') + corpo('cr_titular_anonimizar') + cont), 'nenhuma função toca o nome do arquivo');

// ── Tela ──
ok(/function linhaAnexos\(d, ant\)/.test(cfg) && /c == null && k == null\) return ''/.test(cfg), 'tela: campo ausente/nulo não mostra número');
ok((cfg.match(/linhaAnexos\(data, true\)/g) || []).length === 2 && (cfg.match(/linhaAnexos\(data, false\)/g) || []).length === 2, 'tela: 2 usos "antes" (retenção e titular) e 2 "depois"');
ok(/não dá para recuperar/.test(cfg), 'tela: avisa que anexo apagado não se recupera');
console.log('RETENCAO ANEXOS (estático): ' + n + ' verificações OK');
