# SaaS Base — Next.js 15 + Supabase

Base reutilizável para iniciar aplicações SaaS com **Next.js, React, TypeScript, Supabase Auth, PostgreSQL e Upstash Redis**, priorizando segurança server-side e uma estrutura que possa ser adaptada a diferentes domínios de negócio.

O repositório fornece a fundação técnica de autenticação, sessão, rate limiting, validação, auditoria e utilitários de segurança. **Não é um SaaS de domínio completo**: regras de negócio, autorização por organização/tenant, modelo definitivo do banco e funcionalidades específicas devem ser construídos no projeto derivado.

## 1. Status real da implementação

A tabela diferencia código existente de recursos que ainda dependem de configuração ou de uma etapa posterior no Supabase.

| Recurso | Situação | Observação |
|---|---|---|
| Next.js App Router + TypeScript | Implementado | Next.js 15.5.27, React 19.2.8 e TypeScript strict |
| Layout e componentes reutilizáveis | Implementado | Tailwind CSS, Radix UI, componentes de interface e tema escuro |
| Supabase Browser Client | Implementado | Usa URL e Publishable Key |
| Supabase Server Client | Implementado | Usa cookies SSR e Publishable Key |
| Supabase Admin Client | Implementado | Server-only; usa SUPABASE_SECRET_KEY |
| Cadastro, login e logout | Implementado no código | Server Actions com Zod, CAPTCHA e rate limit |
| Proteção de rotas | Implementado | Middleware protege /dashboard e /settings |
| Recuperação de senha | Implementado no código | Solicitação, callback e redefinição com sessão de recovery |
| Alteração de senha | Implementado no código | Senha atual, reautenticação quando necessária e encerramento global de sessões |
| Rate limiting | Implementado no código | Upstash Redis, escopos separados e identificadores protegidos por HMAC |
| Identificação de IP confiável | Implementado no código | Desenvolvimento, Vercel ou header de proxy configurado |
| Cloudflare Turnstile | Integração implementada | Chaves e validação no Supabase Auth precisam estar configuradas em cada ambiente |
| CSP e security headers | Configurados | A política atual ainda permite unsafe-inline; unsafe-eval é permitido em desenvolvimento |
| Auditoria server-side | Infraestrutura implementada | Helper e migration existem; aplicação da migration no Supabase precisa ser feita e verificada |
| Validação de arquivos | Implementada como helper | Não existe ainda uma tela ou Server Action pública de upload conectada ao helper |
| Normalização de imagens | Implementada como helper | JPEG, PNG e WebP são processados e armazenados como WebP |
| Storage privado | Migration e template criados | A aplicação remota e os testes de policies continuam pendentes |
| Keep-alive do Supabase | Função SQL criada | Não existe agendamento externo configurado; a função não executa sozinha |
| Autorização genérica por role/permissão/tenant | Não implementada | Existe apenas um helper de resultado de autorização |
| Modelo definitivo e genérico do banco | Pendente | Migrations antigas precisam ser reorganizadas em conjunto |
| Testes automatizados e CI | Não implementados | Não há diretório de testes nem workflow GitHub Actions |
| Tipos gerados do banco Supabase | Não implementados | src/types/index.ts contém apenas tipos TypeScript da aplicação |

**Importante:** “implementado no código” não significa que as variáveis, serviços externos, configurações do painel Supabase ou migrations já estejam configurados em produção.

## 2. Stack e versões

### Aplicação

- Next.js 15.5.27
- React 19.2.8
- TypeScript
- App Router
- Server Actions
- Tailwind CSS 3
- Radix UI
- Lucide React
- Sonner

### Backend e serviços

- Supabase Auth
- Supabase SSR
- Supabase JavaScript Client
- PostgreSQL
- Supabase Storage
- Supabase CLI 2.120.0
- Upstash Redis
- Upstash Rate Limit

### Segurança e processamento

- Zod para validação de entrada
- HMAC SHA-256 para proteger identificadores usados no rate limit
- Sharp para decodificação e normalização de imagens
- Cloudflare Turnstile para CAPTCHA
- módulos server-only para impedir importação acidental de código privilegiado no browser

O package.json é a fonte das versões e dependências. O repositório contém package-lock.json e pnpm-lock.yaml; a escolha de um único gerenciador de pacotes ainda precisa ser padronizada.

## 3. Arquitetura e fronteiras de segurança

A interface é considerada uma origem não confiável. Esconder um botão ou proteger uma página não impede que alguém tente chamar uma Server Action diretamente.

Fluxo de referência para operações autenticadas:

