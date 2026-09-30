"use server";

import { z } from "zod";

import { requireAuthenticatedUser } from "@/lib/auth/require-authenticated-user";

import { recordAuditEvent } from "@/lib/security/audit-log";

import { getTrustedClientIp } from "@/lib/security/client-ip";

import {
  consumeRateLimits,
  type RateLimitDecision,
} from "@/lib/security/rate-limit";

import { createServerSupabase } from "@/lib/supabase/server";

import { getRecoverySessionUserId } from "@/lib/auth/recovery-session";

/*
 * ============================================================
 * SCHEMAS
 * ============================================================
 */

const requestPasswordResetSchema = z.object({
  email: z
    .string()
    .trim()
    .email("E-mail inválido.")
    .max(254, "E-mail inválido."),

  captchaToken: z
    .string()
    .min(1, "Conclua a verificação de segurança.")
    .max(2048, "Token de segurança inválido."),
});

const completePasswordResetSchema = z
  .object({
    password: z
      .string()
      .min(12, "A senha deve ter pelo menos 12 caracteres.")
      .max(256, "A senha é muito longa.")
      .regex(/[a-z]/, "A senha deve conter uma letra minúscula.")
      .regex(/[A-Z]/, "A senha deve conter uma letra maiúscula.")
      .regex(/[0-9]/, "A senha deve conter um número.")
      .regex(/[^A-Za-z0-9]/, "A senha deve conter um símbolo."),

    confirmPassword: z
      .string()
      .min(1, "Confirme sua senha.")
      .max(256, "A confirmação de senha é inválida."),
  })
  .superRefine((values, context) => {
    if (values.password !== values.confirmPassword) {
      context.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "As senhas não coincidem.",
      });
    }
  });

/*
 * ============================================================
 * RESULTS
 * ============================================================
 */

export type PasswordResetRequestResult =
  | {
      ok: true;
      message: string;
    }
  | {
      ok: false;

      code: "INVALID_INPUT" | "RATE_LIMITED" | "CAPTCHA_FAILED" | "UNAVAILABLE";

      message: string;

      retryAfterSeconds?: number;

      fieldErrors?: Record<string, string[] | undefined>;
    };

export type PasswordResetCompleteResult =
  | {
      ok: true;
      message: string;
    }
  | {
      ok: false;

      code:
        | "INVALID_INPUT"
        | "UNAUTHENTICATED"
        | "RATE_LIMITED"
        | "INVALID_RECOVERY_SESSION"
        | "RESET_FAILED"
        | "UNAVAILABLE";

      message: string;

      retryAfterSeconds?: number;

      fieldErrors?: Record<string, string[] | undefined>;
    };

/*
 * ============================================================
 * CONSTANTES
 * ============================================================
 */

const GENERIC_RESET_MESSAGE =
  "Se existir uma conta para este e-mail, você receberá as instruções para redefinir a senha.";

/*
 * ============================================================
 * HELPERS
 * ============================================================
 */

function getTrustedAppOrigin(): string | null {
  const configuredUrl = process.env.APP_URL?.trim();

  if (!configuredUrl) {
    return null;
  }

  try {
    const url = new URL(configuredUrl);

    /*
     * Não permitimos credenciais embutidas:
     *
     * https://user:password@host
     */
    if (url.username || url.password) {
      return null;
    }

    /*
     * Produção deve utilizar HTTPS.
     *
     * HTTP só é aceito em desenvolvimento local.
     */
    const isLocalhost =
      url.hostname === "localhost" || url.hostname === "127.0.0.1";

    if (
      url.protocol !== "https:" &&
      !(
        process.env.NODE_ENV === "development" &&
        url.protocol === "http:" &&
        isLocalhost
      )
    ) {
      return null;
    }

    return url.origin;
  } catch {
    return null;
  }
}

function passwordResetRateLimitError(
  decision: RateLimitDecision,
): PasswordResetRequestResult {
  return {
    ok: false,

    code: "RATE_LIMITED",

    message: "Muitas tentativas. Aguarde e tente novamente.",

    retryAfterSeconds: decision.retryAfterSeconds,
  };
}

/*
 * ============================================================
 * REQUEST PASSWORD RESET
 *
 * AÇÃO PÚBLICA.
 *
 * Não usa requireAuthenticatedUser(), pois o usuário
 * obviamente ainda não precisa estar autenticado para
 * recuperar a própria senha.
 *
 * Segurança:
 *
 * Zod
 * → IP confiável
 * → rate limit por IP
 * → rate limit IP + e-mail
 * → Turnstile
 * → Supabase Auth
 * → resposta genérica
 * ============================================================
 */

