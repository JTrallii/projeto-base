revoke all
on function operon.handle_new_auth_user()
from public;

revoke all
on function operon.handle_new_auth_user()
from anon;

revoke all
on function operon.handle_new_auth_user()
from authenticated;




drop trigger if exists
  on_auth_user_created_operon
on auth.users;

create trigger on_auth_user_created_operon
after insert on auth.users
for each row
execute function operon.handle_new_auth_user();