1. Browser envia dados não confiáveis.
2. Server Action valida a entrada com Zod.
3. A action confirma a identidade no Supabase Auth.
4. O rate limit é aplicado quando a operação exige essa proteção.
5. A regra de autorização específica da funcionalidade deve ser verificada.
6. A operação usa o Supabase Server Client e permanece sujeita à RLS.
7. Eventos sensíveis são enviados ao helper de auditoria.
8. A action retorna uma resposta controlada ou redireciona.

Para operações de Storage, o helper atual usa uma rota server-side privilegiada depois de validar o arquivo, autenticar o usuário e aplicar rate limit. A Secret Key não deve ser enviada ao navegador.

### Responsabilidades separadas

- **Middleware:** atualiza cookies e protege a navegação em rotas privadas.
- **Server Action:** valida a operação, autentica o ator e aplica as verificações necessárias.
- **RLS:** limita o acesso ao banco conforme as policies realmente aplicadas.
- **Admin Client:** reservado para operações server-side que precisam de privilégio elevado; não é o cliente padrão para mutations de usuários.

### Limite atual da autorização

O arquivo src/lib/auth/authorization.ts exporta os helpers authorized(), forbidden() e notFound(), além dos tipos de resultado. Ele **não** implementa RBAC, permissões por recurso, membership, isolamento multi-tenant ou regras administrativas genéricas. Cada funcionalidade que vier a ser criada ainda precisará definir e validar sua autorização no servidor e no banco.

## 4. Funcionalidades e rotas existentes

| Rota | Acesso | Implementação |
|---|---|---|
| / | Público | Página inicial do template |
| /login | Público | Login por e-mail e senha, Turnstile e redirect interno seguro |
| /cadastro | Público | Cadastro com nome, sobrenome, e-mail, senha e confirmação |
| /dashboard | Protegido | Exibe informações básicas do usuário e permite logout |
| /esqueci-senha | Público | Solicita e-mail de recuperação com resposta genérica |
| /auth/callback | Callback do Supabase | Troca o código de recovery por uma sessão |
| /redefinir-senha | Sessão de recovery | Só permite redefinir senha com claims de recovery válidos |
| /settings/security | Protegido | Tela de alteração de senha |

O middleware protege /dashboard, seus subcaminhos, /settings e seus subcaminhos. A página e a action também devem confirmar a identidade quando executam operações sensíveis; o middleware não substitui essa validação.

### 4.1 Cadastro

- Validação server-side com Zod.
- Nome e sobrenome obrigatórios.
- E-mail normalizado para minúsculas.
- Senha com pelo menos 12 caracteres, incluindo maiúscula, minúscula, número e símbolo.
- Confirmação de senha.
- Turnstile.
- Rate limit por IP e por combinação IP + e-mail.
- Cadastro feito com o cliente Supabase SSR, sem usar o Admin Client.
- Metadata enviada ao Supabase Auth contém nome, sobrenome e cadastro_tipo = cliente.
- O Supabase pode exigir confirmação de e-mail, conforme a configuração do projeto.

O trigger SQL antigo de cadastro está vinculado ao schema operon e espera tabelas específicas. Como o conjunto de migrations ainda será refeito, não considere a sincronização Auth → perfil interno como uma fundação genérica concluída.

### 4.2 Login

- Validação server-side com Zod.
- E-mail normalizado.
- Turnstile.
- Rate limit por IP e por IP + e-mail.
- Resposta genérica para credenciais inválidas, reduzindo enumeração de contas.
- Redirect limitado a caminhos internos da aplicação.
- Sessão gerenciada por cookies através do Supabase SSR.

### 4.3 Logout

O logout usa Supabase Auth com scope local, encerrando a sessão atual. O logout global é usado depois da alteração ou redefinição de senha.

### 4.4 Recuperação de senha

O fluxo é dividido em três partes:

1. /esqueci-senha recebe e valida o e-mail e o token Turnstile.
2. requestPasswordResetAction aplica rate limit por IP, IP + e-mail e e-mail; solicita o reset ao Supabase Auth e devolve uma mensagem genérica.
3. /auth/callback troca o código por uma sessão e só aceita o destino interno /redefinir-senha.

A página /redefinir-senha e a action completePasswordResetAction exigem uma sessão autenticada originada do fluxo de recovery. A action consulta getUser() e getClaims(), confere o usuário e o método AMR recovery, altera a senha, registra auditoria e tenta revogar as sessões globalmente.

### 4.5 Alteração de senha

A tela /settings/security permite informar a senha atual e a nova senha. A action:

