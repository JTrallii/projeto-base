# 🛡️ SaaS Base — Next.js + Supabase

Base reutilizável para desenvolvimento de aplicações SaaS utilizando **Next.js 15, TypeScript, Supabase e PostgreSQL**, estruturada com foco em segurança, autenticação, autorização, controle de acesso, versionamento de banco de dados e operações server-side.

> Este projeto não tem como objetivo ser apenas um template visual.
>
> A proposta é servir como uma base técnica reutilizável para novos sistemas, evitando que autenticação, autorização, RLS, rate limiting, migrations e outros controles críticos precisem ser reconstruídos do zero a cada projeto.

---

# 📌 Status do projeto

Legenda:

* ✅ Implementado
* 🟡 Parcial / precisa ser adaptado
* 🧩 Estrutura preparada, mas ainda sem uso completo
* ⏳ Planejado
* ⚠️ Requer configuração em cada novo projeto

| Recurso                                     | Status               |
| ------------------------------------------- | -------------------- |
| Next.js 15 + App Router                     | ✅                    |
| TypeScript                                  | ✅                    |
| Supabase Auth                               | ✅                    |
| Cliente Supabase Browser                    | ✅                    |
| Cliente Supabase Server/SSR                 | ✅                    |
| Cliente Supabase Admin                      | ✅                    |
| Middleware de autenticação                  | ✅                    |
| Login via Server Action                     | ✅                    |
| Cadastro via Server Action                  | ✅                    |
| Logout via Server Action                    | ✅                    |
| Validação server-side com Zod               | ✅                    |
| Redirect interno protegido                  | ✅                    |
| Rate limiting com Upstash                   | ✅                    |
| Hash HMAC dos identificadores do rate limit | ✅                    |
| Detecção controlada do IP do cliente        | ✅                    |
| Migrations Supabase                         | 🟡                   |
| RLS habilitado via template de migration    | 🟡                   |
| Policies completas por tabela               | ⏳                    |
| Trigger Auth → tabela interna de usuários   | ⏳                    |
| Helpers centrais de autorização             | ⏳                    |
| Auditoria persistente                       | ⏳                    |
| Upload seguro / Storage                     | ⏳                    |
| Validação especial de SVG                   | ⏳                    |
| Cloudflare Turnstile / CAPTCHA              | ⏳                    |
| CSP e security headers finais               | ⏳                    |
| Proteção contra abuso em reset de senha     | 🧩                   |
| Proteção contra abuso em convites           | 🧩                   |
| Exportação segura                           | 🧩                   |
| Testes automatizados                        | ⏳                    |
| CI                                          | ⏳                    |
| Observabilidade / monitoramento             | ⏳                    |
| Checklist de provisionamento                | ✅ documentado abaixo |

---

# 🧱 Stack

## Aplicação

* Next.js 15
* React
* TypeScript
* App Router
* Server Actions

## Backend / Auth / Banco

* Supabase
* Supabase Auth
* PostgreSQL
* Row Level Security
* Supabase SSR
* Supabase CLI / migrations

## Segurança

* Zod
* Upstash Redis
* Upstash Rate Limit
* HMAC SHA-256
* Server-only modules

## UI

* Tailwind CSS
* Radix UI
* Lucide React
* Sonner

---

# 🧠 Princípios da arquitetura

Esta base segue alguns princípios obrigatórios.

## 1. O client nunca é uma fronteira de segurança

Um botão oculto não impede uma operação.

Uma página protegida não impede que uma Server Action seja chamada diretamente.

Uma validação feita somente no formulário não protege o backend.

Por isso:

```text
CLIENT
  │
  │ dados não confiáveis
  ▼
SERVER ACTION / ROUTE HANDLER
  │
  ├── validar entrada
  ├── autenticar usuário
  ├── autorizar operação
  ├── aplicar rate limit
  ├── executar operação
  ├── registrar auditoria
  └── retornar resposta segura
```

---

# 🔐 Fluxo obrigatório para operações sensíveis

Toda operação que altera dados deve seguir, com pequenas variações, este caminho:

```text
REQUISIÇÃO
   │
   ▼
1. VALIDAR INPUT
   │
   ▼
2. IDENTIFICAR USUÁRIO
   │
   ▼
3. VERIFICAR AUTORIZAÇÃO
   │
   ▼
4. RATE LIMIT
   │
   ▼
5. EXECUTAR OPERAÇÃO
   │
   ▼
6. AUDITORIA
   │
   ▼
7. REVALIDATE / REDIRECT
   │
   ▼
RESPOSTA SEGURA
```

**Middleware não substitui autorização dentro da action.**

O middleware protege principalmente a navegação e gerenciamento da sessão.

A própria ação ainda deve validar quem está tentando executar a operação.

---

# 📂 Estrutura principal

```text
src/
│
├── actions/
│   └── auth.ts
│
├── app/
│   ├── cadastro/
│   ├── dashboard/
│   ├── login/
│   └── api/
│
├── components/
│
├── contexts/
│   └── AuthContext.tsx
│
├── lib/
│   │
│   ├── auth/
│   │   └── get-current-user.ts
│   │
│   ├── security/
│   │   ├── client-ip.ts
│   │   └── rate-limit.ts
│   │
│   └── supabase/
│       ├── admin.ts
│       ├── middleware.ts
│       ├── server.ts
│       ├── supabase.ts
│       └── utils.ts
│
├── middleware.ts
│
└── types/

supabase/
│
├── migrations/
└── config.toml
```

