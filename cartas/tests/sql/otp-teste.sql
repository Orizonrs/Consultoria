-- R37 (M3): confirmação por código (OTP). Roda DEPOIS do schema. Cada verificação é uma chamada ck(condição, 'rótulo'): falhou = o script para.
\set ON_ERROR_STOP on
set client_min_messages = notice;
truncate cr_signatarios, cr_contratos, cr_auditoria, cr_contadores, cr_log restart identity cascade;
create or replace function pg_temp.ck(b boolean, l text) returns void language plpgsql as $$
begin
  if b is not true then raise exception 'FALHOU [%]', l; end if;
  perform set_config('otp.n', (coalesce(nullif(current_setting('otp.n', true), ''), '0')::int + 1)::text, false);
end $$;
create or replace function pg_temp.outro(c text) returns text language sql as $$ select lpad(((c::int + 1) % 1000000)::text, 6, '0') $$;

do $$
declare cid bigint; cseq bigint; ccan bigint;
  a bigint; b bigint; c bigint; z bigint; d bigint; e bigint; f bigint; g bigint; h bigint; sq1 bigint; sq2 bigint; cn bigint;
  r json; cod text; cod2 text; img text := repeat('A', 200); n int; ids text[]; ok boolean;
begin
  insert into cr_contratos (tipo, numero_contrato, titulo, nome_candidato, status) values ('estagio', 'TCE-OTP-0001', 'TCE — Ana', 'Ana', 'enviado') returning id into cid;
  insert into cr_signatarios (contrato_id, nome, papel, token) values (cid, 'Zeca', 'supervisor', 'z1') returning id into z;
  insert into cr_signatarios (contrato_id, nome, papel, token) values (cid, 'Ana', 'candidato', 'a1') returning id into a;
  insert into cr_signatarios (contrato_id, nome, papel, token) values (cid, 'Beto', 'supervisor', 'b1') returning id into b;
  insert into cr_signatarios (contrato_id, nome, papel, token) values (cid, 'Cida', 'supervisor', 'c1') returning id into c;
  insert into cr_signatarios (contrato_id, nome, papel, token) values (cid, 'Davi', 'supervisor', 'd1') returning id into d;
  insert into cr_signatarios (contrato_id, nome, papel, token) values (cid, 'Eva', 'supervisor', 'e1') returning id into e;
  insert into cr_signatarios (contrato_id, nome, papel, token) values (cid, 'Fabio', 'supervisor', 'f1') returning id into f;
  insert into cr_signatarios (contrato_id, nome, papel, token) values (cid, 'Gabi', 'supervisor', 'g1') returning id into g;
  insert into cr_signatarios (contrato_id, nome, papel, token) values (cid, 'Hugo', 'supervisor', 'h1') returning id into h;

  -- OT1 padrão: sem exigência, nada muda
  r := cr_ler_por_token('z1');
  perform pg_temp.ck((r->'signatario'->'otp'->>'exigido')::boolean is false, 'OT1a padrão não exige');
  r := cr_otp_validar('z1', null);
  perform pg_temp.ck((r->>'ok')::boolean is true and (r->>'exigido')::boolean is false, 'OT1b validar sem exigência = ok');
  r := cr_assinar('z1', img);
  perform pg_temp.ck((r->>'ok')::boolean is true, 'OT1c assina sem código quando não é exigido');
  perform pg_temp.ck(not exists (select 1 from cr_auditoria where evento like 'otp%'), 'OT1d nada de OTP na trilha');
  perform pg_temp.ck((select otp_confirmado_em from cr_signatarios where id = z) is null, 'OT1e sem confirmação registrada');

  -- OT2 sem login: não emite nem liga
  perform set_config('request.jwt.claim.sub', '', false);
  begin perform cr_otp_emitir(a, 60); ok := false; exception when insufficient_privilege then ok := true; end;
  perform pg_temp.ck(ok, 'OT2a visitante não emite');
  begin perform cr_otp_definir(a, true); ok := false; exception when insufficient_privilege then ok := true; end;
  perform pg_temp.ck(ok, 'OT2b visitante não liga');

  -- OT3 emitir (logado)
  perform set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
  r := cr_otp_emitir(a, 60); cod := r->>'codigo';
  perform pg_temp.ck(cod ~ '^[0-9]{6}$' and (r->>'ok')::boolean is true, 'OT3a código de 6 dígitos');
  perform pg_temp.ck((r->>'expira_em')::timestamptz between now() + interval '59 minutes' and now() + interval '61 minutes', 'OT3b validade de 60 min');
  perform pg_temp.ck((select otp_exigido and otp_qtd = 1 and otp_tentativas = 0 from cr_signatarios where id = a), 'OT3c emitir liga a exigência');
  -- OT4 minutos inválidos
  perform pg_temp.ck(cr_otp_emitir(a, 4)->>'erro' = 'minutos_invalido' and cr_otp_emitir(a, 1441)->>'erro' = 'minutos_invalido' and cr_otp_emitir(a, null)->>'erro' = 'minutos_invalido', 'OT4 minutos fora de 5..1440');
  perform pg_temp.ck((select otp_qtd from cr_signatarios where id = a) = 1, 'OT4b erro não gasta emissão');
  -- OT5 o visitante vê o ESTADO, nunca o código nem o hash
  perform set_config('request.jwt.claim.sub', '', false);
  r := cr_ler_por_token('a1');
  perform pg_temp.ck((select array_agg(k order by k) from json_object_keys(r->'signatario'->'otp') k) = array['bloqueado','emitido','exigido','expira_em','expirado','restantes'], 'OT5a só campos de estado');
  perform pg_temp.ck((r->'signatario'->'otp'->>'emitido')::boolean and (r->'signatario'->'otp'->>'restantes')::int = 5 and not (r->'signatario'->'otp'->>'bloqueado')::boolean, 'OT5b estado do código');
  -- OT6 sem código / código errado: não assina; nada muda
  r := cr_assinar('a1', img);
  perform pg_temp.ck(r->>'erro' = 'codigo_ausente' and (select status from cr_signatarios where id = a) = 'pendente' and (select otp_tentativas from cr_signatarios where id = a) = 0, 'OT6a sem código não assina e não conta erro');
  r := cr_assinar('a1', img, '   ');
  perform pg_temp.ck(r->>'erro' = 'codigo_ausente', 'OT6b código em branco = ausente');
  r := cr_assinar('a1', img, pg_temp.outro(cod));
  perform pg_temp.ck(r->>'erro' = 'codigo_invalido' and (r->>'restantes')::int = 4 and (select status from cr_signatarios where id = a) = 'pendente', 'OT6c código errado: erro e restantes 4');
  perform pg_temp.ck((select otp_tentativas from cr_signatarios where id = a) = 1 and (select count(*) from cr_auditoria where evento = 'otp_falhou') = 1, 'OT6d erro contado e na trilha');
  -- OT7 validar
  r := cr_otp_validar('a1', pg_temp.outro(cod));
  perform pg_temp.ck(r->>'erro' = 'codigo_invalido' and (r->>'restantes')::int = 3, 'OT7a validar errado gasta tentativa');
  r := cr_otp_validar('a1', cod);
  perform pg_temp.ck((r->>'ok')::boolean is true and (r->>'exigido')::boolean is true, 'OT7b validar certo');
  perform pg_temp.ck((select otp_tentativas from cr_signatarios where id = a) = 2, 'OT7c acertar não gasta tentativa');
  perform pg_temp.ck(cr_otp_validar('nao-existe', cod)->>'erro' = 'token_invalido', 'OT7d token inválido');
  -- OT8 assinar com o código certo
  r := cr_assinar('a1', img, ' ' || cod || ' ');
  perform pg_temp.ck((r->>'ok')::boolean is true, 'OT8a assina com o código certo');
  perform pg_temp.ck((select status = 'assinado' and otp_confirmado_em is not null from cr_signatarios where id = a), 'OT8b confirmação registrada');
  perform pg_temp.ck(not exists (select 1 from cr_otp_codigos where signatario_id = a), 'OT8c código de uso único (hash apagado)');
  perform pg_temp.ck((select min(id) from cr_auditoria where evento = 'otp_confirmado' and signatario_id = a) < (select min(id) from cr_auditoria where evento = 'assinou' and signatario_id = a), 'OT8d otp_confirmado registrado antes de assinou');
  perform pg_temp.ck(cr_assinar('a1', img, cod)->>'erro' = 'ja_assinado' and cr_otp_validar('a1', cod)->>'erro' = 'ja_assinado', 'OT8e reuso: já assinado');
  -- OT9 bloqueio após 5 erros
  perform set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
  r := cr_otp_emitir(b, 60); cod := r->>'codigo';
  perform set_config('request.jwt.claim.sub', '', false);
  for n in 1..4 loop
    r := cr_assinar('b1', img, pg_temp.outro(cod));
    perform pg_temp.ck(r->>'erro' = 'codigo_invalido' and (r->>'restantes')::int = 5 - n, 'OT9a erro ' || n);
  end loop;
  r := cr_assinar('b1', img, pg_temp.outro(cod));
  perform pg_temp.ck(r->>'erro' = 'codigo_bloqueado' and (r->>'restantes')::int = 0, 'OT9b 5º erro bloqueia');
  perform pg_temp.ck(cr_assinar('b1', img, cod)->>'erro' = 'codigo_bloqueado' and cr_otp_validar('b1', cod)->>'erro' = 'codigo_bloqueado', 'OT9c código certo não destrava');
  perform pg_temp.ck((select count(*) from cr_auditoria where evento = 'otp_falhou' and signatario_id = b) = 5 and (select count(*) from cr_auditoria where evento = 'otp_bloqueado' and signatario_id = b) = 1, 'OT9d trilha: 5 falhas e 1 bloqueio');
  perform pg_temp.ck((cr_ler_por_token('b1')->'signatario'->'otp'->>'bloqueado')::boolean, 'OT9e leitura mostra bloqueado');
  perform set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
  r := cr_otp_emitir(b, 60); cod2 := r->>'codigo';
  perform set_config('request.jwt.claim.sub', '', false);
  perform pg_temp.ck((select otp_tentativas = 0 and otp_qtd = 2 from cr_signatarios where id = b), 'OT9f emitir de novo zera erros');
  perform pg_temp.ck((cr_assinar('b1', img, cod2)->>'ok')::boolean is true, 'OT9g código novo assina');
  -- OT10 emitir outro invalida o anterior
  perform set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
  r := cr_otp_emitir(c, 60); cod := r->>'codigo';
  loop r := cr_otp_emitir(c, 60); cod2 := r->>'codigo'; exit when cod2 <> cod; end loop;
  perform set_config('request.jwt.claim.sub', '', false);
  perform pg_temp.ck(cr_assinar('c1', img, cod)->>'erro' = 'codigo_invalido', 'OT10a código antigo morreu');
  perform pg_temp.ck((cr_assinar('c1', img, cod2)->>'ok')::boolean is true, 'OT10b código novo vale');
  -- OT11 expirado
  perform set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
  r := cr_otp_emitir(d, 60); cod := r->>'codigo';
  perform set_config('request.jwt.claim.sub', '', false);
  update cr_signatarios set otp_expira_em = now() - interval '1 minute' where id = d;
  perform pg_temp.ck(cr_assinar('d1', img, cod)->>'erro' = 'codigo_expirado' and cr_otp_validar('d1', cod)->>'erro' = 'codigo_expirado', 'OT11a vencido não assina');
  perform pg_temp.ck((cr_ler_por_token('d1')->'signatario'->'otp'->>'expirado')::boolean, 'OT11b leitura mostra expirado');
  perform pg_temp.ck((select otp_tentativas from cr_signatarios where id = d) = 0, 'OT11c vencido não gasta tentativa');
  -- OT12 exigido mas nunca emitido; dispensar
  perform set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
  r := cr_otp_definir(e, true);
  perform pg_temp.ck((r->>'ok')::boolean and (r->>'mudou')::boolean, 'OT12a ligar exigência');
  perform pg_temp.ck((cr_otp_definir(e, true)->>'mudou')::boolean is false, 'OT12b ligar de novo não muda');
  perform set_config('request.jwt.claim.sub', '', false);
  r := cr_assinar('e1', img, '123456');
  perform pg_temp.ck(r->>'erro' = 'codigo_nao_emitido' and not (cr_ler_por_token('e1')->'signatario'->'otp'->>'emitido')::boolean, 'OT12c exigido e não emitido');
  perform set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
  perform cr_otp_emitir(e, 60);
  r := cr_otp_definir(e, false);
  perform pg_temp.ck((r->>'mudou')::boolean and not exists (select 1 from cr_otp_codigos where signatario_id = e), 'OT12d dispensar apaga o código');
  perform set_config('request.jwt.claim.sub', '', false);
  perform pg_temp.ck((cr_assinar('e1', img)->>'ok')::boolean is true, 'OT12e dispensado assina sem código');
  perform pg_temp.ck(exists (select 1 from cr_auditoria where evento = 'otp_dispensado') and exists (select 1 from cr_auditoria where evento = 'otp_exigido') and exists (select 1 from cr_log where acao = 'otp_exigido'), 'OT12f trilha e histórico');
  -- OT13 estados que não deixam ligar nem emitir
  perform set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
  perform pg_temp.ck(cr_otp_definir(a, true)->>'erro' = 'ja_assinado' and cr_otp_emitir(a, 60)->>'erro' = 'ja_assinado', 'OT13a assinado');
  perform pg_temp.ck(cr_otp_emitir(999999, 60)->>'erro' = 'signatario_inexistente' and cr_otp_definir(999999, true)->>'erro' = 'signatario_inexistente', 'OT13b inexistente');
  perform pg_temp.ck(cr_otp_definir(f, null)->>'erro' = 'valor_invalido', 'OT13c valor nulo');
  update cr_signatarios set expira_em = now() - interval '1 day' where id = f;
  perform pg_temp.ck(cr_otp_emitir(f, 60)->>'erro' = 'link_vencido', 'OT13d link vencido');
  update cr_signatarios set expira_em = now() + interval '5 days' where id = f;
  insert into cr_contratos (tipo, numero_contrato, titulo, nome_candidato, status) values ('estagio', 'TCE-OTP-0002', 'TCE — Cancelado', 'X', 'cancelado') returning id into ccan;
  insert into cr_signatarios (contrato_id, nome, papel, token) values (ccan, 'Ivo', 'candidato', 'x1') returning id into cn;
  perform pg_temp.ck(cr_otp_emitir(cn, 60)->>'erro' = 'cancelado' and cr_otp_definir(cn, true)->>'erro' = 'cancelado', 'OT13e contrato cancelado');
  update cr_signatarios set otp_exigido = true where id = cn;
  perform set_config('request.jwt.claim.sub', '', false);
  perform pg_temp.ck(cr_assinar('x1', img, '123456')->>'erro' = 'cancelado' and cr_otp_validar('x1', '123456')->>'erro' = 'cancelado', 'OT13f cancelado vence qualquer código');
  -- OT14 ordem sequencial
  perform set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
  insert into cr_contratos (tipo, numero_contrato, titulo, nome_candidato, status, ordem_assinatura) values ('clt', 'CLT-OTP-0001', 'CLT — Seq', 'S', 'enviado', 'sequencial') returning id into cseq;
  insert into cr_signatarios (contrato_id, nome, papel, token, ordem) values (cseq, 'Primeiro', 'empresa_nexus', 's1', 1) returning id into sq1;
  insert into cr_signatarios (contrato_id, nome, papel, token, ordem, otp_exigido) values (cseq, 'Segundo', 'candidato', 's2', 2, true) returning id into sq2;
  r := cr_otp_emitir(sq2, 60);
  perform pg_temp.ck(r->>'erro' = 'aguardando_vez' and r->>'aguardando' = 'Primeiro', 'OT14a emitir fora da vez');
  perform set_config('request.jwt.claim.sub', '', false);
  perform pg_temp.ck(cr_otp_validar('s2', '123456')->>'erro' = 'aguardando_vez', 'OT14b validar fora da vez');
  perform pg_temp.ck((select otp_tentativas from cr_signatarios where id = sq2) = 0, 'OT14c fora da vez não gasta tentativa');
  -- OT15 link novo e reabrir invalidam o código; prorrogar mantém
  perform set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
  r := cr_otp_emitir(g, 60); cod := r->>'codigo';
  perform cr_renovar_link(g, 7, false);
  perform pg_temp.ck(exists (select 1 from cr_otp_codigos where signatario_id = g), 'OT15a prorrogar mantém o código');
  perform set_config('request.jwt.claim.sub', '', false);
  perform pg_temp.ck((cr_otp_validar('g1', cod)->>'ok')::boolean is true, 'OT15b o código segue valendo no mesmo link');
  perform set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
  r := cr_renovar_link(g, 7, true);
  perform pg_temp.ck(not exists (select 1 from cr_otp_codigos where signatario_id = g) and (select otp_exigido and otp_emitido_em is null and otp_tentativas = 0 from cr_signatarios where id = g), 'OT15c link novo apaga o código e mantém a exigência');
  perform set_config('request.jwt.claim.sub', '', false);
  perform pg_temp.ck(cr_assinar(r->>'token', img, cod)->>'erro' = 'codigo_nao_emitido', 'OT15d código antigo não vale no link novo');
  perform set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
  r := cr_otp_emitir(h, 60);
  update cr_signatarios set status = 'recusado', recusado_em = now(), motivo_recusa = 'x' where id = h;
  perform cr_reabrir_signatario(h, 7);
  perform pg_temp.ck(not exists (select 1 from cr_otp_codigos where signatario_id = h) and (select otp_exigido and otp_emitido_em is null from cr_signatarios where id = h), 'OT15e reabrir apaga o código e mantém a exigência');
  -- OT16 recusar não pede código
  perform set_config('request.jwt.claim.sub', '', false);
  perform pg_temp.ck((cr_recusar((select token from cr_signatarios where id = h), 'não quero')->>'ok')::boolean is true, 'OT16 recusar não exige código');
  -- OT17 o código nunca aparece em trilha nem histórico
  perform set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
  insert into cr_signatarios (contrato_id, nome, papel, token) values (cid, 'Jaci', 'supervisor', 'j1') returning id into n;
  r := cr_otp_emitir(n, 30); cod := r->>'codigo';
  perform pg_temp.ck(not exists (select 1 from cr_auditoria where evento like 'otp%' and detalhe like '%' || cod || '%') and not exists (select 1 from cr_log where acao like 'otp%' and coalesce(detalhe, '') || coalesce(referencia, '') like '%' || cod || '%'), 'OT17a código fora da trilha e do histórico');
  perform pg_temp.ck((select hash from cr_otp_codigos where signatario_id = n) = encode(sha256(convert_to(cod || ':' || n || ':j1', 'UTF8')), 'hex') and (select hash from cr_otp_codigos where signatario_id = n) <> cod, 'OT17b só o hash (SHA-256 com id e token) é guardado');
  perform pg_temp.ck((select otp_expira_em from cr_signatarios where id = n) between now() + interval '29 minutes' and now() + interval '31 minutes', 'OT17c validade escolhida (30 min)');
  -- OT18 sorteio
  create temp table otp_amostra (cod_x text);
  for n in 1..60 loop insert into otp_amostra select cr_otp_emitir((select id from cr_signatarios where token = 'j1'), 5)->>'codigo'; end loop;
  perform pg_temp.ck((select count(*) from otp_amostra where cod_x ~ '^[0-9]{6}$') = 60 and (select count(distinct cod_x) from otp_amostra) >= 55, 'OT18 6 dígitos e variados (60 emissões)');
  perform pg_temp.ck((select otp_qtd from cr_signatarios where token = 'j1') = 61, 'OT18b contador de emissões');
  perform pg_temp.ck((select count(*) from otp_amostra where cod_x::int >= 100000) >= 40, 'OT18c espaço de 1 milhão (não só 10 mil)');
  perform pg_temp.ck((select count(*) from cr_signatarios where otp_exigido) >= 5, 'OT19 colunas novas gravadas');
  raise notice 'OTP SQL: % verificações OK (padrão desligado, emitir/validar/assinar, 5 erros bloqueiam, uso único, expira, link novo invalida, trilha sem o código)', current_setting('otp.n');
