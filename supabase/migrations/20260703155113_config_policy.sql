/*
  ============================================================
  MIGRAÇÃO TEMPLATE BASE
  Descrição: Estrutura de permissões, RLS e políticas
  Uso: Substitua COLOQUE-AQUI-SCHEMA pelo nome do seu schema
       e ajuste os nomes das tabelas e colunas conforme seu projeto.
  Autor: Jason Tralli
  Data: 2026-07-03
  ============================================================
*/



-- Para INSERT/UPDATE/DELETE, você pode criar uma função que verifica se o usuário é admin.
-- Exemplo simplificado: apenas usuário com email específico (não recomendado em produção).
-- CREATE POLICY "Apenas admin gerencia especialidades"
-- ON COLOQUE-AQUI-SCHEMA.especialidades
-- FOR ALL
-- USING (auth.email() = 'admin@email.com')
-- WITH CHECK (auth.email() = 'admin@email.com');

-- Caso queira liberar para todos (cuidado!), use:
-- CREATE POLICY "Todos gerenciam especialidades"
-- ON COLOQUE-AQUI-SCHEMA.especialidades
-- FOR ALL
-- USING (true)
-- WITH CHECK (true);


-- ============================================================
-- POLÍTICAS RLS (ROW LEVEL SECURITY)
-- ============================================================

-- ------------------------------------------------------------
-- Políticas para tabela USUARIOS
-- Usuário vê e atualiza APENAS seu próprio registro.
-- ------------------------------------------------------------
CREATE POLICY "Usuários veem seus próprios dados"
ON COLOQUE-AQUI-SCHEMA.usuarios
FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Usuários atualizam seus próprios dados"
ON COLOQUE-AQUI-SCHEMA.usuarios
FOR UPDATE
USING (auth.uid() = id);

-- ------------------------------------------------------------
-- Políticas para tabela CLIENTES
-- Supondo que clientes tenha coluna usuario_id (referência ao auth.users.id)
-- ------------------------------------------------------------
CREATE POLICY "Clientes veem seus próprios dados"
ON COLOQUE-AQUI-SCHEMA.clientes
FOR SELECT
USING (auth.uid() = usuario_id);

CREATE POLICY "Clientes atualizam seus próprios dados"
ON COLOQUE-AQUI-SCHEMA.clientes
FOR UPDATE
USING (auth.uid() = usuario_id);

-- ------------------------------------------------------------
-- Políticas para tabela ENDERECOS
-- Exemplo com duas abordagens: (A) via coluna usuario_id ou (B) via subconsulta.
-- Escolha a que se adequar à sua modelagem.
-- ------------------------------------------------------------

-- Opção A: se enderecos tiver usuario_id diretamente
CREATE POLICY "Usuários veem seus endereços"
ON COLOQUE-AQUI-SCHEMA.enderecos
FOR SELECT
USING (auth.uid() = usuario_id);

CREATE POLICY "Usuários gerenciam seus endereços"
ON COLOQUE-AQUI-SCHEMA.enderecos
FOR ALL
USING (auth.uid() = usuario_id)
WITH CHECK (auth.uid() = usuario_id);

-- Opção B: via subconsulta (se enderecos tiver cliente_id e clientes tiver usuario_id)
-- CREATE POLICY "Usuários veem endereços de seus clientes"
-- ON COLOQUE-AQUI-SCHEMA.enderecos
-- FOR SELECT
-- USING (
--   EXISTS (
--     SELECT 1 FROM COLOQUE-AQUI-SCHEMA.clientes c
--     WHERE c.id = enderecos.cliente_id
--     AND c.usuario_id = auth.uid()
--   )
-- );

-- ------------------------------------------------------------
-- Políticas para tabela ORCAMENTOS
-- Vinculado via cliente_id -> clientes -> usuario_id
-- ------------------------------------------------------------
CREATE POLICY "Usuários veem orçamentos de seus clientes"
ON COLOQUE-AQUI-SCHEMA.orcamentos
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM COLOQUE-AQUI-SCHEMA.clientes c
    WHERE c.id = orcamentos.cliente_id
    AND c.usuario_id = auth.uid()
  )
);

CREATE POLICY "Usuários criam orçamentos para seus clientes"
ON COLOQUE-AQUI-SCHEMA.orcamentos
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM COLOQUE-AQUI-SCHEMA.clientes c
    WHERE c.id = orcamentos.cliente_id
    AND c.usuario_id = auth.uid()
  )
);

CREATE POLICY "Usuários atualizam orçamentos de seus clientes"
ON COLOQUE-AQUI-SCHEMA.orcamentos
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM COLOQUE-AQUI-SCHEMA.clientes c
    WHERE c.id = orcamentos.cliente_id
    AND c.usuario_id = auth.uid()
  )
);

CREATE POLICY "Usuários deletam orçamentos de seus clientes"
ON COLOQUE-AQUI-SCHEMA.orcamentos
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM COLOQUE-AQUI-SCHEMA.clientes c
    WHERE c.id = orcamentos.cliente_id
    AND c.usuario_id = auth.uid()
  )
);

-- ------------------------------------------------------------
-- Políticas para tabela ORDENS (similar à de orçamentos)
-- ------------------------------------------------------------
CREATE POLICY "Usuários veem ordens de seus clientes"
ON COLOQUE-AQUI-SCHEMA.ordens
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM COLOQUE-AQUI-SCHEMA.clientes c
    WHERE c.id = ordens.cliente_id
    AND c.usuario_id = auth.uid()
  )
);

-- (Repita as políticas de INSERT, UPDATE, DELETE seguindo o mesmo padrão)
-- Nota: você pode usar "FOR ALL" para unificar as operações, mas aqui separamos para maior clareza.

-- ------------------------------------------------------------
-- Políticas para tabelas de CATÁLOGO (especialidades, servicos, tecnicos)
-- Exemplo: todos veem (SELECT), mas apenas admin pode modificar.
-- ------------------------------------------------------------

-- Permite SELECT para todos (autenticados e anônimos) – mas como anon não tem GRANT, só autenticados.
CREATE POLICY "Todos veem especialidades"
ON COLOQUE-AQUI-SCHEMA.especialidades
FOR SELECT
USING (true);