---

# ⚠️ Arquivos que precisam de limpeza

## `src/app/login/actions.ts`

Existe atualmente uma implementação antiga de login dentro de:

```text
src/app/login/actions.ts
```

O caminho oficial da autenticação deve ser:

```text
src/actions/auth.ts
```

Portanto, antes de considerar a base finalizada, o arquivo antigo deve ser removido depois de confirmar que nenhum componente ainda depende dele.

Não mantenha duas implementações diferentes da mesma operação de autenticação.

---

# 🔑 Variáveis de ambiente

Crie:

```bash
.env.local
```

Nunca faça commit desse arquivo.

Exemplo:

```env
# ==================================================
# SUPABASE
# ==================================================

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=

# SOMENTE SERVER
SUPABASE_SECRET_KEY=

# ==================================================
# UPSTASH
# ==================================================

UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Segredo usado para gerar fingerprints HMAC
RATE_LIMIT_HASH_SECRET=

# ==================================================
# INFRAESTRUTURA
# ==================================================

# Necessário fora da Vercel quando houver proxy confiável.
# Exemplo Cloudflare:
# TRUSTED_CLIENT_IP_HEADER=cf-connecting-ip
TRUSTED_CLIENT_IP_HEADER=

# ==================================================
# TURNSTILE — PLANEJADO
# ==================================================

NEXT_PUBLIC_TURNSTILE_SITE_KEY=

# O nome final do secret deve seguir a configuração
# utilizada no projeto/Supabase.
SUPABASE_AUTH_CAPTCHA_SECRET=
```

---

# 🚨 Nunca exponha estas variáveis

Nunca use no client:

```text
SUPABASE_SECRET_KEY
UPSTASH_REDIS_REST_TOKEN
RATE_LIMIT_HASH_SECRET
SUPABASE_AUTH_CAPTCHA_SECRET
```

Variáveis com:

```text
NEXT_PUBLIC_
```

podem ser enviadas para o navegador.

Portanto, nunca coloque uma chave privilegiada com esse prefixo.

---

# 📦 Instalação

Clone:

```bash
git clone https://github.com/JTrallii/projeto-base.git
cd projeto-base
```

Instale as dependências:

```bash
npm install
```

Execute:

```bash
npm run dev
```

Abra:

```text
http://localhost:3000
```

---

# ⚠️ npm x pnpm

O repositório ainda contém arquivos de lock de mais de um gerenciador de pacotes.

Antes da versão final da base, escolha apenas um.

Exemplo usando npm:

```text
package-lock.json ✅
pnpm-lock.yaml ❌
```

Ou usando pnpm:

```text
pnpm-lock.yaml ✅
package-lock.json ❌
```

Não mantenha dois lockfiles como referência oficial do projeto.

---

# 🟢 Supabase Clients

A base possui clientes diferentes porque **cada contexto possui permissões e responsabilidades diferentes**.

---

# 🌐 Browser Client

Arquivo atual:

```text
src/lib/supabase/supabase.ts
```

Uso:

* código executado no navegador;
* subscriptions;
* realtime;
* operações intencionalmente permitidas por RLS;
* leitura de sessão quando necessário à interface.

Exemplo:

```ts
import { createClient } from "@/lib/supabase/supabase";

const supabase = createClient();
```

## Regra

O browser client **nunca deve receber secret/service key**.

Ele deve depender das políticas RLS para impedir acesso indevido.

---

# 🖥️ Server Client

Arquivo:

```text
src/lib/supabase/server.ts
```

Uso:

* Server Components;
* Server Actions;
* Route Handlers;
* leitura segura do usuário;
* consultas feitas em nome do usuário autenticado.

Exemplo:

```ts
import { createServerSupabase } from "@/lib/supabase/server";

const supabase = await createServerSupabase();
```

Esse cliente utiliza os cookies da requisição.

---

# 👑 Admin Client

Arquivo:

```text
src/lib/supabase/admin.ts
```

Uso somente para operações administrativas confiáveis.

Exemplo:

```ts
import { createAdminSupabase } from "@/lib/supabase/admin";

const supabaseAdmin = createAdminSupabase();
```

## ⚠️ Regra crítica

O admin client pode ignorar as proteções normais de RLS dependendo da chave utilizada.

Portanto:

```text
USUÁRIO → ACTION → supabaseAdmin
```

não deve ser o padrão.

Para operações realizadas pelo usuário:

```text
USUÁRIO
   ↓
SERVER ACTION
   ↓
AUTENTICAÇÃO
   ↓
AUTORIZAÇÃO
   ↓
SERVER SUPABASE
   ↓
RLS
```

O admin client deve ser reservado para casos como:

* tarefas administrativas internas;
* manutenção;
* criação administrativa de usuários;
* processos server-to-server;
* operações que realmente precisam de privilégio elevado.

---

# 👤 Usuário atual

Helper:

```text
src/lib/auth/get-current-user.ts
```

Uso:

