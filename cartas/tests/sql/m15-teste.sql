-- Teste REAL (PostgreSQL) das regras do M15. Ver tests/sql/LEIA-ME.txt. Cada bloco levanta exceção se a regra falhar.
\set ON_ERROR_STOP on
\set QUIET on
set client_min_messages = notice;
truncate cr_signatarios, cr_contratos, cr_auditoria, cr_contadores, cr_log restart identity cascade;
do $$ begin perform set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false); end $$;
do $$ begin perform set_config('request.jwt.claims', '{"email":"teste@orizon.local"}', false); end $$;

insert into cr_contratos (tipo, numero_contrato, titulo, nome_candidato, cargo, empresa, periodo_inicio, periodo_fim, valor_bolsa, jornada_horas, status, curso, instituicao)
  values ('estagio', 'TCE-2026-0001', 'TCE — Ana — ACME', 'Ana', 'Estagiária', 'ACME', '2026-01-10', '2026-07-10', 1000, '6h', 'assinado', 'Adm', 'UFX'),
         ('estagio', 'TCE-2026-0002', 'TCE — Bia — ACME', 'Bia', 'Estagiária', 'ACME', '2026-01-10', '2026-07-10', 1000, '6h', 'enviado', 'Adm', 'UFX');
insert into cr_signatarios (contrato_id, nome, email, papel, token, status, assinado_em)
  select c.id, x.n, x.n || '@x.com', x.p, 'orig' || c.id || x.p, case when c.status = 'assinado' then 'assinado' else 'pendente' end, now()
  from cr_contratos c, (values ('Orizon', 'empresa_nexus'), ('Ana', 'candidato'), ('Chefe', 'supervisor')) x(n, p);

create or replace function t_erro(r json, esperado text, nome text) returns void language plpgsql as $$
begin if r->>'erro' is distinct from esperado then raise exception 'FALHOU [%]: esperado erro %, veio %', nome, esperado, r::text; end if; end $$;
create or replace function t_ok(r json, nome text) returns void language plpgsql as $$
begin if (r->>'ok') is distinct from 'true' then raise exception 'FALHOU [%]: esperado ok, veio %', nome, r::text; end if; end $$;
create or replace function t_igual(a anyelement, b anyelement, nome text) returns void language plpgsql as $$
begin if a is distinct from b then raise exception 'FALHOU [%]: % <> %', nome, a, b; end if; end $$;

