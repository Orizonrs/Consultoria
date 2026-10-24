// R44 (M6): lembrete da retenção no Painel Geral — verificações estáticas (sem dependências). Uso: node tests/retencao-hub-test.js
const fs = require('fs'), path = require('path'), assert = require('assert');
const rd = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8'); let n = 0; const ok = (c, m) => { assert(c, m); n++; };
const idx = rd('index.html'), cfg = rd('configuracoes.html');
const blk = idx.slice(idx.indexOf('// R44: lembrete mensal'), idx.indexOf('})();', idx.indexOf('// R44: lembrete mensal')));
ok(/await window\.ehAdmin\(\)/.test(blk), 'só administrador consulta');
ok(/r\.vencido/.test(blk), 'só aparece quando vencido');
ok(!/\.(insert|update|upsert|delete)\(|rpc\(|_sb\./.test(blk), 'o Painel Geral não escreve nem acessa o banco direto: usa só retLembreteBuscar');
ok(/textContent\s*=/.test(blk) && !/innerHTML/.test(blk), 'texto entra como texto puro');
ok(/id="hubRetencao"[^>]*style="display:none"/.test(idx), 'a faixa nasce escondida');
ok(/href="configuracoes\.html#privacidade"/.test(idx), 'link leva à aba Privacidade');
ok(/location\.hash === '#privacidade'/.test(cfg) && /data-p="lgpd"/.test(cfg), 'Configurações abre a aba pelo #privacidade');
console.log('RETENCAO HUB (estático): ' + n + ' verificações OK');
