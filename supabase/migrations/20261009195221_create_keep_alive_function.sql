-- Keep-alive mínimo para projetos Supabase Free.
-- Não lê nem altera dados da aplicação.

create or replace function public.keep_alive()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select true;
$$;

revoke all on function public.keep_alive() from public;
revoke all on function public.keep_alive() from anon;
revoke all on function public.keep_alive() from authenticated;

grant execute
on function public.keep_alive()
to service_role;