// R37 (M3): regras puras do OTP (assets/cr-otp.js) + verificações estáticas do SQL e das ligações das telas. Sem dependências: node tests/otp-test.js
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const root = path.join(__dirname, '..'), rd = f => fs.readFileSync(path.join(root, f), 'utf8');
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; console.log('OK    ', m); };
const sb = { console }; sb.window = sb; vm.createContext(sb); vm.runInContext(rd('assets/cr-otp.js'), sb);

ok(sb.otpLimpar('123 456') === '123456' && sb.otpLimpar('123-456') === '123456' && sb.otpLimpar(' 12a3b456789 ') === '123456', 'otpLimpar: só dígitos, no máximo 6');
ok(sb.otpLimpar(null) === '' && sb.otpLimpar(undefined) === '' && sb.otpLimpar(123456) === '123456', 'otpLimpar: nulo e número');
ok(sb.otpCodigoValido('12345') === '' && sb.otpCodigoValido('123456') === '123456' && sb.otpCodigoValido('12 34 56') === '123456' && sb.otpCodigoValido('abcdef') === '', 'otpCodigoValido: exatamente 6 dígitos');
ok(sb.otpCodigoValido('000000') === '000000' && sb.otpExibir('012345') === '012 345' && sb.otpExibir('12') === '12', 'zeros à esquerda preservados; exibição 3+3');

ok(/Restam 4 tentativas/.test(sb.erroOtp('codigo_invalido', 4)) && /Resta 1 tentativa\./.test(sb.erroOtp('codigo_invalido', 1)) && sb.erroOtp('codigo_invalido', 0) === 'Código incorreto.' && sb.erroOtp('codigo_invalido') === 'Código incorreto.', 'erroOtp: restantes no plural, singular, zero e ausente');
['codigo_ausente', 'codigo_bloqueado', 'codigo_expirado', 'codigo_nao_emitido', 'aguardando_vez', 'cancelado', 'ja_assinado', 'minutos_invalido', 'link_vencido'].forEach(k =>
  ok(sb.erroOtp(k).length > 10 && !/\bundefined\b/.test(sb.erroOtp(k)), 'erroOtp tem texto para ' + k));
ok(/Não foi possível/.test(sb.erroOtp('qualquer_coisa')) && !/qualquer_coisa/.test(sb.erroOtp('qualquer_coisa')), 'erro desconhecido não vaza o código interno');
ok(/rode sql\/cr-schema\.sql \(R37\)/.test(sb.erroOtpRede({ code: 'PGRST202' })) && /rode sql\/cr-schema\.sql \(R37\)/.test(sb.erroOtpRede({ message: 'function cr_otp_emitir does not exist' })) && /Sem permissão/.test(sb.erroOtpRede({ code: '42501' })), 'erroOtpRede: função ausente e sem permissão');
['codigo_bloqueado', 'codigo_expirado', 'codigo_nao_emitido'].forEach(k => ok(/Orizon/.test(sb.erroOtp(k)), 'a mensagem de ' + k + ' diz a quem pedir (Orizon)'));

const agora = '2026-10-23T12:00:00Z', mais = m => new Date(Date.parse(agora) + m * 60000).toISOString();
let e = sb.otpEstado({ otp_exigido: false }, agora);
ok(!e.exigido && e.estado === 'desligado' && /só o link/i.test(e.rotulo), 'estado: desligado');
e = sb.otpEstado({ otp_exigido: true }, agora);
ok(e.exigido && e.estado === 'a_emitir' && e.cls === 'tag-orange', 'estado: exigido e ainda não gerado');
e = sb.otpEstado({ otp_exigido: true, otp_emitido_em: mais(-5), otp_expira_em: mais(55), otp_tentativas: 0 }, agora);
ok(e.estado === 'valido' && e.cls === 'tag-green' && /vale até/.test(e.rotulo) && !/erro/.test(e.rotulo), 'estado: válido');
e = sb.otpEstado({ otp_exigido: true, otp_emitido_em: mais(-5), otp_expira_em: mais(55), otp_tentativas: 2 }, agora);
ok(e.estado === 'valido' && /2 erro/.test(e.rotulo), 'estado: válido mostra os erros');
e = sb.otpEstado({ otp_exigido: true, otp_emitido_em: mais(-90), otp_expira_em: mais(-30), otp_tentativas: 0 }, agora);
ok(e.estado === 'expirado' && e.cls === 'tag-red', 'estado: vencido');
e = sb.otpEstado({ otp_exigido: true, otp_emitido_em: mais(-5), otp_expira_em: mais(55), otp_tentativas: 5 }, agora);
ok(e.estado === 'bloqueado' && e.cls === 'tag-red', 'estado: bloqueado (5 erros) vence a validade');
ok(sb.otpEstado(null, agora).estado === 'desligado', 'estado: linha nula não quebra');