end $$;

-- Permissões
do $$
declare ok boolean; sid bigint;
begin
  select id into sid from cr_signatarios where token = 'j1';
  set local role anon;
  begin perform cr_otp_emitir(sid, 60); ok := false; exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FALHOU [OP1 anon executa emitir]'; end if;
  begin perform cr_otp_definir(sid, true); ok := false; exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FALHOU [OP2 anon executa definir]'; end if;
  begin perform cr_otp_conferir(sid, '123456'); ok := false; exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FALHOU [OP3 anon executa a função interna]'; end if;
  begin perform count(*) from cr_otp_codigos; ok := false; exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FALHOU [OP4 anon lê o hash]'; end if;
  perform cr_otp_validar('j1', '000000');
  reset role;
  set local role authenticated;
  begin perform count(*) from cr_otp_codigos; ok := false; exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FALHOU [OP5 logado lê o hash]'; end if;
  begin perform cr_otp_conferir(sid, '123456'); ok := false; exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FALHOU [OP6 logado executa a função interna]'; end if;
  begin insert into cr_otp_codigos(signatario_id, hash) values (sid, 'x'); ok := false; exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FALHOU [OP7 logado escreve o hash direto]'; end if;
  reset role;
  if has_table_privilege('authenticated', 'cr_otp_codigos', 'select') or has_table_privilege('anon', 'cr_otp_codigos', 'select') then raise exception 'FALHOU [OP8 privilégio de leitura]'; end if;
  if has_function_privilege('anon', 'cr_otp_emitir(bigint,int)', 'execute') or has_function_privilege('anon', 'cr_otp_definir(bigint,boolean)', 'execute') then raise exception 'FALHOU [OP9 privilégio de execução do anon]'; end if;
  if not has_function_privilege('anon', 'cr_assinar(text,text,text)', 'execute') then raise exception 'FALHOU [OP10 anon precisa assinar]'; end if;
  if to_regprocedure('cr_assinar(text,text)') is not null then raise exception 'FALHOU [OP11 sobrou a versão antiga de cr_assinar]'; end if;
  raise notice 'OTP SQL: permissões OK (hash ilegível para anon e logado, emitir/ligar só logado, função interna fechada, sem versão antiga de cr_assinar)';
end $$;