do $$ declare r json; id1 bigint; id2 bigint; a json; ren json; res json; tk record; orig_antes jsonb; m cr_contratos; begin
  select id into id1 from cr_contratos where numero_contrato = 'TCE-2026-0001';
  select id into id2 from cr_contratos where numero_contrato = 'TCE-2026-0002';
  select to_jsonb(c) into orig_antes from cr_contratos c where id = id1;

  perform t_erro(cr_criar_movimento(id2, 'aditivo', null, null, '{"valor_bolsa":1200}'), 'origem_nao_assinada', 'T1 origem não assinada');
  perform t_erro(cr_criar_movimento(99999, 'aditivo', null, null, '{"valor_bolsa":1200}'), 'origem_inexistente', 'T2 origem inexistente');
  perform t_erro(cr_criar_movimento(id1, 'xpto', null, null, '{}'), 'tipo_invalido', 'T3 tipo inválido');
  perform t_erro(cr_criar_movimento(id1, 'aditivo', null, null, '{}'), 'sem_alteracao', 'T4 aditivo vazio');
  perform t_erro(cr_criar_movimento(id1, 'aditivo', null, null, '{"valor_bolsa":1000}'), 'sem_alteracao', 'T5 mesmo valor = sem alteração');
  perform t_erro(cr_criar_movimento(id1, 'aditivo', null, null, '{"cpf":"123"}'), 'campo_nao_permitido', 'T6 campo fora da lista');
  perform t_erro(cr_criar_movimento(id1, 'aditivo', null, null, '{"valor_bolsa":"abc"}'), 'valor_invalido', 'T7 valor inválido');
  perform t_erro(cr_criar_movimento(id1, 'aditivo', null, null, '{"valor_bolsa":-5}'), 'valor_invalido', 'T8 valor negativo');
  perform t_erro(cr_criar_movimento(id1, 'aditivo', null, null, '{"periodo_fim":"2026-01-01"}'), 'termo_antes_do_inicio', 'T9 término antes do início');

  -- aditivo válido
  a := cr_criar_movimento(id1, 'aditivo', '2026-03-01', 'Reajuste da bolsa', '{"valor_bolsa":1200,"cargo":"Estagiária Sênior"}');
  perform t_ok(a, 'T10 aditivo ok');
  perform t_igual(a->>'numero', 'ADT-' || extract(year from now())::int || '-0001', 'T11 numeração ADT');
  select * into m from cr_contratos where id = (a->>'id')::bigint;
  perform t_igual(m.tipo_mov, 'aditivo', 'T12 tipo_mov');
  perform t_igual(m.contrato_origem_id, id1, 'T13 vínculo com o original');
  perform t_igual(m.valor_bolsa, 1200::numeric, 'T14 valor novo aplicado');
  perform t_igual((m.alteracoes->'valor_bolsa'->>'de'), '1000', 'T15 "de" vem do banco');
  perform t_igual((m.alteracoes->'cargo'->>'para'), 'Estagiária Sênior', 'T16 "para"');
  perform t_igual(m.status, 'enviado', 'T17 nasce aguardando');
  perform t_igual((select count(*)::int from cr_signatarios where contrato_id = m.id and status = 'pendente'), 3, 'T18 3 signatários pendentes');
  perform t_igual((select count(distinct token)::int from cr_signatarios where contrato_id in (m.id, id1)), 6, 'T19 tokens novos e únicos');
  perform t_igual((select to_jsonb(c) from cr_contratos c where id = id1), orig_antes, 'T20 original NÃO foi alterado (RN-06)');
  perform t_erro(cr_criar_movimento(id1, 'rescisao', '2026-04-01', 'x motivo', '{}'), 'ja_possui_movimento', 'T21 um movimento por vez');
  perform t_igual((select count(*)::int from cr_auditoria where evento = 'criou_aditivo' and contrato_id = m.id), 1, 'T22 auditoria do novo');
  perform t_igual((select count(*)::int from cr_auditoria where evento = 'recebeu_aditivo' and contrato_id = id1), 1, 'T23 auditoria do original');
  perform t_igual((select count(*)::int from cr_log where acao = 'criou_aditivo' and usuario_email = 'teste@orizon.local'), 1, 'T24 histórico de acessos (cr_log)');

  -- cancelado libera de novo
  update cr_contratos set status = 'cancelado' where id = m.id;
  ren := cr_criar_movimento(id1, 'renovacao', null, null, '{"periodo_fim":"2026-07-01"}');
  perform t_erro(ren, 'termo_nao_posterior', 'T25 renovação com término não posterior');
  perform t_erro(cr_criar_movimento(id1, 'renovacao', null, null, '{}'), 'novo_termo_obrigatorio', 'T26 renovação sem novo término');
  ren := cr_criar_movimento(id1, 'renovacao', null, null, '{"periodo_fim":"2027-01-10"}');
  perform t_ok(ren, 'T27 renovação ok depois de cancelar o aditivo');
  select * into m from cr_contratos where id = (ren->>'id')::bigint;
  perform t_igual(m.periodo_inicio, date '2026-07-11', 'T28 renovação começa no dia seguinte ao término');
  perform t_igual(m.periodo_fim, date '2027-01-10', 'T29 novo término');
  perform t_igual(left(m.numero_contrato, 3), 'REN', 'T30 prefixo REN');

  -- assina a renovação com TODOS (como visitante, por token) -> assinado
  for tk in select token from cr_signatarios where contrato_id = m.id order by id loop
    perform set_config('request.jwt.claim.sub', '', false);
    perform cr_assinar(tk.token, repeat('A', 200));
  end loop;
  perform set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
  perform t_igual((select status from cr_contratos where id = m.id), 'assinado', 'T31 renovação assinada pelo fluxo normal (cr_assinar)');
  perform t_igual((select cr_ler_por_token((select token from cr_signatarios where contrato_id = m.id limit 1))->>'origem'), 'TCE-2026-0001', 'T32 página de assinatura recebe o nº do original');

  -- rescisão sobre a renovação
  perform t_erro(cr_criar_movimento(m.id, 'rescisao', null, 'Sem data', '{}'), 'data_obrigatoria', 'T33 rescisão sem data');
  perform t_erro(cr_criar_movimento(m.id, 'rescisao', '2026-12-01', '', '{}'), 'motivo_obrigatorio', 'T34 rescisão sem motivo');
  perform t_erro(cr_criar_movimento(m.id, 'rescisao', '2026-01-01', 'Motivo', '{}'), 'data_antes_do_inicio', 'T35 data antes do início');
  perform t_erro(cr_criar_movimento(m.id, 'rescisao', '2027-02-01', 'Motivo', '{}'), 'data_apos_termino', 'T36 data depois do término');
  res := cr_criar_movimento(m.id, 'rescisao', '2026-12-01', 'Conclusão antecipada do curso', '{}');
  perform t_ok(res, 'T37 rescisão ok');
  perform t_igual((select periodo_fim from cr_contratos where id = (res->>'id')::bigint), date '2026-12-01', 'T38 término da rescisão = data de efeito');
  perform t_igual((select left(numero_contrato, 3) from cr_contratos where id = (res->>'id')::bigint), 'RES', 'T39 prefixo RES');
  update cr_contratos set status = 'assinado' where id = (res->>'id')::bigint;
  perform t_erro(cr_criar_movimento((res->>'id')::bigint, 'aditivo', null, null, '{"valor_bolsa":5}'), 'origem_rescindida', 'T40 rescisão encerra a cadeia');
  raise notice 'M15 SQL: 40 verificações OK';
end $$;

-- permissões: visitante (anon) NÃO executa; sem login falha
set role anon;
do $$ begin
  begin perform cr_criar_movimento(1, 'aditivo', null, null, '{"valor_bolsa":1}'); raise exception 'FALHOU [P1]: anon executou';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
do $$ begin perform set_config('request.jwt.claim.sub', '', false); end $$;
do $$ begin
  begin perform cr_criar_movimento(1, 'aditivo', null, null, '{"valor_bolsa":1}'); raise exception 'FALHOU [P2]: sem login executou';
  exception when others then if sqlerrm not like '%autenticado%' then raise; end if; end;
  raise notice 'M15 SQL: permissões OK (anon bloqueado, sem login bloqueado)';
end $$;