export async function requestPasswordResetAction(
  input: unknown,
): Promise<PasswordResetRequestResult> {
  /*
   * 1. Nunca confiamos no payload recebido.
   */
  const parsed = requestPasswordResetSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,

      code: "INVALID_INPUT",

      message: "Revise os dados informados.",

      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const email = parsed.data.email.toLowerCase();

  /*
   * 2. Rate limiting.
   *
   * Duas chaves:
   *
   * - IP;
   * - IP + e-mail.
   *
   * rate-limit.ts aplica HMAC antes
   * de armazenar o identificador.
   */
  let rateLimit: RateLimitDecision;

  try {
    const ip = await getTrustedClientIp();

    rateLimit = await consumeRateLimits([
      {
        scope: "passwordReset",

        identifier: `ip:${ip}`,
      },

      {
        scope: "passwordReset",

        identifier: `ip:${ip}:email:${email}`,
      },
    ]);
  } catch (error) {
    console.error("Rate limit de recuperação de senha indisponível.", {
      event: "auth.password_reset.rate_limit_unavailable",

      error: error instanceof Error ? error.message : "unknown",
    });

    /*
     * Fail closed.
     */
    return {
      ok: false,

      code: "UNAVAILABLE",

      message:
        "Não foi possível processar a recuperação de senha neste momento.",
    };
  }

  if (!rateLimit.allowed) {
    console.warn("Rate limit de recuperação de senha excedido.", {
      event: "auth.password_reset.rate_limited",

      resetAt: rateLimit.resetAt,
    });

    return passwordResetRateLimitError(rateLimit);
  }

  /*
   * 3. Redirect controlado pelo servidor.
   *
   * Nunca recebemos redirectTo do cliente.
   */
  const appOrigin = getTrustedAppOrigin();

  if (!appOrigin) {
    console.error("APP_URL ausente ou inválida.", {
      event: "auth.password_reset.invalid_app_url",
    });

    return {
      ok: false,

      code: "UNAVAILABLE",

      message:
        "Não foi possível processar a recuperação de senha neste momento.",
    };
  }

  const redirectTo = new URL(
    "/auth/callback?next=%2Fredefinir-senha",
    appOrigin,
  ).toString();

  /*
   * 4. Cliente SSR.
   */
  const supabase = await createServerSupabase();

  /*
   * 5. Solicita e-mail ao Supabase.
   *
   * CAPTCHA é validado pelo próprio
   * Supabase Auth.
   */
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,

      captchaToken: parsed.data.captchaToken,
    });

    /*
     * CAPTCHA inválido não revela
     * existência de conta.
     */
    if (error?.code === "captcha_failed") {
      return {
        ok: false,

        code: "CAPTCHA_FAILED",

        message:
          "A verificação de segurança expirou ou falhou. Tente novamente.",
      };
    }

    /*
     * Rate limit nativo do Supabase.
     */
    if (error?.code === "over_request_rate_limit" || error?.status === 429) {
      return {
        ok: false,

        code: "RATE_LIMITED",

        message: "Muitas tentativas. Aguarde e tente novamente.",
      };
    }

    /*
     * Importante:
     *
     * Não devolvemos erro específico do Auth.
     *
     * Isso reduz risco de enumeração
     * de usuários por comportamento diferente.
     */
    if (error) {
      console.warn("Falha interna ao solicitar recuperação de senha.", {
        event: "auth.password_reset.request_failed",

        authCode: error.code,

        authStatus: error.status,

        ...(process.env.NODE_ENV === "development"
          ? {
              authMessage: error.message,

              authName: error.name,
            }
          : {}),
      });
    }
  } catch (error) {
    /*
     * Mesma resposta externa inclusive
     * para falhas inesperadas do Auth.
     *
     * Não exponha detalhes do backend.
     */
    console.error("Erro inesperado ao solicitar recuperação de senha.", {
      event: "auth.password_reset.unexpected_error",

      error: error instanceof Error ? error.message : "unknown",
    });
  }

  /*
   * Nunca diga:
   *
   * "E-mail não encontrado"
   * "Usuário não existe"
   * "Conta encontrada"
   *
   * O mesmo resultado externo é usado.
   */
  return {
    ok: true,

    message: GENERIC_RESET_MESSAGE,
  };
}

/*
 * ============================================================
 * COMPLETE PASSWORD RESET
 *
 * AÇÃO PRIVADA.
 *
 * Só pode funcionar depois que o link de recovery
 * estabelecer uma sessão válida no Supabase.
 *
 * Segurança:
 *
 * Zod
 * → requireAuthenticatedUser()
 * → getUser()
 * → rateLimit sensitiveMutation
 * → updateUser()
 * → Audit Log
 * → global sign-out
 * ============================================================
 */

