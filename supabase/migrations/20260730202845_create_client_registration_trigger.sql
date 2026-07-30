create schema if not exists operon;

create or replace function operon.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_nome text;
  v_sobrenome text;
  v_tipo_cadastro text;
begin
  v_tipo_cadastro := coalesce(
    new.raw_user_meta_data ->> 'cadastro_tipo',
    ''
  );

  if v_tipo_cadastro <> 'cliente' then
    return new;
  end if;

  v_nome := trim(
    coalesce(
      new.raw_user_meta_data ->> 'nome',
      ''
    )
  );

  v_sobrenome := trim(
    coalesce(
      new.raw_user_meta_data ->> 'sobrenome',
      ''
    )
  );

  if v_nome = '' then
    raise exception 'Nome obrigatório';
  end if;

  if v_sobrenome = '' then
    raise exception 'Sobrenome obrigatório';
  end if;

  if new.email is null then
    raise exception 'E-mail obrigatório';
  end if;

  insert into operon.usuarios (
    id,
    nome,
    role
  )
  values (
    new.id,
    concat_ws(' ', v_nome, v_sobrenome),
    'cliente'
  );

  insert into operon.clientes (
    nome,
    sobrenome,
    usuario_id,
    email
  )
  values (
    v_nome,
    v_sobrenome,
    new.id,
    lower(new.email)
  );

  return new;
end;
$$;

revoke all
on function operon.handle_new_auth_user()
from public, anon, authenticated;

drop trigger if exists
  on_auth_user_created_operon
on auth.users;

create trigger on_auth_user_created_operon
after insert on auth.users
for each row
execute function operon.handle_new_auth_user();