```ts
import { getCurrentUser } from "@/lib/auth/get-current-user";

const user = await getCurrentUser();

if (!user) {
  // não autenticado
}
```

Esse código deve permanecer server-only.

---

# 🔐 Middleware

O middleware principal está em:

```text
src/middleware.ts
```

Ele delega o processamento para:

```text
src/lib/supabase/middleware.ts
```

Responsabilidades atuais:

* atualizar cookies da sessão;
* validar claims do usuário;
* proteger `/dashboard`;
* redirecionar usuários não autenticados para `/login`;
* redirecionar usuários autenticados que tentem acessar `/login` ou `/cadastro`.

Fluxo:

```text
REQUEST
   ↓
src/middleware.ts
   ↓
updateSession()
   ↓
Supabase getClaims()
   ↓
autenticado?
   │
   ├─ NÃO + /dashboard → /login
   │
   └─ SIM + /login → /dashboard
```

## Importante

Middleware responde:

> "O usuário pode navegar até esta página?"

Server Action responde:

> "O usuário pode executar esta operação?"

São responsabilidades diferentes.

---

# 🔑 Autenticação

As Server Actions oficiais estão em:

```text
src/actions/auth.ts
```

Existem atualmente:

```ts
loginAction()
registerAction()
logoutAction()
```

---

# 🔓 Login

Fluxo atual:

```text
FORM
 ↓
AuthContext.login()
 ↓
loginAction()
 ↓
Zod
 ↓
IP confiável
 ↓
Rate limit por IP
 ↓
Rate limit IP + e-mail
 ↓
Supabase signInWithPassword()
 ↓
cookies SSR
 ↓
redirect seguro
```

O login possui dois rate limits:

```text
loginIp
loginCredential
```

Isso ajuda a limitar:

* muitas contas sendo testadas pelo mesmo IP;
* muitas tentativas contra uma determinada credencial.

---

# 📝 Cadastro

Fluxo:

```text
FORM
 ↓
AuthContext.register()
 ↓
registerAction()
 ↓
Zod
 ↓
Rate limit IP
 ↓
Rate limit IP + e-mail
 ↓
Supabase signUp()
 ↓
Auth metadata
 ↓
trigger do banco [AINDA PRECISA SER IMPLEMENTADO NA MIGRATION]
 ↓
perfil interno
```

O cadastro atual envia:

```ts
cadastro_tipo: "cliente"
```

O usuário **não escolhe sua própria role**.

Isso é proposital.

## ⚠️ Pendência importante

A action já pressupõe que um trigger do banco utilizará essas informações.

Porém a migration final contendo esse trigger ainda precisa ser criada.

Sem ele, não considere o fluxo Auth → perfil interno concluído.

---

# 🚪 Logout

```text
CLIENT
 ↓
AuthContext.logout()
 ↓
logoutAction()
 ↓
Supabase signOut({ scope: "local" })
 ↓
/login
```

O escopo `local` encerra somente a sessão atual.

---

# 🧩 AuthContext

Arquivo:

```text
src/contexts/AuthContext.tsx
```

O `AuthContext` pode continuar existindo para:

* estado visual;
* `isLoading`;
* usuário atual na interface;
* abstração das chamadas de login;
* cadastro;
* logout.

Ele **não deve conter a lógica de segurança principal**.

Correto:

```text
AuthContext
 ↓
Server Action
 ↓
segurança real
```

Incorreto:

```text
AuthContext
 ↓
Supabase privilegiado diretamente
```

---

# 🔀 Redirect seguro

O login possui uma função interna que aceita somente redirects relativos da própria aplicação.

Exemplo aceito:

```text
/dashboard/configuracoes
```

Exemplo rejeitado:

```text
https://site-malicioso.com
```

Isso reduz risco de open redirect.

---

# 🚦 Rate limiting

Implementação:

```text
src/lib/security/rate-limit.ts
```

Backend:

```text
Upstash Redis
```

Os identificadores não são enviados diretamente como chave para o Redis.

Antes são transformados com:

```text
HMAC-SHA256
```

utilizando:

```env
RATE_LIMIT_HASH_SECRET
```

---

# Escopos disponíveis

| Scope                | Uso                               |
| -------------------- | --------------------------------- |
| `loginIp`            | Tentativas gerais de login por IP |
| `loginCredential`    | Login por IP + e-mail             |
| `registerIp`         | Cadastros por IP                  |
| `registerCredential` | Cadastro por IP + e-mail          |
| `mutation`           | Alterações autenticadas comuns    |
| `sensitiveMutation`  | Operações críticas/destrutivas    |
| `upload`             | Upload de arquivos                |
| `exportUser`         | Limite individual de exportação   |
| `exportTenant`       | Limite por tenant                 |
| `passwordReset`      | Recuperação de senha              |
| `invitation`         | Convites                          |

Alguns desses escopos já existem na infraestrutura, mas ainda não possuem uma funcionalidade correspondente implementada na aplicação.

---

# 🧠 Como escolher o rate limit

## Mutation normal

Exemplos:

```text
editar nome
criar tarefa
editar endereço
alterar descrição
```

Use:

```ts
mutation
```

---

## Mutation sensível

Exemplos:

```text
excluir conta
alterar e-mail
alterar role
remover membro
alterar permissões
trocar configurações críticas
```

Use:

