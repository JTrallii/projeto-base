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


--Habilitar RLS -- COLOQUE AQUI TODAS AS SUAS TABELAS QUE TEM QUE TER O RLS ATIVO
ALTER TABLE COLOQUE-AQUI-SCHEMA.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE COLOQUE-AQUI-SCHEMA.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE COLOQUE-AQUI-SCHEMA.enderecos ENABLE ROW LEVEL SECURITY;
