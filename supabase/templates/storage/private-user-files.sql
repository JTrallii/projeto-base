-- ============================================================
-- TEMPLATE: STORAGE PRIVADO POR USUÁRIO
--
-- Arquitetura:
--
--   CLIENT
--     -> SERVER ACTION
--     -> autenticação
--     -> rate limit
--     -> validação do arquivo
--     -> validação da assinatura
--     -> upload server-side
--     -> Storage
--
-- O cliente autenticado NÃO possui permissão
-- direta para INSERT, UPDATE ou DELETE.
--
-- Antes de usar:
--
-- 1. Substitua BUCKET_NAME pelo nome real do bucket.
-- 2. Crie o bucket como PRIVADO.
-- 3. Configure MIME types permitidos no bucket.
-- 4. Configure limite de tamanho no bucket.
--
-- Path gerado pelo servidor:
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
-- NÃO existe policy de INSERT para authenticated.
--
-- Uploads devem passar exclusivamente pela camada server-side,
-- que:
--
-- - autentica o usuário;
-- - aplica rate limit;
-- - valida tamanho;
-- - valida MIME;
-- - valida extensão;
-- - valida assinatura;
-- - gera o path;
-- - registra auditoria;
-- - usa a secret key somente no servidor.
--
-- Assim, um cliente não consegue contornar essas validações
-- enviando o arquivo diretamente para o Supabase Storage.
-- ============================================================


-- ============================================================
-- SELECT
--
-- O usuário autenticado pode ler somente objetos cujo
-- primeiro segmento do path seja seu próprio auth.uid().
--
-- Não utilizamos owner_id aqui porque objetos criados através
-- de uma secret/service key não recebem o usuário final como
-- owner_id.
--
-- O vínculo de propriedade da aplicação é o path gerado
-- exclusivamente pelo servidor:
--
--   userId/UUID.ext
-- ============================================================

create policy "BUCKET_NAME_select_own_files"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'BUCKET_NAME'
  and
  (storage.foldername(name))[1]
    = (select auth.uid()::text)
);


-- ============================================================
-- DELETE
--
-- NÃO existe policy de DELETE para authenticated.
--
-- Exclusões são mutações e devem passar por código server-side
-- para permitir:
--
-- - autenticação;
-- - autorização;
-- - validação do path;
-- - rate limit quando necessário;
-- - auditoria.
-- ============================================================


-- ============================================================
-- UPDATE
--
-- NÃO existe policy de UPDATE para authenticated.
--
-- Consequências:
--
-- - overwrite direto permanece bloqueado;
-- - upsert direto permanece bloqueado;
-- - o cliente não consegue substituir objetos existentes.
--
-- Para substituir um arquivo:
--
--   1. envie um novo objeto através do servidor;
--   2. atualize a referência no domínio;
--   3. remova o objeto anterior através do servidor.
-- ============================================================


