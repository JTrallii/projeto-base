-- ============================================================
-- PRIVATE USER FILES STORAGE
--
-- Storage privado para arquivos pertencentes ao usuário.
--
-- Escritas NÃO são permitidas diretamente pelo cliente.
-- Upload e exclusão devem passar pelo backend.
--
-- Imagens são normalizadas para WebP antes de serem
-- persistidas.
--
-- Estrutura dos objetos:
--
--   <user-id>/<uuid>.webp
--   <user-id>/<uuid>.pdf
--
-- ============================================================


-- ============================================================
-- BUCKET
-- ============================================================

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'private-user-files',
  'private-user-files',
  false,
  5242880,
  array[
    'image/webp',
    'application/pdf'
  ]::text[]
)
on conflict (id)
do update set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;


-- ============================================================
-- LIMPEZA DEFENSIVA
--
-- Atualmente não existem policies.
-- Os DROP abaixo tornam a migration segura caso algum ambiente
-- tenha recebido uma versão anterior dessas policies.
-- ============================================================

drop policy if exists
  "private-user-files_insert_own_folder"
on storage.objects;

drop policy if exists
  "private-user-files_select_own_files"
on storage.objects;

drop policy if exists
  "private-user-files_delete_own_files"
on storage.objects;

drop policy if exists
  "private-user-files_update_own_files"
on storage.objects;


-- ============================================================
-- SELECT
--
-- O usuário autenticado pode ler somente arquivos cujo
-- primeiro segmento do path seja o próprio auth.uid().
--
-- Não dependemos de owner_id porque os objetos serão criados
-- pelo backend utilizando a credencial administrativa.
-- ============================================================

create policy
  "private-user-files_select_own_files"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'private-user-files'
  and
  (storage.foldername(name))[1]
    = (select auth.uid()::text)
);


-- ============================================================
-- INSERT
--
-- NÃO existe policy de INSERT para authenticated.
--
-- O cliente não pode fazer upload diretamente para o Storage.
--
-- Upload:
--
-- client
--   -> Server Action
--   -> autenticação
--   -> rate limit
--   -> validações
--   -> normalização
--   -> backend
--   -> Storage
-- ============================================================


-- ============================================================
-- UPDATE
--
-- NÃO existe policy de UPDATE para authenticated.
--
-- Overwrite e upsert diretos permanecem bloqueados.
-- ============================================================


-- ============================================================
-- DELETE
--
-- NÃO existe policy de DELETE para authenticated.
--
-- Exclusões também deverão passar pelo backend para que possam
-- receber autorização e auditoria.
-- ============================================================