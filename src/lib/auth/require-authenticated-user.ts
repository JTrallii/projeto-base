import "server-only";

import type { User } from "@supabase/supabase-js";

import {
  consumeRateLimit,
  type RateLimitScope,
} from "@/lib/security/rate-limit";

import { createServerSupabase } from "@/lib/supabase/server";

type ServerSupabaseClient = Awaited<
  ReturnType<typeof createServerSupabase>
>;

export type AuthenticatedActionContext = {
  user: User;
  userId: string;
  supabase: ServerSupabaseClient;
};

export type AuthenticatedActionError = {
  ok: false;

  code:
    | "UNAUTHENTICATED"
    | "RATE_LIMITED"
    | "UNAVAILABLE";

  message: string;

  retryAfterSeconds?: number;
};

export type AuthenticatedActionResult =
  | {
      ok: true;
      context: AuthenticatedActionContext;
    }
  | AuthenticatedActionError;

type RequireAuthenticatedUserOptions = {
  rateLimitScope?: RateLimitScope;
};

export async function requireAuthenticatedUser(
  options: RequireAuthenticatedUserOptions = {},
): Promise<AuthenticatedActionResult> {
  /*
   * Cliente Supabase ligado à sessão atual.
   */
  const supabase = await createServerSupabase();

  /*
   * Confirma no Supabase Auth quem é
   * o usuário que está fazendo a requisição.
   */
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      ok: false,
      code: "UNAUTHENTICATED",
      message:
        "Você precisa estar autenticado para realizar esta operação.",
    };
  }

  /*
   * Algumas operações podem precisar apenas
   * de autenticação, sem consumir um
   * rate limit específico.
   */
  if (!options.rateLimitScope) {
    return {
      ok: true,
      context: {
        user,
        userId: user.id,
        supabase,
      },
    };
  }

  try {
    /*
     * O identificador usa o ID autenticado.
     *
     * O próprio rate-limit.ts aplica HMAC
     * antes de armazenar esse identificador
     * no Redis.
     */
    const rateLimit = await consumeRateLimit(
      options.rateLimitScope,
      `user:${user.id}`,
    );

    if (!rateLimit.allowed) {
      console.warn(
        "Rate limit de Server Action excedido.",
        {
          event: "server_action.rate_limited",
          scope: options.rateLimitScope,
          resetAt: rateLimit.resetAt,
        },
      );

      return {
        ok: false,
        code: "RATE_LIMITED",
        message:
          "Muitas solicitações. Aguarde e tente novamente.",
        retryAfterSeconds:
          rateLimit.retryAfterSeconds,
      };
    }
  } catch (error) {
    console.error(
      "Rate limit de Server Action indisponível.",
      {
        event:
          "server_action.rate_limit_unavailable",
        scope: options.rateLimitScope,
        error:
          error instanceof Error
            ? error.message
            : "unknown",
      },
    );

    /*
     * Fail closed:
     *
     * se uma action pediu explicitamente
     * rate limit, ela não continua caso
     * essa proteção esteja indisponível.
     */
    return {
      ok: false,
      code: "UNAVAILABLE",
      message:
        "Não foi possível processar esta operação neste momento.",
    };
  }

  return {
    ok: true,
    context: {
      user,
      userId: user.id,
      supabase,
    },
  };
}