// R45: avisos de coerência do recesso — verificações estáticas (sem dependências). Uso: node tests/recesso-aviso-test.js
const fs = require('fs'), path = require('path'), assert = require('assert');
const rd = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8'); let n = 0; const ok = (c, m) => { assert(c, m); n++; };
const ut = rd('assets/cr-utils.js'), nc = rd('nova-carta.html');
const f = ut.slice(ut.indexOf('window.recessoAvisos'), ut.indexOf('// R43/R44 (M6)'));
ok(/dias >= 1 && corr !== dias/.test(f), 'avisa quando os dias corridos diferem do campo');
ok(/rf < ri/.test(f), 'avisa fim antes do início');
ok(/ri < pi/.test(f) && /rf > pf/.test(f), 'avisa recesso fora do contrato');
ok(!/\b(30|15|365|2\.5)\b/.test(f.replace(/86400000/g, '')), 'a regra não embute número da lei (não interpreta)');
ok(/id="recessoAviso"[^>]*role="status"[^>]*display:none/.test(nc), 'faixa nasce escondida e é anunciada (role=status)');
ok(/box\.textContent = '⚠️ '/.test(nc) && !/recessoAviso[\s\S]{0,400}innerHTML/.test(nc.slice(nc.indexOf('function atualizarAvisoRecesso'), nc.indexOf('function schedulePreview'))), 'texto puro');
ok(/function schedulePreview\(\) \{\s*atualizarAvisoRecesso\(\);/.test(nc), 'toda mudança de campo reavalia');
const a = nc.slice(nc.indexOf('function atualizarAvisoRecesso'), nc.indexOf('function schedulePreview'));
ok(/_tipo !== 'carta_recesso' && _tipo !== 'carta_cancelamento'/.test(a), 'só nos tipos que têm o bloco de recesso');
ok(!/dias_recesso'\)\.value\s*=|disabled|preventDefault/.test(a), 'só avisa: não muda o número nem bloqueia');
console.log('RECESSO AVISO (estático): ' + n + ' verificações OK');