const msg = sb.otpMensagem({ nome: 'Ana' }, 'TCE — Ana', '012345', mais(60));
ok(/Ana/.test(msg) && /012 345/.test(msg) && /vale até/.test(msg) && /Não compartilhe/.test(msg), 'mensagem: nome, código, validade e aviso');
ok(!/https?:|assinar-contrato|\?t=/.test(msg), 'mensagem: sem link (o código vai por outro canal)');
ok(sb.OTP_PRAZOS.every(p => p[0] >= 5 && p[0] <= 1440) && sb.OTP_PRAZOS.some(p => p[0] === 60), 'prazos oferecidos cabem nos limites do servidor (5 a 1440) e incluem 1 hora');
ok(sb.OTP_TENTATIVAS_MAX === 5, 'limite de erros do cliente = 5 (o servidor decide)');

const sql = rd('sql/cr-schema.sql'), s20 = sql.slice(sql.indexOf('-- 20) R37'), sql.indexOf('-- 21) R38'));
ok(s20.length > 3000 && sql.indexOf('-- 20) R37') > sql.indexOf('-- 19) R36'), 'seção 20 existe (a 21 vem depois)');
ok(/gen_random_uuid\(\)/.test(s20) && !/\brandom\s*\(/.test(s20), 'código sorteado com gen_random_uuid (não com random())');
ok(/% 1000000/.test(s20) && /lpad\(/.test(s20), 'código de 6 dígitos com zeros à esquerda');
ok(/encode\(sha256\(/.test(s20) && !/hash\s*=\s*v_cod\b|values \(s\.id, v_cod/.test(s20), 'só o hash é guardado');
const logs = [...s20.matchAll(/perform cr_log\([^;]*;/g)].map(m => m[0]);
ok(logs.length === 2 && logs.every(l => !/v_cod|codigo|p_codigo/.test(l)), 'histórico (cr_log): 2 chamadas, nenhuma com o código');
const auds = [...s20.matchAll(/insert into cr_auditoria[\s\S]*?;/g)].map(m => m[0]);
ok(auds.length === 4 && auds.every(a => !/v_cod|p_codigo/.test(a)), 'trilha (cr_auditoria) na seção 20: 4 inserts, nenhum leva o código');
const ass = sql.slice(sql.indexOf('create or replace function cr_assinar('), sql.indexOf('create or replace function cr_recusar('));
ok((ass.match(/insert into cr_auditoria[\s\S]*?;/g) || []).every(a => !/p_codigo|v_otp/.test(a)), 'trilha em cr_assinar: nenhum insert leva o código');
ok(/revoke all on function cr_otp_conferir\(bigint, text\), cr_otp_validar\(text, text\), cr_otp_definir\(bigint, boolean\), cr_otp_emitir\(bigint, int\) from public/.test(s20), 'revoga de public as 4 funções');
ok(/grant execute on function cr_otp_validar\(text, text\) to anon, authenticated/.test(s20) && /grant execute on function cr_otp_definir\(bigint, boolean\), cr_otp_emitir\(bigint, int\) to authenticated;/.test(s20), 'anon só valida; emitir e ligar só logado');
ok(!/cr_otp_conferir[^;]*to (anon|authenticated)/.test(s20), 'função interna sem grant');
ok(/revoke all on cr_otp_codigos from anon, authenticated/.test(s20) && !/grant select[^;]*cr_otp_codigos/.test(sql), 'tabela do hash sem leitura para ninguém');
ok(/otp_tentativas >= 5/.test(s20) && /otp_expira_em < now\(\)/.test(s20), 'limite de 5 erros e validade conferidos no servidor');
ok(/p_minutos < 5 or p_minutos > 1440/.test(s20), 'validade limitada a 5..1440 minutos');
ok(/drop function if exists cr_assinar\(text, text\);/.test(sql) && /cr_assinar\(p_token text, p_img text, p_codigo text default null\)/.test(sql), 'cr_assinar ganhou p_codigo (default nulo) e a versão antiga é removida');
ok(/cr_assinar\(text, text, text\), cr_recusar/.test(sql) && !/cr_assinar\(text, text\)[^)]*to anon/.test(sql), 'grants de cr_assinar na assinatura nova');
ok(/v_otp := cr_otp_conferir\(s\.id, p_codigo\)/.test(sql) && sql.indexOf('v_otp := cr_otp_conferir') < sql.indexOf("encode(sha256(convert_to(to_jsonb(c)::text"), 'cr_assinar confere o código ANTES de calcular o hash e assinar');
ok(/delete from cr_otp_codigos where signatario_id = s\.id;\s*-- código de uso único/.test(sql), 'código de uso único (apagado ao assinar)');
ok((sql.match(/delete from cr_otp_codigos where signatario_id = s\.id/g) || []).length >= 4, 'link novo, reabrir, dispensar e assinar apagam o código');
ok(/'otp', case when s\.otp_exigido then json_build_object\('exigido', true,/.test(sql) && !/hash/.test(sql.slice(sql.indexOf("'otp', case"), sql.indexOf("'otp', case") + 600)), 'cr_ler_por_token devolve só o estado do código');
ok(/add column if not exists otp_exigido boolean not null default false/.test(sql), 'padrão: ninguém exige código (nada muda sem ligar)');

const assH = rd('assinar-contrato.html'), idx = rd('index-contratos.html'), nov = rd('novo-contrato.html'), hist = rd('historico.html'), vis = rd('visualizar-assinado.html');
ok(/src="assets\/cr-otp\.js"/.test(assH) && /src="assets\/cr-otp\.js"/.test(idx), 'páginas carregam assets/cr-otp.js');
ok(/_codigo \? \{ p_codigo: _codigo \} : \{\}/.test(assH), 'assinar só envia p_codigo quando há código (funciona sem o SQL da R37 em contrato sem OTP)');
ok(/cr_otp_validar/.test(assH) && /id="sigBox"/.test(assH), 'tela pública valida o código antes de mostrar a assinatura');
ok(/autocomplete="one-time-code"/.test(assH) && /inputmode="numeric"/.test(assH), 'campo do código: teclado numérico e preenchimento automático');
const blocoIdx = idx.slice(idx.indexOf('function otpBloco'), idx.indexOf('async function otpDispensar') + 600);
ok(!/localStorage|sessionStorage/.test(blocoIdx), 'painel não guarda o código em localStorage/sessionStorage (só em memória)');
ok(/function closeModal\(\) \{ window\._otpUltimo = null;/.test(idx), 'fechar o painel de links apaga o código da memória');
ok(!/console\.(log|info|warn|error)\([^)]*codigo/i.test(rd('assets/cr-otp.js') + blocoIdx), 'nenhum console.* imprime o código');
ok(/id="exigirOtp"/.test(nov) && /otp_exigido: true/.test(nov) && /'exigirOtp'\]/.test(nov), 'Novo Contrato: opção, envio condicional e rascunho');
ok(/'otp_confirmado'/.test(vis) && /'otp_falhou'/.test(vis) && /'otp_bloqueado'/.test(vis) && /otp_emitido: /.test(hist), 'trilha do PDF e Histórico de acessos reconhecem os eventos de OTP');
ok(/OTP_PADRAO/.test(rd('assets/cr-config.js')), 'cr-config.js tem OTP_PADRAO');
console.log('\nOTP: ' + n + ' verificações OK');
