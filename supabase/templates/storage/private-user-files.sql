-- ============================================================
-- TEMPLATE: STORAGE PRIVADO POR USUÁRIO
--
-- Antes de usar:
-- 1. Substitua BUCKET_NAME pelo nome real do bucket.
-- 2. Crie o bucket como PRIVADO.
-- 3. Configure MIME types e limite de tamanho no bucket.
--
-- Path esperado pela aplicação:
--
--   auth.uid()/UUID.ext
--
-- Exemplo:
--
--   123e4567-e89b-12d3-a456-426614174000/
--   c7e8d124-....pdf
--
-- Não execute este template sem substituir BUCKET_NAME.
-- ============================================================


-- ============================================================
-- INSERT
--
-- Usuário autenticado só pode enviar arquivos para
-- uma pasta cujo primeiro segmento seja o próprio auth.uid().
-- ============================================================

create policy "BUCKET_NAME_insert_own_folder"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'BUCKET_NAME'
  and
  (storage.foldername(name))[1]
    = (select auth.uid()::text)
);


-- ============================================================
-- SELECT
--
-- O usuário só pode ler arquivos:
-- - do bucket correto;
-- - cujo owner_id seja ele mesmo;
-- - armazenados na própria pasta.
-- ============================================================

create policy "BUCKET_NAME_select_own_files"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'BUCKET_NAME'
  and owner_id = (select auth.uid()::text)
  and
  (storage.foldername(name))[1]
    = (select auth.uid()::text)
);


-- ============================================================
-- DELETE
--
-- O usuário só pode apagar os próprios arquivos.
-- ============================================================

create policy "BUCKET_NAME_delete_own_files"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'BUCKET_NAME'
  and owner_id = (select auth.uid()::text)
  and
  (storage.foldername(name))[1]
    = (select auth.uid()::text)
);


-- ============================================================
-- UPDATE
--
-- NÃO criamos policy de UPDATE por padrão.
--
-- Consequência:
--
--   UPDATE / overwrite / upsert de objetos
--   permanece bloqueado.
--
-- Para substituir um arquivo:
--
--   1. envie um novo objeto;
--   2. atualize a referência no domínio;
--   3. remova o antigo quando apropriado.
--
-- Isso reduz risco de sobrescrita acidental/maliciosa.
-- ============================================================