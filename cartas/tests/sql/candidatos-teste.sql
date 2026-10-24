-- R32 (M7): cadastro de candidatos no PostgreSQL real (com o stub do Supabase). Uso: faz parte de tests/sql/rodar-m15.sh
-- CPFs válidos de teste: 529.982.247-25 e 111.444.777-35
do $$
declare n int := 0; r record; ok boolean; id1 bigint; id2 bigint;
begin
  delete from cr_candidatos where cpf in ('52998224725', '11144477735') or lower(nome) in ('maria da silva', 'joão souza', 'ana lima', 'sem cpf');
  if not cr_cpf_valido('529.982.247-25') or not cr_cpf_valido('52998224725') then raise exception 'FALHOU [C01 CPF válido, com e sem pontuação]'; end if; n := n + 1;
  if cr_cpf_valido('529.982.247-26') or cr_cpf_valido('52998224735') then raise exception 'FALHOU [C02 dígito errado]'; end if; n := n + 1;
  if cr_cpf_valido('11111111111') or cr_cpf_valido('00000000000') then raise exception 'FALHOU [C03 dígitos repetidos]'; end if; n := n + 1;
  if cr_cpf_valido('123') or cr_cpf_valido('') or cr_cpf_valido(null) or cr_cpf_valido('529982247250') then raise exception 'FALHOU [C04 curto/longo/vazio/nulo]'; end if; n := n + 1;

  insert into cr_candidatos (nome, cpf, email, curso, semestre, instituicao, matricula)
    values ('  Maria   da Silva ', '529.982.247-25', '  Maria@Email.COM ', '  Administração  ', ' 4º semestre ', ' UNISINOS ', ' 2023001 ') returning id into id1;
  select * into r from cr_candidatos where id = id1;
  if r.nome <> 'Maria da Silva' then raise exception 'FALHOU [C05 nome sem espaços sobrando: %]', r.nome; end if; n := n + 1;
  if r.cpf <> '52998224725' then raise exception 'FALHOU [C06 CPF só dígitos: %]', r.cpf; end if; n := n + 1;
  if r.email <> 'maria@email.com' or r.curso <> 'Administração' or r.semestre <> '4º semestre' or r.instituicao <> 'UNISINOS' or r.matricula <> '2023001' then raise exception 'FALHOU [C07 campos aparados e e-mail minúsculo]'; end if; n := n + 1;

  insert into cr_candidatos (nome, cpf, email, curso) values ('Sem CPF', '', '   ', '') returning id into id2;
  select * into r from cr_candidatos where id = id2;
  if r.cpf is not null or r.email is not null or r.curso is not null then raise exception 'FALHOU [C08 vazio vira null]'; end if; n := n + 1;

  begin insert into cr_candidatos (nome) values ('   '); ok := false; exception when check_violation then ok := true; end;
  if not ok then raise exception 'FALHOU [C09 nome em branco recusado]'; end if; n := n + 1;
  begin insert into cr_candidatos (nome, cpf) values ('João Souza', '52998224726'); ok := false; exception when check_violation then ok := true; end;
  if not ok then raise exception 'FALHOU [C10 CPF inválido recusado no servidor]'; end if; n := n + 1;
  begin insert into cr_candidatos (nome, cpf) values ('Outra Pessoa', '529.982.247-25'); ok := false; exception when unique_violation then ok := true; end;
  if not ok then raise exception 'FALHOU [C11 CPF repetido recusado]'; end if; n := n + 1;
  begin insert into cr_candidatos (nome) values ('SEM   cpf'); ok := false; exception when unique_violation then ok := true; end;
  if not ok then raise exception 'FALHOU [C12 sem CPF: mesmo nome recusado]'; end if; n := n + 1;
  insert into cr_candidatos (nome, cpf) values ('Maria da Silva', '111.444.777-35');
  n := n + 1;  -- C13 homônimos com CPFs diferentes são permitidos

  update cr_candidatos set nome = 'Ana Lima', criado_em = '2000-01-01' where id = id1;
  select * into r from cr_candidatos where id = id1;
  if r.criado_em < now() - interval '1 day' then raise exception 'FALHOU [C14 criado_em não muda na atualização]'; end if; n := n + 1;
  if r.atualizado_em < now() - interval '1 minute' then raise exception 'FALHOU [C15 atualizado_em renovado]'; end if; n := n + 1;
  begin update cr_candidatos set cpf = '123' where id = id1; ok := false; exception when check_violation then ok := true; end;
  if not ok then raise exception 'FALHOU [C16 atualizar para CPF inválido recusado]'; end if; n := n + 1;
  delete from cr_candidatos where id = id2;
  if exists (select 1 from cr_candidatos where id = id2) then raise exception 'FALHOU [C17 exclusão real]'; end if; n := n + 1;
  raise notice 'CANDIDATOS SQL: % verificações OK (CPF no servidor, normalização, duplicidade, homônimos, exclusão)', n;
end $$;

do $$
declare ok boolean;
begin
  set local role anon;
  begin perform 1 from cr_candidatos limit 1; ok := false; exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FALHOU [C18 anon não lê cr_candidatos]'; end if;
  begin insert into cr_candidatos (nome) values ('Invasora'); ok := false; exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FALHOU [C19 anon não grava]'; end if;
  begin perform cr_cpf_valido('52998224725'); ok := false; exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FALHOU [C20 anon não executa cr_cpf_valido]'; end if;
  reset role;
  raise notice 'CANDIDATOS SQL: anon bloqueado (tabela e função) OK';
end $$;