- valida os campos com Zod;
- exige usuário autenticado;
- aplica o escopo sensitiveMutation;
- envia a senha atual ao Supabase Auth;
- trata senha atual incorreta, senha fraca, senha repetida e reautenticação necessária;
- solicita código de reautenticação quando o Supabase exigir uma sessão recente;
- registra os resultados no helper de auditoria;
- tenta encerrar globalmente as sessões após a alteração.

A configuração local supabase/config.toml habilita secure_password_change. A configuração equivalente também precisa ser conferida no projeto Supabase hospedado. Alteração de e-mail não faz parte desta implementação.

## 5. Rate limiting

Implementação em src/lib/security/rate-limit.ts, usando Upstash Redis e @upstash/ratelimit.

Os identificadores de IP, e-mail e usuário são transformados com HMAC-SHA256 antes de serem utilizados como chave no Redis. O segredo usado para isso é RATE_LIMIT_HASH_SECRET.

| Escopo | Limite configurado | Uso atual |
|---|---:|---|
| loginIp | 20 por minuto | Login |
| loginCredential | 5 por minuto | Login por IP + e-mail |
| registerIp | 5 por hora | Cadastro |
| registerCredential | 3 por hora | Cadastro por IP + e-mail |
| mutation | Token bucket: 20 tokens por 10 segundos, capacidade 40 | Disponível para mutations futuras |
| sensitiveMutation | 10 por minuto | Alteração e redefinição de senha |
| upload | 10 por minuto | Helper de upload |
| exportUser | 3 por hora | Configurado, sem fluxo de exportação implementado |
| exportTenant | 10 por dia | Configurado, sem fluxo multi-tenant de exportação |
| passwordReset | 3 por hora | Solicitação de recuperação |
| invitation | 10 por hora | Configurado, sem fluxo de convites implementado |

As actions que dependem explicitamente de rate limit falham de forma fechada quando o serviço não pode ser consultado: a operação não continua sem a proteção solicitada.

O helper createRateLimitHeaders() também gera os headers Cache-Control, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset e Retry-After quando bloqueado. Ainda não há Route Handler de negócio que exponha esse padrão.

## 6. Identificação de IP e URL da aplicação

### IP confiável

Arquivo: src/lib/security/client-ip.ts.

- Desenvolvimento: retorna 127.0.0.1.
- Vercel: utiliza x-vercel-forwarded-for.
- Outras infraestruturas: exige TRUSTED_CLIENT_IP_HEADER configurado para um header que o proxy controlado sobrescreva.

Não confie cegamente em x-forwarded-for quando o cliente puder fornecer esse header sem que o proxy o remova e substitua.

### APP_URL

Arquivo: src/lib/security/app-url.ts.

APP_URL precisa ser uma origem válida, sem credenciais, caminho, query string ou fragmento. HTTPS é aceito; HTTP é permitido somente para localhost em desenvolvimento. O callback de recuperação usa essa origem para montar o redirect.

## 7. Upload, imagens e Storage

### 7.1 Validação de arquivos

Arquivo: src/lib/security/file-upload.ts.

Valores padrão:

- Tamanho máximo: 5 MiB.
- MIME types aceitos: image/jpeg, image/png, image/webp e application/pdf.
- SVG é rejeitado.
- Extensão precisa corresponder ao MIME declarado.
- Nome de arquivo é validado.
- A assinatura inicial do conteúdo é conferida para JPEG, PNG, WebP e PDF.

O MIME informado pelo browser não é considerado prova suficiente do formato real.

### 7.2 Normalização de imagens

Arquivo: src/lib/security/image-normalization.ts.

JPEG, PNG e WebP são decodificados com Sharp e reconstruídos como um novo arquivo WebP. O processamento:

- confere se o formato decodificado corresponde ao MIME informado;
- rejeita imagens animadas ou multipágina;
- limita largura e altura a 4096 pixels;
- limita o total de pixels a 4096 × 4096;
- aplica orientação EXIF;
- converte para sRGB;
- não preserva EXIF, XMP, IPTC ou outros metadados;
- usa qualidade WebP padrão 82;
- limita a saída normalizada a 5 MiB.

PDF não passa pela conversão de imagem; permanece sujeito às validações de arquivo e assinatura.

### 7.3 Helper de upload autenticado

Arquivo: src/lib/security/authenticated-upload.ts.

uploadAuthenticatedFile() executa:

1. validação do arquivo;
2. validação do nome do bucket;
3. autenticação via requireAuthenticatedUser();
4. rate limit no escopo upload;
5. validação da assinatura do arquivo;
6. normalização de imagens para WebP;
7. geração server-side do caminho userId/UUID.ext;
8. envio ao Supabase Storage com Admin Client e upsert desabilitado;
9. tentativa de registrar sucesso ou falha na auditoria.

