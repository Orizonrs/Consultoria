-- R30 (M7): cadastro de empresas no PostgreSQL real (com o stub do Supabase). Uso: faz parte de tests/sql/rodar-m15.sh
do $$
declare n int := 0; r record; ok boolean; id1 bigint; id2 bigint;
begin
  -- limpa SÓ os dados que este teste cria (permite rodar de novo na mesma base de teste)
  delete from cr_empresas where cnpj in ('11222333000181', '45723174000110') or lower(razao_social) in ('beta sa', 'acme s/a', 'acme ltda');
  -- validação de CNPJ
  if not cr_cnpj_valido('11.222.333/0001-81') then raise exception 'FALHOU [E01 CNPJ válido formatado]'; end if; n := n + 1;
  if not cr_cnpj_valido('11222333000181') then raise exception 'FALHOU [E02 CNPJ válido só dígitos]'; end if; n := n + 1;
  if cr_cnpj_valido('11.222.333/0001-82') then raise exception 'FALHOU [E03 dígito errado]'; end if; n := n + 1;
  if cr_cnpj_valido('11111111111111') or cr_cnpj_valido('00000000000000') then raise exception 'FALHOU [E04 dígitos repetidos]'; end if; n := n + 1;
  if cr_cnpj_valido('123') or cr_cnpj_valido('') or cr_cnpj_valido(null) then raise exception 'FALHOU [E05 curto/vazio/nulo]'; end if; n := n + 1;

  -- inserção normaliza
  insert into cr_empresas (razao_social, cnpj, endereco, supervisor_nome, supervisor_cargo)
    values ('  Acme   Ltda ', '11.222.333/0001-81', '  Rua A, 1 ', '  joão   santos ', ' Gerente ') returning id into id1;
  select * into r from cr_empresas where id = id1;
  if r.razao_social <> 'Acme Ltda' then raise exception 'FALHOU [E06 razão sem espaços sobrando: %]', r.razao_social; end if; n := n + 1;
  if r.cnpj <> '11222333000181' then raise exception 'FALHOU [E07 CNPJ só dígitos: %]', r.cnpj; end if; n := n + 1;
  if r.endereco <> 'Rua A, 1' or r.supervisor_nome <> 'joão santos' or r.supervisor_cargo <> 'Gerente' then raise exception 'FALHOU [E08 campos aparados]'; end if; n := n + 1;
  if not r.ativo then raise exception 'FALHOU [E09 nasce ativa]'; end if; n := n + 1;

  -- vazios viram null
  insert into cr_empresas (razao_social, cnpj, endereco, supervisor_nome) values ('Beta SA', '', '   ', '') returning id into id2;
  select * into r from cr_empresas where id = id2;
  if r.cnpj is not null or r.endereco is not null or r.supervisor_nome is not null then raise exception 'FALHOU [E10 vazio vira null]'; end if; n := n + 1;

  -- recusas
  begin insert into cr_empresas (razao_social, cnpj) values ('   ', null); ok := false; exception when check_violation then ok := true; end;
  if not ok then raise exception 'FALHOU [E11 razão em branco recusada]'; end if; n := n + 1;
  begin insert into cr_empresas (razao_social, cnpj) values ('Gama', '11222333000182'); ok := false; exception when check_violation then ok := true; end;
  if not ok then raise exception 'FALHOU [E12 CNPJ inválido recusado no servidor]'; end if; n := n + 1;
  begin insert into cr_empresas (razao_social, cnpj) values ('Acme outra', '11222333000181'); ok := false; exception when unique_violation then ok := true; end;
  if not ok then raise exception 'FALHOU [E13 CNPJ repetido recusado]'; end if; n := n + 1;
  begin insert into cr_empresas (razao_social, cnpj) values ('BETA   sa', null); ok := false; exception when unique_violation then ok := true; end;
  if not ok then raise exception 'FALHOU [E14 sem CNPJ: mesmo nome (maiúscula/espaços) recusado]'; end if; n := n + 1;
  insert into cr_empresas (razao_social, cnpj) values ('Beta SA', '45723174000110');
  n := n + 1;  -- E15 mesmo nome com CNPJ DIFERENTE é permitido (filiais)

  -- atualização
  update cr_empresas set razao_social = 'Acme S/A', criado_em = '2000-01-01' where id = id1;
  select * into r from cr_empresas where id = id1;
  if r.criado_em < now() - interval '1 day' then raise exception 'FALHOU [E16 criado_em não muda na atualização]'; end if; n := n + 1;
  if r.atualizado_em < now() - interval '1 minute' then raise exception 'FALHOU [E17 atualizado_em renovado]'; end if; n := n + 1;
  begin update cr_empresas set cnpj = '123' where id = id1; ok := false; exception when check_violation then ok := true; end;
  if not ok then raise exception 'FALHOU [E18 atualizar para CNPJ inválido recusado]'; end if; n := n + 1;
  update cr_empresas set ativo = false where id = id1;
  if (select ativo from cr_empresas where id = id1) then raise exception 'FALHOU [E19 desativar]'; end if; n := n + 1;
  delete from cr_empresas where id = id2;
  if exists (select 1 from cr_empresas where id = id2) then raise exception 'FALHOU [E20 excluir]'; end if; n := n + 1;
  raise notice 'EMPRESAS SQL: % verificações OK (CNPJ no servidor, normalização, duplicidade, filial, atualização)', n;
end $$;

-- permissões: visitante (anon) não lê nem escreve; logado sim; e a função de CNPJ não é pública
do $$
declare ok boolean;
begin
  set local role anon;
  begin perform 1 from cr_empresas limit 1; ok := false; exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FALHOU [E21 anon não lê cr_empresas]'; end if;
  begin insert into cr_empresas (razao_social) values ('Invasora'); ok := false; exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FALHOU [E22 anon não grava]'; end if;
  begin perform cr_cnpj_valido('11222333000181'); ok := false; exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FALHOU [E23 anon não executa cr_cnpj_valido]'; end if;
  reset role;
  raise notice 'EMPRESAS SQL: anon bloqueado (tabela e função) OK';
end $$;
