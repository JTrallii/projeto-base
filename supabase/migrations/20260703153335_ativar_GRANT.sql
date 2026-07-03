
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



-- ============================================================
-- PERMISSÕES POR TABELA
-- Ajuste os nomes das tabelas e as permissões conforme necessário.
-- ============================================================

-- Tabela de usuários (dados estendidos do auth.users)
GRANT SELECT, UPDATE ON COLOQUE-AQUI-SCHEMA.usuarios TO authenticated;
-- Nota: INSERT não é necessário pois o cadastro é feito via trigger ou função.

-- Tabela de clientes (vínculo com usuário)
GRANT SELECT, UPDATE ON COLOQUE-AQUI-SCHEMA.clientes TO authenticated;

-- Tabela de endereços
GRANT SELECT, INSERT, UPDATE, DELETE ON COLOQUE-AQUI-SCHEMA.enderecos TO authenticated;

