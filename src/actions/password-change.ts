"use server";

import { z } from "zod";

import { requireAuthenticatedUser } from "@/lib/auth/require-authenticated-user";
import { recordAuditEvent } from "@/lib/security/audit-log";

/*
 * ============================================================
 * SCHEMA
 * ============================================================
 */

const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, "Informe sua senha atual.")
      .max(1024, "Senha atual inválida."),

    newPassword: z
      .string()
      .min(12, "A nova senha deve ter pelo menos 12 caracteres.")
      .max(256, "A nova senha é muito longa.")
      .regex(/[a-z]/, "A nova senha deve conter uma letra minúscula.")
      .regex(/[A-Z]/, "A nova senha deve conter uma letra maiúscula.")
      .regex(/[0-9]/, "A nova senha deve conter um número.")
      .regex(/[^A-Za-z0-9]/, "A nova senha deve conter um símbolo."),

    confirmPassword: z
      .string()
      .min(1, "Confirme a nova senha.")
      .max(256, "A confirmação de senha é inválida."),

    nonce: z
      .string()
      .trim()
      .regex(/^\d{6}$/, "O código de segurança deve possuir 6 dígitos.")
      .optional(),
  })
  .superRefine((values, context) => {
    if (values.newPassword !== values.confirmPassword) {
      context.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "As novas senhas não coincidem.",
      });
    }
  });

/*
 * ============================================================
 * RESULTS
 * ============================================================
 */

export type PasswordChangeResult =
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
        | "INVALID_CURRENT_PASSWORD"
        | "CURRENT_PASSWORD_REQUIRED"
        | "REAUTHENTICATION_REQUIRED"
        | "INVALID_REAUTHENTICATION_CODE"
        | "SAME_PASSWORD"
        | "WEAK_PASSWORD"
        | "CHANGE_FAILED"
        | "UNAVAILABLE";

      message: string;

      retryAfterSeconds?: number;

      fieldErrors?: Record<string, string[] | undefined>;
    };

export type PasswordChangeReauthenticationResult =
  | {
      ok: true;
      message: string;
    }
  | {
      ok: false;

      code: "UNAUTHENTICATED" | "RATE_LIMITED" | "UNAVAILABLE";

      message: string;

      retryAfterSeconds?: number;
    };

/*
 * ============================================================
 * REQUEST REAUTHENTICATION
 * ============================================================
 */

export async function requestPasswordChangeReauthenticationAction(): Promise<PasswordChangeReauthenticationResult> {
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

  const { error } = await supabase.auth.reauthenticate();

  if (error) {
    if (
      error.code === "over_email_send_rate_limit" ||
      error.code === "over_request_rate_limit" ||
      error.status === 429
    ) {
      await recordAuditEvent({
        eventType: "auth.password_change.reauthentication",
        outcome: "denied",
        actorUserId: userId,
        resourceType: "auth_user",
        resourceId: userId,
        metadata: {
          reason: "rate_limited",
        },
      });

      return {
        ok: false,
        code: "RATE_LIMITED",
        message: "Muitas solicitações. Aguarde e tente novamente.",
      };
    }

    console.warn("Falha ao solicitar reautenticação para alteração de senha.", {
      event: "auth.password_change.reauthentication_failed",
      actorUserId: userId,
      authCode: error.code,
      authStatus: error.status,

      ...(process.env.NODE_ENV === "development"
        ? {
            authMessage: error.message,
            authName: error.name,
          }
        : {}),
    });

    await recordAuditEvent({
      eventType: "auth.password_change.reauthentication",
      outcome: "failure",
      actorUserId: userId,
      resourceType: "auth_user",
      resourceId: userId,
    });

    return {
      ok: false,
      code: "UNAVAILABLE",
      message: "Não foi possível enviar o código de segurança neste momento.",
    };
  }

  await recordAuditEvent({
    eventType: "auth.password_change.reauthentication",
    outcome: "success",
    actorUserId: userId,
    resourceType: "auth_user",
    resourceId: userId,
  });

  return {
    ok: true,
    message: "Enviamos um código de segurança para confirmar a alteração.",
  };
}

/*
 * ============================================================
 * CHANGE PASSWORD
 *
 * Zod
 * ↓
 * Authenticated User
 * ↓
 * Sensitive Rate Limit
 * ↓
 * Current Password
 * ↓
 * Reauthentication nonce, se necessário
 * ↓
 * Supabase Auth
 * ↓
 * Audit Log
 * ↓
 * Global Sign Out
 * ============================================================
 */