```ts
sensitiveMutation
```

---

## Upload

Use:

```ts
upload
```

---

## Exportação

Aplique:

```text
exportUser
```

e, em ambientes multi-tenant:

```text
exportTenant
```

---

# 🌍 Identificação de IP

Arquivo:

```text
src/lib/security/client-ip.ts
```

## Desenvolvimento

Retorna:

```text
127.0.0.1
```

## Vercel

Utiliza header fornecido pela infraestrutura da Vercel.

## Infraestrutura própria

Configure:

```env
TRUSTED_CLIENT_IP_HEADER=cf-connecting-ip
```

por exemplo.

## ⚠️ Atenção

Não confie cegamente em:

```text
x-forwarded-for
```

se qualquer cliente puder enviar esse header diretamente.

O proxy deve remover/substituir valores externos antes que ele seja considerado confiável.

---

# 🧬 Padrão obrigatório para novas Server Actions

Novas ações não devem ser criadas sem um padrão.

Exemplo:

```text
src/actions/profile.ts
src/actions/projects.ts
src/actions/members.ts
```

Evite espalhar regras sensíveis dentro de componentes.

---

# ✅ Exemplo — mutation autenticada

```ts
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { createServerSupabase } from "@/lib/supabase/server";
import { consumeRateLimit } from "@/lib/security/rate-limit";

const schema = z.object({
  name: z.string().trim().min(1).max(100),
});

export async function updateProfileAction(input: unknown) {
  // 1. INPUT
  const parsed = schema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      code: "INVALID_INPUT",
    };
  }

  // 2. AUTENTICAÇÃO
  const user = await getCurrentUser();

  if (!user) {
    return {
      ok: false,
      code: "UNAUTHENTICATED",
    };
  }

  // 3. RATE LIMIT
  const rateLimit = await consumeRateLimit(
    "mutation",
    `user:${user.id}`,
  );

  if (!rateLimit.allowed) {
    return {
      ok: false,
      code: "RATE_LIMITED",
      retryAfterSeconds:
        rateLimit.retryAfterSeconds,
    };
  }

  // 4. CLIENTE SERVER — continua sujeito à RLS
  const supabase =
    await createServerSupabase();

  // 5. EXECUÇÃO
  const { error } = await supabase
    .from("profiles")
    .update({
      name: parsed.data.name,
    })
    .eq("id", user.id);

  if (error) {
    console.error(
      "Falha ao atualizar perfil",
      {
        event: "profile.update.failed",
        userId: user.id,
        databaseCode: error.code,
      },
    );

    return {
      ok: false,
      code: "UPDATE_FAILED",
    };
  }

  // 6. AUDITORIA
  // TODO: registrar audit log.

  // 7. CACHE
  revalidatePath("/dashboard/profile");

  return {
    ok: true,
  };
}
```

---

# 🛑 Exemplo — action com autorização

Autenticação responde:

> Quem é você?

Autorização responde:

> Você pode executar isso?

Exemplo:

```ts
"use server";

import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { createServerSupabase } from "@/lib/supabase/server";
import { consumeRateLimit } from "@/lib/security/rate-limit";

const schema = z.object({
  projectId: z.string().uuid(),
});

export async function deleteProjectAction(
  input: unknown,
) {
  const parsed = schema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      code: "INVALID_INPUT",
    };
  }

  const user = await getCurrentUser();

  if (!user) {
    return {
      ok: false,
      code: "UNAUTHENTICATED",
    };
  }

  const supabase =
    await createServerSupabase();

  // AUTORIZAÇÃO EXPLÍCITA
  const { data: project } =
    await supabase
      .from("projects")
      .select("id, owner_id")
      .eq("id", parsed.data.projectId)
      .maybeSingle();

  if (
    !project ||
    project.owner_id !== user.id
  ) {
    return {
      ok: false,
      code: "FORBIDDEN",
    };
  }

  const rateLimit =
    await consumeRateLimit(
      "sensitiveMutation",
      `user:${user.id}`,
    );

  if (!rateLimit.allowed) {
    return {
      ok: false,
      code: "RATE_LIMITED",
    };
  }

  const { error } =
    await supabase
      .from("projects")
      .delete()
      .eq(
        "id",
        parsed.data.projectId,
      );

  if (error) {
    return {
      ok: false,
      code: "DELETE_FAILED",
    };
  }

  // TODO AUDIT LOG

  return {
    ok: true,
  };
}
```

Mesmo existindo RLS, mantenha autorização explícita quando a regra de negócio exigir.

Use as duas camadas:

```text
ACTION AUTHORIZATION
+
DATABASE RLS
```

---

# 🏢 Padrão multi-tenant

Para aplicações com organizações:

```text
User
 │
 ▼
organization_members
 │
 ├── organization_id
 ├── user_id
 └── role
```

Antes de qualquer operação:

```text
1. autenticar
2. obter organizationId
3. verificar membership
4. verificar role
5. executar consulta
6. deixar RLS validar novamente
```

Nunca confie apenas em:

```ts
organizationId
```

recebido do client.

---

# 👑 Action administrativa

Uma operação administrativa deve seguir:

```text
INPUT
 ↓
AUTH
 ↓
ROLE / PERMISSION
 ↓
RATE LIMIT
 ↓
AUDIT
 ↓
ADMIN CLIENT
```