**Limite atual:** o helper está implementado, mas a árvore atual não contém uma Server Action, Route Handler ou tela de upload que o invoque. Portanto, existe a camada reutilizável de processamento e persistência, mas não um fluxo de upload completo conectado à interface.

### 7.4 Bucket privado

A migration 20261009195450_create_private_user_files_storage.sql define o bucket private-user-files com:

- bucket privado;
- limite de 5 MiB;
- MIME types image/webp e application/pdf;
- caminho no formato user-id/UUID.ext;
- policy de SELECT limitada à pasta do próprio auth.uid();
- ausência de policies de INSERT, UPDATE e DELETE para authenticated.

A arquitetura pretendida é que escrita e exclusão passem pelo backend, não diretamente pelo browser. A migration precisa ser incorporada à reestruturação final do banco, aplicada no ambiente correto e testada antes de considerar o Storage operacional no Supabase remoto.

O template reutilizável fica em supabase/templates/storage/private-user-files.sql. Antes de usá-lo, substitua BUCKET_NAME e configure o bucket correspondente.

## 8. Auditoria

Arquivo: src/lib/security/audit-log.ts.

recordAuditEvent() envia eventos para a função RPC public.write_audit_event usando o Admin Client. O helper:

- aceita outcome success, failure ou denied;
- registra ator, tipo e identificador do recurso;
- sanitiza metadados;
- mascara chaves que aparentam conter senha, token, secret, cookie, autorização ou CAPTCHA;
- limita profundidade, quantidade de entradas e tamanho de strings;
- não deve receber senhas, tokens, cookies ou segredos.

A migration 20260826200522_create_audit_log.sql cria audit.events, habilita RLS, restringe acesso direto e define a função de escrita para service_role.

A auditoria é chamada em operações sensíveis de alteração/redefinição de senha e no helper de upload. Isso **não equivale a uma cobertura completa de auditoria da aplicação**: login, cadastro, logout e futuras mutations ainda precisam de uma política de eventos própria. A migration também precisa estar aplicada no banco para que a RPC exista no ambiente.

## 9. Middleware, CSP e headers

### Middleware

- src/middleware.ts delega para updateSession().
- src/lib/supabase/middleware.ts atualiza cookies da sessão.
- getClaims() é usado para validar os claims do access token.
- /dashboard e /settings, incluindo subrotas, exigem JWT válido.
- Usuários não autenticados são enviados para /login com o caminho de retorno.
- O middleware não redireciona automaticamente /login para /dashboard apenas por encontrar um JWT; isso evita ciclos com access tokens antigos após logout global.

A autenticação também deve ser verificada dentro de cada Server Action protegida.

### Headers

A configuração fica em next.config.ts e inclui:

- Content-Security-Policy;
- X-Content-Type-Options: nosniff;
- X-Frame-Options: DENY;
- Referrer-Policy: strict-origin-when-cross-origin;
- Permissions-Policy;
- X-Permitted-Cross-Domain-Policies;
- Strict-Transport-Security em ambiente diferente de desenvolvimento.

A CSP restringe scripts, estilos, imagens, mídia, fontes, conexões, frames, workers e objetos. A política atual ainda permite unsafe-inline para scripts e estilos; unsafe-eval é acrescentado em desenvolvimento. A revisão para uma política baseada em nonce/hash permanece como melhoria de segurança.

O limite de body das Server Actions está configurado em 6 MB.

## 10. Supabase: clientes e configuração

### Browser Client

Arquivo: src/lib/supabase/supabase.ts.

Cria o cliente de navegador com createBrowserClient(), NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Nunca deve receber SUPABASE_SECRET_KEY.

### Server Client

Arquivo: src/lib/supabase/server.ts.

Cria o cliente SSR com cookies da requisição. É utilizado em Server Components, Server Actions e operações executadas em nome do usuário autenticado.

### Admin Client

Arquivo: src/lib/supabase/admin.ts.

Cria um cliente server-only com SUPABASE_SECRET_KEY. É utilizado pelo helper de auditoria e pelo helper de upload. Essa chave nunca deve ser prefixada com NEXT_PUBLIC_ ou importada por Client Components.

### Configuração local

Arquivo: supabase/config.toml.

A configuração versionada inclui, entre outros pontos:

- Supabase local com PostgreSQL major version 17;
- Auth habilitado;
- cadastro por e-mail habilitado;
- confirmação de e-mail habilitada;
- senha mínima de 12 caracteres;
- requisitos de senha com letras maiúsculas, minúsculas, números e símbolos;
- secure_password_change habilitado;
- rotação de refresh token;
- MFA TOTP e phone desabilitados;
- Storage local com limite global de 50 MiB;
- URL local e callback de recovery para localhost.