export async function changePasswordAction(
  input: unknown,
): Promise<PasswordChangeResult> {
  /*
   * 1. Validação.
   */
  const parsed = changePasswordSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      code: "INVALID_INPUT",
      message: "Revise os dados informados.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  /*
   * 2. Identidade real + rate limit.
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
   * 3. Troca de senha.
   *
   * IMPORTANTE:
   *
   * supabase-js utiliza:
   *
   * currentPassword
   *
   * e NÃO:
   *
   * current_password
   *
   * O SDK converte internamente
   * para o formato esperado pela
   * API do Supabase Auth.
   */
  const { error: updateError } = await supabase.auth.updateUser({
    password: parsed.data.newPassword,

    current_password: parsed.data.currentPassword,

    ...(parsed.data.nonce
      ? {
          nonce: parsed.data.nonce,
        }
      : {}),
  });

  if (updateError) {
    /*
     * Senha atual incorreta.
     */
    if (
      updateError.code === "current_password_invalid" ||
      updateError.code === "invalid_credentials"
    ) {
      await recordAuditEvent({
        eventType: "auth.password_change",
        outcome: "denied",
        actorUserId: userId,
        resourceType: "auth_user",
        resourceId: userId,
        metadata: {
          reason: "invalid_current_password",
        },
      });

      return {
        ok: false,
        code: "INVALID_CURRENT_PASSWORD",
        message: "A senha atual está incorreta.",
      };
    }

    /*
     * Servidor exige a senha atual,
     * mas ela não chegou corretamente.
     *
     * Fail closed.
     */
    if (updateError.code === "current_password_required") {
      await recordAuditEvent({
        eventType: "auth.password_change",
        outcome: "denied",
        actorUserId: userId,
        resourceType: "auth_user",
        resourceId: userId,
        metadata: {
          reason: "current_password_required",
        },
      });

      return {
        ok: false,
        code: "CURRENT_PASSWORD_REQUIRED",
        message:
          "Não foi possível validar sua senha atual. Informe a senha novamente.",
      };
    }

    /*
     * Sessão não é recente.
     */
    if (updateError.code === "reauthentication_needed") {
      await recordAuditEvent({
        eventType: "auth.password_change",
        outcome: "denied",
        actorUserId: userId,
        resourceType: "auth_user",
        resourceId: userId,
        metadata: {
          reason: "reauthentication_required",
        },
      });

      return {
        ok: false,
        code: "REAUTHENTICATION_REQUIRED",
        message: "Confirme sua identidade para alterar a senha.",
      };
    }

    /*
     * Nonce incorreto ou expirado.
     */
    if (updateError.code === "reauthentication_not_valid") {
      await recordAuditEvent({
        eventType: "auth.password_change",
        outcome: "denied",
        actorUserId: userId,
        resourceType: "auth_user",
        resourceId: userId,
        metadata: {
          reason: "invalid_reauthentication_code",
        },
      });

      return {
        ok: false,
        code: "INVALID_REAUTHENTICATION_CODE",
        message: "O código de segurança é inválido ou expirou.",
      };
    }

    /*
     * Nova senha igual à atual.
     */
    if (updateError.code === "same_password") {
      await recordAuditEvent({
        eventType: "auth.password_change",
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
        code: "SAME_PASSWORD",
        message: "A nova senha deve ser diferente da senha atual.",
      };
    }

    /*
     * Política de senha do Supabase.
     */
    if (updateError.code === "weak_password") {
      await recordAuditEvent({
        eventType: "auth.password_change",
        outcome: "denied",
        actorUserId: userId,
        resourceType: "auth_user",
        resourceId: userId,
        metadata: {
          reason: "weak_password",
        },
      });

      return {
        ok: false,
        code: "WEAK_PASSWORD",
        message: "A nova senha não atende aos requisitos de segurança.",
      };
    }

    /*
     * Rate limit nativo do Supabase.
     */
    if (
      updateError.code === "over_request_rate_limit" ||
      updateError.status === 429
    ) {
      return {
        ok: false,
        code: "RATE_LIMITED",
        message: "Muitas tentativas. Aguarde e tente novamente.",
      };
    }

    console.warn("Falha ao alterar senha.", {
      event: "auth.password_change.update_failed",
      actorUserId: userId,
      authCode: updateError.code,
      authStatus: updateError.status,

      ...(process.env.NODE_ENV === "development"
        ? {
            authMessage: updateError.message,
            authName: updateError.name,
          }
        : {}),
    });

    await recordAuditEvent({
      eventType: "auth.password_change",
      outcome: "failure",
      actorUserId: userId,
      resourceType: "auth_user",
      resourceId: userId,
    });

    return {
      ok: false,
      code: "CHANGE_FAILED",
      message: "Não foi possível alterar a senha neste momento.",
    };
  }

  /*
   * 4. Audit Log.
   *
   * Nunca armazenamos:
   *
   * - senha atual;
   * - senha nova;
   * - nonce;
   * - tokens;
   * - cookies.
   */
  await recordAuditEvent({
    eventType: "auth.password_change",
    outcome: "success",
    actorUserId: userId,
    resourceType: "auth_user",
    resourceId: userId,
  });

  /*
   * 5. Revoga sessões.
   */
  const { error: signOutError } = await supabase.auth.signOut({
    scope: "global",
  });

  if (signOutError) {
    console.error("Senha alterada, mas o sign-out global falhou.", {
      event: "auth.password_change.global_signout_failed",
      actorUserId: userId,
      authCode: signOutError.code,
      authStatus: signOutError.status,
    });

    /*
     * Pelo menos encerra a sessão local.
     */
    const { error: localSignOutError } = await supabase.auth.signOut({
      scope: "local",
    });

    if (localSignOutError) {
      console.error("Sign-out local também falhou após alteração de senha.", {
        event: "auth.password_change.local_signout_failed",
        actorUserId: userId,
        authCode: localSignOutError.code,
        authStatus: localSignOutError.status,
      });
    }
  }

  return {
    ok: true,
    message: "Senha alterada com sucesso. Faça login novamente.",
  };
}
