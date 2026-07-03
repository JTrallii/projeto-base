
/*
  ============================================================
  MIGRAÇÃO TEMPLATE BASE
  Descrição: Estrutura de permissões, RLS e políticas
  Uso: Substitua DIGITE-AQUI-O-NOME-DO-SEU-SCHEMA pelo nome do seu schema
       e ajuste os nomes das tabelas e colunas conforme seu projeto.
  Autor: Jason Tralli
  Data: 2026-07-03
  ============================================================
*/




--CRIE PRIMEIRO O SCHEMA DENTRO DO BANCO CASO FOR USAR SCHEMA E SE NÃO FOR, APENAS APAGUE ESSA LINHA ABAIXO
CREATE SCHEMA IF NOT EXISTS DIGITE-AQUI-O-NOME-DO-SEU-SCHEMA;

--EXEMPLO DE TABELA DE USUARIOS PARA O AUTH DO SUPABASE
CREATE TABLE DIGITE-AQUI-O-NOME-DO-SEU-SCHEMA.usuarios(
    id uuid PRIMARY KEY REFERENCES auth.users(id),
    nome TEXT NOT NULL,
    --Ex: 'DIGITE SUA PERMISSÃO AQUI' | 'admin' | 'tecnico' | 'cliente'
    role TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT now()
);


-- EXEMPLO DE TABELA DE CLIENTES
CREATE TABLE DIGITE-AQUI-O-NOME-DO-SEU-SCHEMA.clientes(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    usuario_id uuid UNIQUE REFERENCES DIGITE-AQUI-O-NOME-DO-SEU-SCHEMA.usuarios(id),
    cpf TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    telefone TEXT NOT NULL,
    observacoes TEXT,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now(),
    ativo BOOLEAN DEFAULT true
);