A seção de CAPTCHA do Supabase Auth está comentada no config.toml. Para usar Turnstile localmente, configure explicitamente o provider e o secret conforme a documentação do Supabase. No projeto hospedado, confira também a configuração de CAPTCHA, URLs de redirect e a exigência de senha atual para alteração de senha.

## 11. Variáveis de ambiente

Copie .env.example para .env.local e preencha os valores do ambiente. Não reutilize secrets entre desenvolvimento, staging e produção.

| Variável | Obrigatória / uso |
|---|---|
| APP_URL | Origem pública da aplicação; HTTPS em produção e localhost em desenvolvimento |
| NEXT_PUBLIC_SUPABASE_URL | URL do projeto Supabase |
| NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | Chave pública do Supabase; pode chegar ao browser |
| SUPABASE_SECRET_KEY | Chave privilegiada; somente servidor, necessária para Admin Client |
| UPSTASH_REDIS_REST_URL | URL REST do Redis Upstash |
| UPSTASH_REDIS_REST_TOKEN | Token REST Upstash; somente servidor |
| RATE_LIMIT_HASH_SECRET | Segredo aleatório forte para HMAC; somente servidor |
| TRUSTED_CLIENT_IP_HEADER | Header confiável do proxy; necessário fora de Vercel e fora do desenvolvimento local |
| NEXT_PUBLIC_TURNSTILE_SITE_KEY | Site Key do widget Turnstile |
| SUPABASE_AUTH_CAPTCHA_SECRET | Secret usado pelo Supabase Auth para validar CAPTCHA; somente servidor |

Variáveis opcionais documentadas no exemplo:

- OPENAI_API_KEY: recursos de IA do Supabase Studio local.
- SUPABASE_AUTH_SMS_TWILIO_AUTH_TOKEN: integração SMS/Twilio futura.
- S3_HOST, S3_REGION, S3_ACCESS_KEY e S3_SECRET_KEY: recursos S3 experimentais do Supabase.

Nunca faça commit de .env, .env.local, chaves privadas, tokens ou credenciais. Variáveis com prefixo NEXT_PUBLIC_ são expostas ao navegador.

## 12. Instalação e comandos

1. Clone o repositório.
2. Instale as dependências com npm install.
3. Crie .env.local a partir de .env.example e configure as credenciais.
4. Configure Supabase Auth, Upstash e Turnstile.
5. Inicie a aplicação com npm run dev.
6. Acesse http://localhost:3000.

Scripts disponíveis em package.json:

| Comando | Finalidade |
|---|---|
| npm run dev | Desenvolvimento |
| npm run build | Build de produção |
| npm run start | Servir o build de produção |
| npm run lint | Executar o lint configurado |

Não existe atualmente script npm de testes ou de typecheck. Não há suíte automatizada nem workflow de CI no repositório. Antes de um deploy, execute ao menos o lint e o build no ambiente de desenvolvimento e valide manualmente os fluxos externos.

### Gerenciador de pacotes

O repositório mantém package-lock.json e pnpm-lock.yaml, além de pnpm-workspace.yaml. Use npm conforme os comandos acima enquanto essa padronização não for concluída; a remoção do lockfile não utilizado deve ser feita em uma etapa própria.

## 13. Banco de dados e migrations

As migrations estão em supabase/migrations/. O estado atual é legado e ainda não representa um baseline genérico pronto para ser aplicado em qualquer projeto.

Arquivos presentes:

| Migration | Responsabilidade / estado |
|---|---|
| 20260703153258_create_table.sql | Template antigo de schema, usuarios e clientes; contém placeholder de schema |
| 20260703153317_ativar_RLS.sql | Template antigo de RLS; contém placeholder e referencia tabelas que não são criadas de forma consistente pelo conjunto |
| 20260703153335_ativar_GRANT.sql | Grants antigos com placeholder de schema |
| 20260703155113_config_policy.sql | Policies de exemplo antigas com placeholders e referências de domínio |
| 20260730202845_create_client_registration_trigger.sql | Trigger legado no schema operon; pressupõe tabelas específicas |
| 20260730203023_create_client_registration_trigger_permition.sql | Recria o trigger legado e suas permissões |
| 20260826200522_create_audit_log.sql | Estrutura audit.events e RPC public.write_audit_event |
| 20261009195221_create_keep_alive_function.sql | Cria public.keep_alive() |
| 20261009195450_create_private_user_files_storage.sql | Define bucket privado e policy de leitura por pasta de usuário |

### Decisão para a etapa de banco