Exemplo conceitual:

```ts
const user = await requireUser();

await requirePermission(
  user.id,
  "users.manage",
);

await consumeRateLimit(
  "sensitiveMutation",
  `user:${user.id}`,
);

const admin =
  createAdminSupabase();

// operação privilegiada
```

**Nunca crie uma action administrativa que apenas chama `supabaseAdmin` sem validar quem chamou.**

---

# 🧱 Helpers que ainda serão criados

Para evitar repetir autenticação em todas as actions, serão criados helpers centrais.

Exemplo planejado:

```text
src/lib/auth/require-user.ts
src/lib/auth/require-role.ts
src/lib/auth/require-permission.ts
```

Uso desejado:

```ts
const user = await requireUser();
```

e:

```ts
await requirePermission(
  user.id,
  "project.delete",
);
```

Isso não elimina a verificação.

Apenas centraliza sua implementação.

---

# ❌ Padrão proibido

Não faça:

```ts
export async function deleteUser(
  userId: string,
) {
  const admin =
    createAdminSupabase();

  await admin
    .from("users")
    .delete()
    .eq("id", userId);
}
```

Qualquer cliente capaz de invocar essa action poderia tentar enviar outro `userId`.

---

# ✅ Padrão correto

```text
CLIENT
 ↓
Server Action
 ↓
Zod
 ↓
getCurrentUser()
 ↓
requirePermission()
 ↓
rate limit
 ↓
operação
 ↓
audit
```

---

# 🗃️ Migrations

As migrations ficam em:

```text
supabase/migrations/
```

Nunca trate o SQL Editor como fonte final da estrutura do banco.

Mudanças permanentes devem ser versionadas.

---

# Fluxo recomendado

```bash
supabase migration new create_profiles
```

Edite o SQL criado.

Depois:

```bash
supabase db push
```

Quando estiver utilizando banco local:

```bash
supabase db reset
```

para testar se todas as migrations conseguem reconstruir o banco do zero.

---

# ⚠️ Estado atual das migrations

As migrations existentes ainda funcionam como **templates**.

Elas possuem placeholders como:

```text
DIGITE-AQUI-O-NOME-DO-SEU-SCHEMA
```

e:

```text
COLOQUE-AQUI-SCHEMA
```

Antes de utilizá-las em um projeto real:

1. defina o schema;
2. substitua os placeholders;
3. ajuste tabelas;
4. ajuste colunas;
5. crie policies;
6. crie triggers;
7. revise grants;
8. teste com usuários diferentes;
9. execute em ambiente de teste;
10. somente depois aplique em produção.

---

# 🔒 Row Level Security

Habilitar RLS:

```sql
ALTER TABLE public.exemplo
ENABLE ROW LEVEL SECURITY;
```

não é suficiente.

Depois disso, policies precisam ser criadas.

Sem policy adequada, usuários podem simplesmente perder acesso à tabela.

---

# Exemplo conceitual

```sql
CREATE POLICY "user_can_read_own_data"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  id = auth.uid()
);
```

Cada tabela deve ser analisada individualmente.

Não copie policies cegamente entre tabelas.

---

# 🧠 Regra para policies

Pergunte sempre:

```text
QUEM
pode fazer
O QUÊ
em
QUAL REGISTRO?
```

Exemplo:

```text
cliente
pode visualizar
SELECT
somente registros
onde user_id = auth.uid()
```

---

# ⚠️ Nunca substituir policies sem revisão

Ao adicionar uma nova policy:

1. liste as policies existentes;
2. identifique sua finalidade;
3. verifique se alguma funcionalidade depende delas;
4. adicione ou altere somente o necessário;
5. teste todas as roles;
6. nunca faça `DROP POLICY` indiscriminadamente.

---

# 👤 Auth → tabela interna

O Supabase Auth mantém identidade em:

```text
auth.users
```

A aplicação normalmente precisa de uma tabela própria:

```text
profiles
```

ou:

```text
usuarios
```

A base irá utilizar trigger para sincronizar a criação.

Fluxo desejado:

```text
Supabase Auth
     │
     │ INSERT auth.users
     ▼
TRIGGER
     │
     ▼
public.usuarios
```

## Regra

Role administrativa nunca deve vir diretamente da escolha do usuário durante cadastro público.

Cadastro público deve receber role segura padrão:

```text
cliente
```

Roles privilegiadas devem ser atribuídas somente por fluxo administrativo autorizado.

---

# 🧾 Grants e Revokes — planejado

Além de RLS, novos projetos devem revisar permissões do banco.

Antes de produção verificar:

```text
anon
authenticated
service_role
```

e demais roles utilizadas.

Princípio:

```text
deny by default
allow explicitly
```

---

# 📤 Exportação

Existe uma implementação de referência em:

```text
src/app/api/export/router.ts
```

Ela demonstra a ordem correta de segurança:

```text
JSON
 ↓
Zod
 ↓
Auth
 ↓
Rate limit do usuário
 ↓
Membership
 ↓
Role
 ↓
Rate limit do tenant
 ↓
Consulta sujeita à RLS
 ↓
Resposta
```

## ⚠️ Importante

No App Router do Next.js, o arquivo efetivo deve ser:

