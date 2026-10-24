-- R15 (4.5): verificação pública de autenticidade — só dados não pessoais, só pelo hash inteiro.
\set ON_ERROR_STOP on
set client_min_messages = notice;
truncate cr_signatarios, cr_contratos, cr_auditoria, cr_contadores, cr_log restart identity cascade;
do $$ begin perform set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false); end $$;
do $$
declare cid bigint; r json; hd text; hs text; img text := repeat('A', 200); txt text;
begin
  insert into cr_contratos (tipo, numero_contrato, titulo, nome_candidato, cpf, email_candidato, periodo_inicio, periodo_fim, status)
    values ('estagio', 'TCE-2026-0001', 'TCE — Maria Secreta', 'Maria Secreta', '123.456.789-09', 'maria@secreta.com', '2026-01-01', '2026-12-31', 'enviado') returning id into cid;
  insert into cr_signatarios (contrato_id, nome, email, papel, token) values
    (cid, 'Orizon', 'o@x.com', 'empresa_nexus', 'v1'), (cid, 'Maria Secreta', 'maria@secreta.com', 'candidato', 'v2');
  perform set_config('request.jwt.claim.sub', '', false);                      -- visitante
  r := cr_assinar('v1', img);
  hs := (select hash_assinatura from cr_signatarios where token = 'v1');
  r := cr_verificar_documento(hs);                                             -- hash de 1 assinatura
  if r->>'nivel' <> 'assinatura' or r->>'papel' <> 'empresa_nexus' or r->>'status' <> 'parcial' then raise exception 'V1 assinatura individual: %', r; end if;
  r := cr_verificar_documento((select hash_documento from cr_contratos where id = cid));
  if (r->>'encontrado') <> 'false' then raise exception 'V2 contrato parcial não tem hash de documento ainda: %', r; end if;
  r := cr_assinar('v2', img);
  hd := (select hash_documento from cr_contratos where id = cid);
  if hd is null or hd <> (r->>'hash') then raise exception 'V3 hash do documento = hash da última assinatura'; end if;
  r := cr_verificar_documento(hd);
  if r->>'nivel' <> 'documento' or r->>'numero' <> 'TCE-2026-0001' or r->>'status' <> 'assinado' then raise exception 'V4 documento: %', r; end if;
  if json_array_length(r->'partes') <> 2 then raise exception 'V5 partes'; end if;
  r := cr_verificar_documento(upper('  ' || hd || ' '));
  if (r->>'encontrado') <> 'true' then raise exception 'V6 aceita maiúsculas/espaços'; end if;
  txt := cr_verificar_documento(hd)::text;
  if txt ~* 'secreta|123\.456|@|"ip"|assinatura_img|token' then raise exception 'V7 vazou dado pessoal: %', txt; end if;
  r := cr_verificar_documento(repeat('0', 64));  if (r->>'encontrado') <> 'false' then raise exception 'V8 hash falso aceito'; end if;
  r := cr_verificar_documento('TCE-2026-0001');  if r->>'erro' <> 'hash_invalido' then raise exception 'V9 número não é chave de busca: %', r; end if;
  r := cr_verificar_documento(null);             if r->>'erro' <> 'hash_invalido' then raise exception 'V10 nulo'; end if;
  r := cr_verificar_documento(substr(hd, 1, 63)); if r->>'erro' <> 'hash_invalido' then raise exception 'V11 hash curto'; end if;
  -- movimento posterior aparece como aviso
  perform set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
  r := cr_criar_movimento(cid, 'rescisao', '2026-06-30', 'Encerramento antecipado', '{}'::jsonb);
  perform set_config('request.jwt.claim.sub', '', false);
  r := cr_verificar_documento(hd);
  if r->'posterior'->>'tipo_mov' <> 'rescisao' then raise exception 'V12 movimento posterior: %', r; end if;
  -- cancelado continua verificável, mas com status cancelado
  update cr_contratos set status = 'cancelado' where id = cid;
  r := cr_verificar_documento(hd); if r->>'status' <> 'cancelado' then raise exception 'V13 cancelado'; end if;
  raise notice 'VERIFICAR SQL: 13 verificações OK (hash completo como chave, sem dado pessoal, movimento posterior, cancelado)';
end $$;
set role anon;
do $$ declare r json; begin
  r := cr_verificar_documento(repeat('a', 64));
  if (r->>'encontrado') <> 'false' then raise exception 'V14 anon não executou'; end if;
  raise notice 'VERIFICAR SQL: anon executa a função OK';
end $$;
