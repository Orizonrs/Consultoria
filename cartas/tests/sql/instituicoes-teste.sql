-- R31 (M7): cadastro de instituições no PostgreSQL real (com o stub do Supabase). Uso: faz parte de tests/sql/rodar-m15.sh
do $$
declare n int := 0; r record; ok boolean; id1 bigint; id2 bigint;
begin
  -- limpa SÓ os dados que este teste cria (permite rodar de novo na mesma base de teste)
  delete from cr_instituicoes where cnpj in ('11222333000181', '45723174000110') or lower(nome) in ('unisinos', 'ulbra', 'universidade x', 'universidade y');
  -- inserção normaliza
  insert into cr_instituicoes (nome, cnpj, endereco) values ('  Universidade   X ', '11.222.333/0001-81', '  Av. Central, 10 ') returning id into id1;
  select * into r from cr_instituicoes where id = id1;
  if r.nome <> 'Universidade X' then raise exception 'FALHOU [I01 nome sem espaços sobrando: %]', r.nome; end if; n := n + 1;
  if r.cnpj <> '11222333000181' then raise exception 'FALHOU [I02 CNPJ só dígitos: %]', r.cnpj; end if; n := n + 1;
  if r.endereco <> 'Av. Central, 10' then raise exception 'FALHOU [I03 endereço aparado]'; end if; n := n + 1;
  if not r.ativo then raise exception 'FALHOU [I04 nasce ativa]'; end if; n := n + 1;

  -- vazios viram null
  insert into cr_instituicoes (nome, cnpj, endereco) values ('UNISINOS', '', '   ') returning id into id2;
  select * into r from cr_instituicoes where id = id2;
  if r.cnpj is not null or r.endereco is not null then raise exception 'FALHOU [I05 vazio vira null]'; end if; n := n + 1;

  -- recusas
  begin insert into cr_instituicoes (nome) values ('   '); ok := false; exception when check_violation then ok := true; end;
  if not ok then raise exception 'FALHOU [I06 nome em branco recusado]'; end if; n := n + 1;
  begin insert into cr_instituicoes (nome, cnpj) values ('Universidade Y', '11222333000182'); ok := false; exception when check_violation then ok := true; end;
  if not ok then raise exception 'FALHOU [I07 CNPJ inválido recusado no servidor]'; end if; n := n + 1;
  begin insert into cr_instituicoes (nome, cnpj) values ('Outra', '11222333000181'); ok := false; exception when unique_violation then ok := true; end;
  if not ok then raise exception 'FALHOU [I08 CNPJ repetido recusado]'; end if; n := n + 1;
  begin insert into cr_instituicoes (nome) values ('unisinos'); ok := false; exception when unique_violation then ok := true; end;
  if not ok then raise exception 'FALHOU [I09 sem CNPJ: mesmo nome (maiúscula) recusado]'; end if; n := n + 1;
  insert into cr_instituicoes (nome, cnpj) values ('UNISINOS', '45723174000110');
  n := n + 1;  -- I10 mesmo nome com CNPJ DIFERENTE é permitido (campus/mantenedora)

  -- atualização
  update cr_instituicoes set nome = 'Universidade Y', criado_em = '2000-01-01' where id = id1;
  select * into r from cr_instituicoes where id = id1;
  if r.criado_em < now() - interval '1 day' then raise exception 'FALHOU [I11 criado_em não muda na atualização]'; end if; n := n + 1;
  if r.atualizado_em < now() - interval '1 minute' then raise exception 'FALHOU [I12 atualizado_em renovado]'; end if; n := n + 1;
  begin update cr_instituicoes set cnpj = '123' where id = id1; ok := false; exception when check_violation then ok := true; end;
  if not ok then raise exception 'FALHOU [I13 atualizar para CNPJ inválido recusado]'; end if; n := n + 1;
  update cr_instituicoes set ativo = false where id = id1;
  if (select ativo from cr_instituicoes where id = id1) then raise exception 'FALHOU [I14 desativar]'; end if; n := n + 1;
  delete from cr_instituicoes where id = id2;
  if exists (select 1 from cr_instituicoes where id = id2) then raise exception 'FALHOU [I15 excluir]'; end if; n := n + 1;
  raise notice 'INSTITUICOES SQL: % verificações OK (CNPJ no servidor, normalização, duplicidade, campus, atualização)', n;
end $$;

-- permissões: visitante (anon) não lê nem escreve
do $$
declare ok boolean;
begin
  set local role anon;
  begin perform 1 from cr_instituicoes limit 1; ok := false; exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FALHOU [I16 anon não lê cr_instituicoes]'; end if;
  begin insert into cr_instituicoes (nome) values ('Invasora'); ok := false; exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FALHOU [I17 anon não grava]'; end if;
  reset role;
  raise notice 'INSTITUICOES SQL: anon bloqueado OK';
end $$;