```text
route.ts
```

Portanto, o exemplo atual não deve ser tratado como endpoint final enquanto estiver em:

```text
router.ts
```

Além disso, o exemplo utiliza entidades como:

```text
organization_members
projects
```

que deverão ser criadas/adaptadas no projeto real.

---

# HTTP 429

Route Handlers devem retornar corretamente:

```http
429 Too Many Requests
```

e:

```text
Retry-After
X-RateLimit-Limit
X-RateLimit-Remaining
X-RateLimit-Reset
```

O helper:

```ts
createRateLimitHeaders()
```

já existe para esse padrão.

---

# 📂 Uploads — planejado

Uploads nunca devem depender apenas de:

```html
accept="image/*"
```

A validação deverá ocorrer no servidor.

Verificar:

* tamanho;
* MIME type;
* extensão;
* quantidade;
* usuário;
* tenant;
* autorização;
* nome do arquivo;
* caminho no Storage;
* tipo real do conteúdo quando necessário.

---

# SVG

SVG deve receber tratamento especial porque pode conter conteúdo ativo.

Possíveis estratégias:

```text
1. bloquear completamente SVG
```

ou:

```text
2. sanitizar com biblioteca confiável
```

Nunca aceite SVG arbitrário como uma imagem comum.

---

# Storage

Estrutura conceitual:

```text
tenant-id/
   user-id/
      arquivo.ext
```

Policies de Storage também precisam ser revisadas.

Não dependa apenas das policies das tabelas PostgreSQL.

---

# 🤖 Cloudflare Turnstile — planejado

Turnstile não terá chaves reais armazenadas nesta base.

Em cada projeto derivado:

1. criar o widget;
2. obter Site Key;
3. obter Secret Key;
4. configurar variáveis de ambiente;
5. configurar proteção no Supabase/Auth quando aplicável;
6. adicionar widget ao fluxo público;
7. validar token no servidor;
8. testar em staging;
9. somente depois habilitar em produção.

---

# 🧾 Auditoria — planejado

Operações sensíveis deverão produzir logs persistentes.

Exemplo de eventos:

```text
auth.login.failed
auth.login.rate_limited

user.role.changed
user.deleted

project.deleted

member.invited
member.removed

security.permission.changed

export.created
```

Um log deve registrar, quando aplicável:

```text
event
user_id
tenant_id
target_id
ip/fingerprint
timestamp
metadata segura
```

Nunca registre:

```text
senha
token
secret
cookie de sessão
dados sensíveis completos
```

---

# 📋 Tabela de auditoria planejada

Exemplo:

```sql
CREATE TABLE audit_logs (
  id uuid PRIMARY KEY
    DEFAULT gen_random_uuid(),

  user_id uuid,

  organization_id uuid,

  event text NOT NULL,

  target_type text,

  target_id uuid,

  metadata jsonb,

  created_at timestamptz
    NOT NULL DEFAULT now()
);
```

A implementação final deverá definir:

* quem pode inserir;
* quem pode ler;
* retenção;
* acesso administrativo;
* RLS;
* prevenção contra alteração de logs.

---

# 🧠 Enumeração de recursos

Mensagens não devem revelar desnecessariamente se determinado recurso existe.

Exemplo ruim:

```text
Este e-mail não está cadastrado.
```

Melhor:

```text
E-mail ou senha inválidos.
```

O login atual já utiliza resposta genérica.

O mesmo princípio deve ser aplicado a:

* reset de senha;
* convites;
* organizações;
* usuários;
* recursos privados.

---

# 🔐 Reset de senha — planejado

Fluxo futuro:

```text
email
 ↓
Zod
 ↓
IP
 ↓
passwordReset rate limit
 ↓
Turnstile
 ↓
Supabase resetPasswordForEmail()
 ↓
resposta genérica
```

Nunca confirmar publicamente se o e-mail existe.

---

# ✉️ Convites — planejado

Fluxo:

```text
auth
 ↓
permission
 ↓
Zod
 ↓
invitation rate limit
 ↓
verificar tenant
 ↓
enviar convite
 ↓
audit
```

---

# 🔐 Content Security Policy — planejado

A configuração final deverá revisar:

```text
default-src
script-src
style-src
img-src
font-src
connect-src
frame-src
object-src
base-uri
form-action
frame-ancestors
```

Evite:

```text
unsafe-inline
unsafe-eval
*
```

sem justificativa técnica.

---

# 🛡️ Security Headers — planejado

Revisar:

```text
Content-Security-Policy
Referrer-Policy
Permissions-Policy
X-Content-Type-Options
Strict-Transport-Security
```

Alguns headers dependem da infraestrutura de deploy.

---

# 🧪 Testes — planejado

A base deverá possuir testes para:

## Auth

```text
login válido
login inválido
cadastro
logout
sessão expirada
```

## Segurança

```text
usuário A não acessa dados de B
cliente não executa ação de admin
usuário não acessa outro tenant
rate limit bloqueia corretamente
redirect externo é rejeitado
```

## RLS

Testar policies com:

```text
anon
cliente
admin
tenant A
tenant B
```

---

# 🔁 CI — planejado

Pipeline mínima:

