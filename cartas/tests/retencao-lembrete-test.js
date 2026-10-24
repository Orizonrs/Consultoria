// R43 (M6): lembrete mensal da retenção — verificações estáticas (sem dependências). Uso: node tests/retencao-lembrete-test.js
const fs = require('fs'), path = require('path'), assert = require('assert');
const cfg = fs.readFileSync(path.join(__dirname, '..', 'configuracoes.html'), 'utf8'); let n = 0; const ok = (c, m) => { assert(c, m); n++; };
const ut = fs.readFileSync(path.join(__dirname, '..', 'assets', 'cr-utils.js'), 'utf8');
// R44: a regra do lembrete passou para cr-utils.js (Configurações e Painel Geral usam a mesma)
const f = ut.slice(ut.indexOf('window.RET_LEMBRETE_DIAS'), ut.indexOf('window.retLembreteBuscar') + 700);
ok(/from\('cr_log'\)\.select\('criado_em'\)\.eq\('acao', 'retencao_aplicada'\)/.test(f), 'lê só a data da última "retencao_aplicada"');
ok(/order\('criado_em', \{ ascending: false \}\)\.limit\(1\)/.test(f), 'pega só o registro mais recente');
ok(/if \(error \|\| !Array\.isArray\(data\)\) return null;/.test(f), 'erro ao ler => esconde (não inventa)');
ok(!/\.(insert|update|upsert|delete)\(|rpc\(/.test(f), 'o lembrete só lê: nenhuma escrita nem rpc');
ok(/if \(adm\) await retLembrete\(\);/.test(cfg), 'só administrador consulta');
ok(/RET_LEMBRETE_DIAS = 30/.test(ut) && /dias >= L/.test(ut), 'limite de 30 dias, inclusivo');
ok(!/function textoLembrete|RET_LEMBRETE_DIAS = 30/.test(cfg), 'configuracoes.html não tem cópia da regra');
console.log('RETENCAO LEMBRETE (estático): ' + n + ' verificações OK');