export async function completePasswordResetAction(
  input: unknown,
): Promise<PasswordResetCompleteResult> {
  /*
   * 1. Validação do cliente.
   */
  const parsed = completePasswordResetSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,

      code: "INVALID_INPUT",

      message: "Revise os dados informados.",

      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  /*
   * 2. Autenticação real + rate limit.
   *
   * requireAuthenticatedUser usa auth.getUser(),
   * portanto a identidade é confirmada pelo
   * Supabase Auth.
   */
  const auth = await requireAuthenticatedUser({
    rateLimitScope: "sensitiveMutation",
  });

  if (!auth.ok) {
    return {
      ok: false,

      code: auth.code,

      message: auth.message,

      retryAfterSeconds: auth.retryAfterSeconds,
    };
  }

  const { userId, supabase } = auth.context;

  /*
   * 3. Confirma que esta sessão foi criada
   * especificamente pelo fluxo de recovery.
   *
   * Estar autenticado não é suficiente.
   *
   * Uma sessão comum de login NÃO pode usar
   * esta Server Action para redefinir senha.
   */
  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();

  const recoveryUserId = claimsError
    ? null
    : getRecoverySessionUserId(claimsData?.claims);

  if (!recoveryUserId || recoveryUserId !== userId) {
    console.warn(
      "Tentativa de redefinição de senha sem sessão de recovery válida.",
      {
        event: "auth.password_reset.invalid_recovery_session",

        actorUserId: userId,

        claimsError: claimsError ? true : false,
      },
    );

    await recordAuditEvent({
      eventType: "auth.password_reset",

      outcome: "denied",

      actorUserId: userId,

      resourceType: "auth_user",

      resourceId: userId,

      metadata: {
        reason: "invalid_recovery_session",
      },
    });

    return {
      ok: false,

      code: "INVALID_RECOVERY_SESSION",

      message:
        "A sessão de recuperação é inválida ou expirou. Solicite um novo link.",
    };
  }

  /*
   * 3. Alteração da senha.
   *
   * Não recebemos userId do cliente.
   * Não usamos supabaseAdmin.
   *
   * updateUser atua sobre o usuário
   * autenticado da própria sessão.
   */
  const { error: updateError } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (updateError) {
    if (updateError.code === "same_password") {
      await recordAuditEvent({
        eventType: "auth.password_reset",

        outcome: "denied",

        actorUserId: userId,

        resourceType: "auth_user",

        resourceId: userId,

        metadata: {
          reason: "same_password",
        },
      });

      return {
        ok: false,

        code: "RESET_FAILED",

        message: "A nova senha deve ser diferente da senha atual.",
      };
    }
    console.warn("Falha ao redefinir senha.", {
      event: "auth.password_reset.update_failed",

      authCode: updateError.code,

      authStatus: updateError.status,

      ...(process.env.NODE_ENV === "development"
        ? {
            authMessage: updateError.message,

            authName: updateError.name,
          }
        : {}),
    });

    /*
     * Auditamos apenas contexto sem segredos.
     *
     * Nunca registrar nova senha.
     */
    await recordAuditEvent({
      eventType: "auth.password_reset",

      outcome: "failure",

      actorUserId: userId,

      resourceType: "auth_user",

      resourceId: userId,
    });

    return {
      ok: false,

      code: "RESET_FAILED",

      message:
        "Não foi possível redefinir a senha. Solicite um novo link e tente novamente.",
    };
  }

  /*
   * 4. Audit Log da operação concluída.
   */
  await recordAuditEvent({
    eventType: "auth.password_reset",

    outcome: "success",

    actorUserId: userId,

    resourceType: "auth_user",

    resourceId: userId,
  });

  /*
   * 5. Após recovery, revogamos refresh
   * tokens globalmente.
   *
   * A senha já foi alterada neste ponto.
   * Portanto uma falha de logout não pode
   * fazer a action afirmar que o reset falhou.
   */
  const { error: signOutError } = await supabase.auth.signOut({
    scope: "global",
  });

  if (signOutError) {
    console.error("Senha redefinida, mas o sign-out global falhou.", {
      event: "auth.password_reset.global_signout_failed",

      authCode: signOutError.code,

      authStatus: signOutError.status,
    });

    /*
     * Tenta pelo menos invalidar a
     * sessão local/cookies atuais.
     */
    const { error: localSignOutError } = await supabase.auth.signOut({
      scope: "local",
    });

    if (localSignOutError) {
      console.error("Sign-out local também falhou após redefinição de senha.", {
        event: "auth.password_reset.local_signout_failed",

        authCode: localSignOutError.code,

        authStatus: localSignOutError.status,
      });
    }
  }

  return {
    ok: true,

    message:
      "Senha redefinida com sucesso. Faça login novamente com a nova senha.",
  };
}