```text
push / pull request
       │
       ▼
npm ci
       │
       ▼
lint
       │
       ▼
typecheck
       │
       ▼
tests
       │
       ▼
build
```

Nenhum deploy deve ser considerado válido se o build falhar.

---

# 🌎 Ambientes

Recomendação:

```text
LOCAL
  ↓
STAGING
  ↓
PRODUCTION
```

Nunca teste alterações estruturais de banco diretamente em produção.

Cada ambiente deve possuir:

* Supabase próprio;
* banco próprio;
* secrets próprios;
* Redis/Upstash apropriado;
* variáveis próprias.

---

# 🚫 Produção não é ambiente de teste

Não faça:

```text
alterar migration
      ↓
rodar produção
      ↓
ver se funciona
```

Faça:

```text
alterar
 ↓
local
 ↓
testes
 ↓
staging
 ↓
validação
 ↓
produção
```

---

# 🔑 Secrets

Nunca faça commit de:

```text
.env
.env.local
service role key
secret key
API token
Redis token
private key
```

Se um secret for enviado ao Git:

1. considere comprometido;
2. revogue;
3. gere outro;
4. remova do código;
5. configure como secret da plataforma;
6. avalie remoção do histórico Git.

Somente apagar do último commit não torna um secret antigo seguro.

---

# 🛠️ Como criar uma nova funcionalidade

Exemplo:

```text
Criar gerenciamento de clientes
```

## Banco

```text
supabase/migrations/
```

Crie migration:

```bash
supabase migration new create_clients
```

Depois:

```text
CREATE TABLE
 ↓
ENABLE RLS
 ↓
POLICIES
 ↓
INDEXES
 ↓
GRANTS
```

---

## Validação

Crie schema Zod.

Exemplo:

```text
src/lib/validators/client.ts
```

---

## Server Action

```text
src/actions/clients.ts
```

---

## Fluxo

```text
input
 ↓
zod
 ↓
requireUser
 ↓
requirePermission
 ↓
rateLimit
 ↓
supabase server
 ↓
RLS
 ↓
audit
 ↓
revalidate
```

---

## UI

Somente depois conecte:

```text
component
 ↓
action
```

A UI não decide se uma operação é autorizada.

---

# 🧩 Onde colocar cada coisa

| Tipo                | Local                            |
| ------------------- | -------------------------------- |
| Server Action       | `src/actions/`                   |
| Auth helper         | `src/lib/auth/`                  |
| Rate limit          | `src/lib/security/`              |
| Validators          | `src/lib/validators/`            |
| Supabase server     | `src/lib/supabase/server.ts`     |
| Supabase admin      | `src/lib/supabase/admin.ts`      |
| Browser client      | `src/lib/supabase/supabase.ts`   |
| Middleware Supabase | `src/lib/supabase/middleware.ts` |
| Route Handler       | `src/app/api/**/route.ts`        |
| Migration           | `supabase/migrations/`           |
| Componentes UI      | `src/components/`                |
| Tipos               | `src/types/`                     |

---

# 🧱 Estrutura alvo

Ao finalizar a base, a estrutura deve ficar próxima de:

```text
src/
│
├── actions/
│   ├── auth.ts
│   ├── profile.ts
│   └── ...
│
├── app/
│
├── components/
│
├── lib/
│   │
│   ├── auth/
│   │   ├── get-current-user.ts
│   │   ├── require-user.ts
│   │   ├── require-role.ts
│   │   └── require-permission.ts
│   │
│   ├── audit/
│   │   └── audit-log.ts
│   │
│   ├── security/
│   │   ├── client-ip.ts
│   │   ├── rate-limit.ts
│   │   ├── upload.ts
│   │   └── turnstile.ts
│   │
│   ├── supabase/
│   │   ├── admin.ts
│   │   ├── client.ts
│   │   ├── middleware.ts
│   │   └── server.ts
│   │
│   └── validators/
│
├── middleware.ts
│
└── types/

supabase/
│
├── migrations/
│
└── config.toml

.github/
└── workflows/
    └── ci.yml
```

---

# ✅ Checklist — criar novo projeto a partir desta base

## Código

* [ ] Criar novo repositório a partir da base
* [ ] Alterar nome do projeto
* [ ] Alterar metadata
* [ ] Escolher npm ou pnpm
* [ ] Remover lockfile não utilizado
* [ ] Remover arquivos antigos/legados
* [ ] Revisar dependências

## Supabase

* [ ] Criar projeto Supabase
* [ ] Criar projeto separado para staging
* [ ] Configurar URL
* [ ] Configurar Publishable Key
* [ ] Configurar Secret Key somente no servidor
* [ ] Configurar Supabase CLI
* [ ] Definir schema
* [ ] Substituir placeholders das migrations
* [ ] Criar tabelas
* [ ] Criar índices
* [ ] Habilitar RLS
* [ ] Criar policies
* [ ] Revisar grants/revokes
* [ ] Criar triggers
* [ ] Criar functions
* [ ] Testar migration do zero
* [ ] Testar policies com usuários diferentes

## Auth

* [ ] Configurar URL do projeto
* [ ] Configurar redirect URLs
* [ ] Definir política de senha
* [ ] Definir confirmação de e-mail
* [ ] Criar trigger Auth → profile
* [ ] Garantir role padrão segura
* [ ] Impedir role administrativa no cadastro público
* [ ] Testar login
* [ ] Testar cadastro
* [ ] Testar logout
* [ ] Testar sessão expirada