O banco, as migrations antigas e as novas migrations de auditoria, keep-alive e Storage serão revisados e reorganizados juntos em uma etapa posterior. Até essa revisão:

- não trate os arquivos SQL como prova de que o banco remoto já está atualizado;
- não considere os placeholders antigos como migrations prontas;
- não execute supabase db push indiscriminadamente;
- não aplique a cadeia antiga em produção;
- valide a reconstrução do banco do zero e as policies em ambiente isolado antes de promover alterações.

A migration de keep-alive cria apenas uma função SQL que retorna true. Ela **não mantém o projeto ativo por conta própria**. É necessário um agendador externo autorizado para invocá-la periodicamente; esse agendamento ainda não está configurado.

## 14. Mapa de pastas e arquivos

A estrutura abaixo corresponde aos arquivos versionados na branch documentada. Os caminhos são relativos à raiz do repositório.

### 14.1 Arquivos da raiz

| Caminho | Responsabilidade |
|---|---|
| .env.example | Modelo das variáveis de ambiente, sem credenciais reais |
| .gitattributes | Regras de normalização de arquivos no Git |
| .gitignore | Ignora dependências, build, arquivos locais e variáveis de ambiente |
| AI_RULES.md | Orientações do projeto para ferramentas e assistentes de IA |
| LICENSE | Licença Apache 2.0 |
| README.md | Documentação principal do projeto |
| components.json | Configuração de aliases e estilo dos componentes shadcn/ui |
| next-env.d.ts | Referências de tipos geradas pelo Next.js |
| next.config.ts | Configuração do Next.js, CSP, headers e limite de Server Actions |
| package.json | Dependências e scripts npm |
| package-lock.json | Lockfile do npm |
| pnpm-lock.yaml | Lockfile do pnpm; coexistência com npm ainda precisa ser resolvida |
| pnpm-workspace.yaml | Configuração de workspace do pnpm |
| postcss.config.mjs | Configuração do PostCSS/Tailwind |
| tailwind.config.ts | Tema, conteúdo e extensões do Tailwind CSS |
| tsconfig.json | Configuração TypeScript, strict mode e alias @/* |

### 14.2 Ações de servidor — src/actions/

| Caminho | Responsabilidade |
|---|---|
| src/actions/auth.ts | Server Actions de login, cadastro e logout; schemas Zod e redirect interno seguro |
| src/actions/password-change.ts | Solicitação de reautenticação e alteração de senha |
| src/actions/password-reset.ts | Solicitação e conclusão da recuperação de senha |

Não existe atualmente uma action de upload em src/actions/.

### 14.3 Rotas e páginas — src/app/

| Caminho | Responsabilidade |
|---|---|
| src/app/page.tsx | Página inicial pública do template |
| src/app/layout.tsx | Root Layout; carrega usuário no servidor e fornece AuthProvider |
| src/app/globals.css | Estilos globais, variáveis de tema e utilitários |
| src/app/favicon.ico | Favicon da aplicação |
| src/app/login/page.tsx | Formulário de login |
| src/app/cadastro/page.tsx | Formulário de cadastro |
| src/app/dashboard/page.tsx | Dashboard básico do usuário autenticado |
| src/app/esqueci-senha/page.tsx | Formulário para solicitar recuperação de senha |
| src/app/auth/callback/route.ts | Route Handler GET para troca do código de recovery por sessão |
| src/app/redefinir-senha/page.tsx | Valida a sessão de recovery e apresenta o formulário |
| src/app/redefinir-senha/ResetPasswordForm.tsx | Formulário client-side de redefinição de senha |
| src/app/settings/security/page.tsx | Página protegida de segurança da conta |
| src/app/settings/security/PasswordChangeForm.tsx | Formulário de alteração de senha e código de reautenticação |

Não existe diretório src/app/api/ nesta versão. O callback em auth/callback é o único Route Handler listado na árvore atual.

### 14.4 Componentes de segurança — src/components/security/

| Caminho | Responsabilidade |
|---|---|
| src/components/security/TurnstileWidget.tsx | Integra o widget Cloudflare Turnstile no browser e entrega o token ao formulário |

### 14.5 Componentes de interface — src/components/ui/

| Caminho | Responsabilidade |
|---|---|
| src/components/ui/Footer.tsx | Rodapé global |
| src/components/ui/Header.tsx | Cabeçalho, navegação e ações da sessão |
| src/components/ui/Layout.tsx | Layout visual que combina Header, conteúdo e Footer |
| src/components/ui/Modal.tsx | Modal reutilizável |
| src/components/ui/accordion.tsx | Conteúdo expansível em acordeão |
| src/components/ui/alert-dialog.tsx | Diálogo de confirmação/alerta |
| src/components/ui/alert.tsx | Mensagens de alerta |
| src/components/ui/aspect-ratio.tsx | Controle de proporção de conteúdo |
| src/components/ui/avatar.tsx | Avatar |
| src/components/ui/badge.tsx | Badge/etiqueta |
| src/components/ui/breadcrumb.tsx | Navegação hierárquica |
| src/components/ui/button.tsx | Botões e variantes |
| src/components/ui/calendar.tsx | Calendário |
| src/components/ui/card.tsx | Cards e regiões de conteúdo |
| src/components/ui/carousel.tsx | Carrossel |
| src/components/ui/chart.tsx | Componentes de gráficos |
| src/components/ui/checkbox.tsx | Checkbox |
| src/components/ui/collapsible.tsx | Conteúdo recolhível |
| src/components/ui/command.tsx | Interface de comandos e busca |
| src/components/ui/context-menu.tsx | Menu de contexto |
| src/components/ui/dialog.tsx | Diálogo modal |
| src/components/ui/drawer.tsx | Painel deslizante |
| src/components/ui/dropdown-menu.tsx | Menu suspenso |
| src/components/ui/form.tsx | Componentes auxiliares de formulário |
| src/components/ui/hover-card.tsx | Card exibido ao passar o cursor |
| src/components/ui/input-otp.tsx | Entrada de código OTP |
| src/components/ui/input.tsx | Campo de entrada |
| src/components/ui/label.tsx | Label de formulário |
| src/components/ui/menubar.tsx | Barra de menus |
| src/components/ui/navigation-menu.tsx | Menu de navegação |
| src/components/ui/pagination.tsx | Paginação |
| src/components/ui/popover.tsx | Popover |
| src/components/ui/progress.tsx | Indicador de progresso |
| src/components/ui/radio-group.tsx | Grupo de opções exclusivas |
| src/components/ui/resizable.tsx | Painéis redimensionáveis |
| src/components/ui/scroll-area.tsx | Área de rolagem |
| src/components/ui/select.tsx | Campo de seleção |
| src/components/ui/separator.tsx | Separador visual |
| src/components/ui/sheet.tsx | Painel lateral/modal |
| src/components/ui/sidebar.tsx | Barra lateral |
| src/components/ui/skeleton.tsx | Placeholder de carregamento |
| src/components/ui/sonner.tsx | Integração de notificações toast |
| src/components/ui/switch.tsx | Controle liga/desliga |
| src/components/ui/table.tsx | Elementos de tabela |
| src/components/ui/tabs.tsx | Abas |
| src/components/ui/textarea.tsx | Campo de texto multilinha |
| src/components/ui/toggle-group.tsx | Grupo de toggles |
| src/components/ui/toggle.tsx | Toggle individual |
| src/components/ui/tooltip.tsx | Tooltip |

Os componentes de src/components/ui/ são primitivas reutilizáveis de interface. Sua presença não significa que todos já estejam utilizados em páginas do produto.

### 14.6 Contextos e hooks

| Caminho | Responsabilidade |
|---|---|
| src/contexts/AuthContext.tsx | Estado de autenticação para a interface e chamadas às Server Actions |
| src/hooks/use-mobile.tsx | Hook para detectar viewport mobile |
| src/hooks/useModal.ts | Hook para abrir, fechar e alternar modal |

O AuthContext é uma camada de estado visual. Não é a fronteira de segurança do backend.

### 14.7 Autenticação — src/lib/auth/

| Caminho | Responsabilidade |
|---|---|
| src/lib/auth/authorization.ts | Tipos e helpers de resultado: authorized, forbidden e notFound |
| src/lib/auth/get-current-user.ts | Obtém e mapeia o usuário atual com Supabase Auth; server-only |
| src/lib/auth/recovery-session.ts | Confirma se os claims pertencem a uma sessão de recovery |
| src/lib/auth/require-authenticated-user.ts | Confirma usuário com getUser() e aplica rate limit opcional para Server Actions |

### 14.8 Segurança — src/lib/security/

| Caminho | Responsabilidade |
|---|---|
| src/lib/security/app-url.ts | Valida APP_URL e retorna origem confiável |
| src/lib/security/audit-log.ts | Sanitiza metadados e grava eventos via RPC de auditoria |
| src/lib/security/authenticated-upload.ts | Valida, normaliza e envia arquivo ao Storage no servidor |
| src/lib/security/client-ip.ts | Obtém IP de uma origem confiável |
| src/lib/security/file-upload.ts | Valida tamanho, MIME, extensão, nome e assinatura de arquivo |
| src/lib/security/image-normalization.ts | Decodifica e converte imagens para WebP com Sharp |
| src/lib/security/rate-limit.ts | Configura Upstash, HMAC, escopos e headers de rate limit |

### 14.9 Integração Supabase — src/lib/supabase/

| Caminho | Responsabilidade |
|---|---|
| src/lib/supabase/admin.ts | Cria Admin Client server-only com Secret Key |
| src/lib/supabase/middleware.ts | Atualiza sessão/cookies e protege rotas privadas |
| src/lib/supabase/server.ts | Cria cliente Supabase SSR para o servidor |
| src/lib/supabase/supabase.ts | Cria cliente Supabase para o browser |
| src/lib/supabase/utils.ts | Utilitário cn() para combinar classes CSS |

### 14.10 Outros arquivos de src/

| Caminho | Responsabilidade |
|---|---|
| src/middleware.ts | Middleware principal do Next.js; delega para updateSession() |
| src/types/index.ts | Tipos TypeScript de User, AuthState e formulários de autenticação |

### 14.11 Supabase — supabase/

| Caminho | Responsabilidade |
|---|---|
| supabase/.gitignore | Ignora artefatos locais do Supabase CLI |
| supabase/config.toml | Configuração do ambiente Supabase local |
| supabase/templates/storage/private-user-files.sql | Template de policy de leitura para bucket privado; requer substituir BUCKET_NAME |

Migrations presentes:

- supabase/migrations/20260703153258_create_table.sql
- supabase/migrations/20260703153317_ativar_RLS.sql
- supabase/migrations/20260703153335_ativar_GRANT.sql
- supabase/migrations/20260703155113_config_policy.sql
- supabase/migrations/20260730202845_create_client_registration_trigger.sql
- supabase/migrations/20260730203023_create_client_registration_trigger_permition.sql
- supabase/migrations/20260826200522_create_audit_log.sql
- supabase/migrations/20261009195221_create_keep_alive_function.sql
- supabase/migrations/20261009195450_create_private_user_files_storage.sql

## 15. Limitações e próximos trabalhos

Os itens abaixo não devem ser tratados como funcionalidades prontas:

1. **Reorganização do banco:** revisar e rebaselinear migrations antigas e novas em conjunto; definir schema genérico, tabelas, grants, RLS, policies e triggers.
2. **Auth → perfil:** substituir o trigger legado dependente de operon por um fluxo coerente com o modelo genérico escolhido.
3. **Autorização:** implementar regras reais por role, recurso e tenant quando o modelo de domínio estiver definido.
4. **Storage:** aplicar a migration no Supabase correto, testar acesso entre usuários e criar a action/rota que conecta o helper à interface.
5. **Keep-alive:** definir e configurar um agendador externo, se esse recurso for realmente necessário.
6. **Auditoria:** aplicar a migration, validar a RPC e ampliar a cobertura de eventos sem registrar dados secretos.
7. **Turnstile:** configurar o provider e as chaves em cada ambiente, inclusive no Supabase Auth hospedado.
8. **CSP:** avaliar nonce/hash para reduzir dependência de unsafe-inline.
9. **Testes e CI:** adicionar testes de auth, autorização, RLS, rate limit, upload e pipeline de validação.
10. **Tipos de banco:** gerar e versionar tipos do Supabase depois da definição do schema.
11. **Dependências:** executar npm audit no estado atual e revisar os avisos sem aplicar atualizações major automaticamente.
12. **Operação:** documentar staging, deploy, backup, monitoramento e rollback.

Não existe implementação genérica de convites, exportação, gerenciamento de organizações, CRUD de domínio, MFA, alteração de e-mail ou administração de usuários nesta versão.

## 16. Princípio para novas funcionalidades

Ao adicionar uma funcionalidade:

1. Defina o modelo de dados e as permissões no banco.
2. Crie schema Zod para a entrada.
3. Crie Server Action em src/actions/.
4. Confirme a identidade no servidor.
5. Implemente a autorização específica da operação.
6. Aplique rate limit conforme o risco.
7. Use o Server Client quando a operação deve permanecer sujeita à RLS.
8. Use Admin Client somente quando houver justificativa de privilégio elevado.
9. Registre eventos sensíveis com metadados sanitizados.
10. Conecte a interface somente depois de a regra server-side existir.
11. Teste acesso autorizado e tentativas de acesso indevido.

A interface não concede permissão. O middleware não substitui autenticação dentro da action. A autenticação não substitui autorização. RLS e grants precisam ser revisados em conjunto.

## 17. Licença

Este projeto está sob a licença Apache 2.0. Consulte LICENSE para o texto integral.
