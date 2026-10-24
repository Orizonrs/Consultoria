// R42 (6.4): padrão do recesso = 30 dias (Art. 13, Lei 11.788), editável; cartas antigas sem o campo continuam em 15. Uso: node tests/recesso-test.js
const fs = require('fs'), path = require('path'), assert = require('assert');
const rd = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8'); let n = 0; const ok = (c, m) => { assert(c, m); n++; };
const nc = rd('nova-carta.html'), vz = rd('visualizar.html');
ok(/id="dias_recesso" value="30" min="1" max="30"/.test(nc), 'campo de dias começa em 30 e continua editável (1 a 30)');
ok(/dias_recesso: parseInt\(v\('dias_recesso'\)\) \|\| 30/.test(nc), 'carta nova grava 30 se o campo ficar vazio');
ok(!/15 dias — Lei 11\.788/.test(nc) && /30 dias \(1 ano ou mais\)/.test(nc), 'cartão do tipo não diz mais 15 dias');
ok(/proporcional se for menor/.test(nc), 'tela avisa da proporcionalidade');
ok(/const dias = d\.dias_recesso \|\| 15;/.test(vz), 'carta já emitida sem o campo continua mostrando 15 (imutável)');
console.log('RECESSO: ' + n + ' verificações OK');