## Upstash

* [ ] Criar Redis
* [ ] Configurar `UPSTASH_REDIS_REST_URL`
* [ ] Configurar `UPSTASH_REDIS_REST_TOKEN`
* [ ] Gerar `RATE_LIMIT_HASH_SECRET`
* [ ] Revisar limites conforme o projeto
* [ ] Testar HTTP 429

## Infraestrutura

* [ ] Definir local
* [ ] Definir staging
* [ ] Definir produção
* [ ] Configurar secrets separadamente
* [ ] Configurar `TRUSTED_CLIENT_IP_HEADER` quando necessário
* [ ] Confirmar IP correto em produção

## Turnstile

* [ ] Criar widget Cloudflare Turnstile
* [ ] Obter Site Key
* [ ] Obter Secret Key
* [ ] Configurar env
* [ ] Integrar formulário
* [ ] Validar token no servidor
* [ ] Configurar integração com Auth quando utilizada
* [ ] Testar staging

## Storage

* [ ] Criar buckets
* [ ] Definir público ou privado
* [ ] Criar policies de Storage
* [ ] Definir limite de tamanho
* [ ] Validar MIME
* [ ] Validar extensão
* [ ] Definir tratamento de SVG
* [ ] Testar tentativa de acesso de outro usuário

## Segurança

* [ ] Revisar todas as Server Actions
* [ ] Todas validam entrada?
* [ ] Todas autenticam quando necessário?
* [ ] Todas autorizam?
* [ ] Rate limit aplicado onde necessário?
* [ ] RLS está ativa?
* [ ] Policies foram testadas?
* [ ] Nenhuma operação comum usa admin client sem necessidade?
* [ ] Erros não expõem banco?
* [ ] Não existe enumeração?
* [ ] Redirects estão protegidos?
* [ ] CSP revisada?
* [ ] Security headers configurados?
* [ ] Secrets fora do Git?

## Auditoria

* [ ] Criar tabela de audit logs
* [ ] Definir eventos
* [ ] Definir retenção
* [ ] Impedir alteração indevida
* [ ] Não armazenar secrets
* [ ] Registrar mutations sensíveis

## Testes

* [ ] Unit tests
* [ ] Auth tests
* [ ] Authorization tests
* [ ] RLS tests
* [ ] Rate limit tests
* [ ] Upload tests
* [ ] Build production

## CI/CD

* [ ] Criar workflow CI
* [ ] Instalação limpa
* [ ] Lint
* [ ] TypeScript
* [ ] Testes
* [ ] Build
* [ ] Bloquear merge quando CI falhar

## Produção

* [ ] Backup configurado
* [ ] Logs configurados
* [ ] Monitoramento configurado
* [ ] Secrets de produção próprios
* [ ] Banco separado de staging
* [ ] Migration testada antes do deploy
* [ ] Rollback planejado

---

# 🚧 Roadmap da base

## Segurança de aplicação

* [x] Server Actions para autenticação
* [x] Zod
* [x] Rate limiting
* [x] HMAC para identificadores
* [x] IP confiável
* [x] Middleware
* [ ] Helpers de autorização
* [ ] Auditoria persistente
* [ ] Turnstile
* [ ] CSP
* [ ] Security headers
* [ ] Upload validation
* [ ] Storage seguro

## Banco

* [x] Estrutura de migrations
* [x] Template para habilitar RLS
* [ ] Schema definitivo da base
* [ ] Trigger Auth → usuário
* [ ] Policies completas
* [ ] Grants/revokes
* [ ] Functions auxiliares
* [ ] Testes automatizados de RLS

## Infraestrutura

* [x] Upstash Redis
* [ ] CI
* [ ] Testes
* [ ] Observabilidade
* [ ] Documentação de deploy
* [ ] Estratégia de backup
* [ ] Estratégia de rollback

---

# 🎯 Objetivo final

O objetivo deste projeto é permitir que um novo SaaS comece com uma arquitetura semelhante a:

```text
                    ┌─────────────┐
                    │   Browser   │
                    └──────┬──────┘
                           │
                           ▼
                    ┌─────────────┐
                    │  Next.js    │
                    │ Server      │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
              ▼            ▼            ▼
           AUTH        RATE LIMIT   VALIDATION
              │            │            │
              └────────────┼────────────┘
                           │
                           ▼
                    AUTHORIZATION
                           │
                           ▼
                    SUPABASE SSR
                           │
                           ▼
                       POSTGRES
                           │
                           ▼
                          RLS
                           │
                           ▼
                        POLICY
```

A segurança não deve depender de uma única camada.

O objetivo é aplicar **defesa em profundidade**:

```text
UI
+
Server Actions
+
Authentication
+
Authorization
+
Rate Limiting
+
Validation
+
RLS
+
Policies
+
Audit
+
Infrastructure
```

---

# 📄 Licença

Apache 2.0.

---

# 👨‍💻 Autor

**Jason Tralli**

GitHub: `@JTrallii`

---

> **Software não precisa apenas funcionar.**
>
> **Precisa continuar funcionando quando o sistema evolui.**
