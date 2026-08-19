"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { getTrustedClientIp } from "@/lib/security/client-ip";
import {
  consumeRateLimits,
  type RateLimitDecision,
} from "@/lib/security/rate-limit";
import { createServerSupabase } from "@/lib/supabase/server";

const loginSchema = z.object({
  email: z.string().trim().email("E-mail inválido").max(254, "E-mail inválido"),

  password: z.string().min(1, "Informe a senha").max(256, "Senha inválida"),

  captchaToken: z
    .string()
    .min(1, "Conclua a verificação de segurança.")
    .max(2048, "Token de segurança inválido."),

  redirectTo: z.string().max(500).optional(),
});

const registerSchema = z
  .object({
    nome: z
      .string()
      .trim()
      .min(1, "O nome é obrigatório.")
      .max(80, "O nome deve ter no máximo 80 caracteres."),

    sobrenome: z
      .string()
      .trim()
      .min(1, "O sobrenome é obrigatório.")
      .max(120, "O sobrenome deve ter no máximo 120 caracteres."),

    email: z
      .string()
      .trim()
      .email("E-mail inválido.")
      .max(254, "E-mail inválido."),

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

    captchaToken: z
      .string()
      .min(1, "Conclua a verificação de segurança.")
      .max(2048, "Token de segurança inválido."),
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

export type AuthActionResult =
  | {
      ok: true;
      message?: string;
      requiresEmailConfirmation?: boolean;
    }
  | {
      ok: false;

      code:
        | "INVALID_INPUT"
        | "RATE_LIMITED"
        | "CAPTCHA_FAILED"
        | "INVALID_CREDENTIALS"
        | "REGISTER_FAILED"
        | "LOGOUT_FAILED"
        | "UNAVAILABLE";

      message: string;
      retryAfterSeconds?: number;

      fieldErrors?: Record<string, string[] | undefined>;
    };

function safeInternalRedirect(
  value: string | undefined,
  fallback = "/dashboard",
): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  try {
    const base = "https://internal.invalid";

    const parsed = new URL(value, base);

    if (parsed.origin !== base) {
      return fallback;
    }

    return parsed.pathname + parsed.search + parsed.hash;
  } catch {
    return fallback;
  }
}

function rateLimitError(decision: RateLimitDecision): AuthActionResult {
  return {
    ok: false,
    code: "RATE_LIMITED",
    message: "Muitas tentativas. Aguarde e tente novamente.",
    retryAfterSeconds: decision.retryAfterSeconds,
  };
}

export async function loginAction(input: unknown): Promise<AuthActionResult> {
  /**
   * 1. Validação estrutural.
   *
   * Impede payloads enormes ou valores inválidos
   * antes de gerar chaves para o Redis.
   */
  const parsed = loginSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      code: "INVALID_INPUT",
      message: "Revise os dados informados.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const email = parsed.data.email.toLowerCase();

  let ip: string;
  let rateLimit: RateLimitDecision;

  try {
    /**
     * 2. Identificação da origem.
     */
    ip = await getTrustedClientIp();

    /**
     * 3. Dois limites diferentes:
     *
     * - muitas contas a partir do mesmo IP;
     * - muitas tentativas para o mesmo e-mail
     *   a partir desse IP.
     */
    rateLimit = await consumeRateLimits([
      {
        scope: "loginIp",
        identifier: `ip:${ip}`,
      },
      {
        scope: "loginCredential",

        identifier: `ip:${ip}:email:${email}`,
      },
    ]);
  } catch (error) {
    console.error("Rate limit de login indisponível", {
      event: "auth.login.rate_limit_unavailable",
      error: error instanceof Error ? error.message : "unknown",
    });

    /**
     * Falha fechada.
     *
     * Se o mecanismo de segurança estiver
     * indisponível, o login não prossegue.
     */
    return {
      ok: false,
      code: "UNAVAILABLE",
      message: "Não foi possível processar o login neste momento.",
    };
  }

  if (!rateLimit.allowed) {
    console.warn("Rate limit de login excedido", {
      event: "auth.login.rate_limited",
      resetAt: rateLimit.resetAt,
    });

    return rateLimitError(rateLimit);
  }

  /**
   * 4. Cliente SSR da requisição.
   *
   * signInWithPassword gravará a sessão
   * nos cookies através do server.ts.
   */
  const supabase = await createServerSupabase();

  const { error } = await supabase.auth.signInWithPassword({
    email,

    password: parsed.data.password,

    options: {
      captchaToken: parsed.data.captchaToken,
    },
  });

  if (error?.code === "captcha_failed") {
    console.warn("Falha na verificação CAPTCHA", {
      event: "auth.login.captcha_failed",
    });

    return {
      ok: false,
      code: "CAPTCHA_FAILED",
      message: "A verificação de segurança expirou ou falhou. Tente novamente.",
    };
  }

  if (error?.code === "over_request_rate_limit" || error?.status === 429) {
    console.warn("Rate limit nativo do Supabase excedido", {
      event: "auth.login.supabase_rate_limited",
    });

    return {
      ok: false,
      code: "RATE_LIMITED",
      message: "Muitas tentativas. Aguarde e tente novamente.",
    };
  }

  if (error) {
    console.warn("Falha de autenticação", {
      event: "auth.login.failed",
      authCode: error.code,
    });

    /**
     * Não revelamos se o e-mail existe.
     */
    return {
      ok: false,
      code: "INVALID_CREDENTIALS",
      message: "E-mail ou senha inválidos.",
    };
  }

  /**
   * O redirect deve ficar fora de try/catch,
   * pois internamente o Next.js implementa
   * redirect lançando uma exceção especial.
   */
  redirect(safeInternalRedirect(parsed.data.redirectTo));
}

export async function registerAction(
  input: unknown,
): Promise<AuthActionResult> {
  /*
   * 1. Validação completa no servidor.
   */
  const parsed = registerSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      code: "INVALID_INPUT",
      message: "Preencha os campos corretamente.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { nome, sobrenome, password } = parsed.data;

  const email = parsed.data.email.toLowerCase();

  /*
   * 2. Rate limit por IP e IP + e-mail.
   */
  let rateLimit: RateLimitDecision;

  try {
    const ip = await getTrustedClientIp();

    rateLimit = await consumeRateLimits([
      {
        scope: "registerIp",
        identifier: `ip:${ip}`,
      },
      {
        scope: "registerCredential",
        identifier: `ip:${ip}:email:${email}`,
      },
    ]);
  } catch (error) {
    console.error("Rate limit de cadastro indisponível", {
      event: "auth.register.rate_limit_unavailable",

      error: error instanceof Error ? error.message : "unknown",
    });

    /*
     * Falha fechada:
     * cadastro não prossegue se o mecanismo
     * de proteção estiver indisponível.
     */
    return {
      ok: false,
      code: "UNAVAILABLE",
      message: "Não foi possível processar o cadastro neste momento.",
    };
  }

  if (!rateLimit.allowed) {
    console.warn("Rate limit de cadastro excedido", {
      event: "auth.register.rate_limited",
      resetAt: rateLimit.resetAt,
    });

    return {
      ok: false,
      code: "RATE_LIMITED",
      message: "Muitas tentativas de cadastro.",
      retryAfterSeconds: rateLimit.retryAfterSeconds,
    };
  }

  /*
   * 3. Cliente SSR comum.
   *
   * Não usamos supabaseAdmin para o
   * autocadastro público.
   */
  const supabase = await createServerSupabase();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,

    options: {
      captchaToken: parsed.data.captchaToken,

      data: {
        nome,
        sobrenome,
        cadastro_tipo: "cliente",
      },
    },
  });

  // CAPTCHA INVÁLIDO OU EXPIRADO
  if (error?.code === "captcha_failed") {
    console.warn("Falha na verificação CAPTCHA", {
      event: "auth.register.captcha_failed",
    });

    return {
      ok: false,
      code: "CAPTCHA_FAILED",
      message: "A verificação de segurança expirou ou falhou. Tente novamente.",
    };
  }

  // RATE LIMIT NATIVO DO SUPABASE
  if (
    error?.code === "over_request_rate_limit" ||
    error?.code === "over_email_send_rate_limit" ||
    error?.status === 429
  ) {
    console.warn("Rate limit nativo do Supabase excedido", {
      event: "auth.register.supabase_rate_limited",
    });

    return {
      ok: false,
      code: "RATE_LIMITED",
      message: "Muitas tentativas de cadastro. Aguarde e tente novamente.",
    };
  }

  // DEMAIS ERROS DO CADASTRO
  if (error) {
    console.warn("Cadastro rejeitado pelo Supabase", {
      event: "auth.register.failed",
      authCode: error.code,
    });

    return {
      ok: false,
      code: "REGISTER_FAILED",
      message: "Não foi possível concluir o cadastro.",
    };
  }

  // SE O SUPABASE CRIOU UMA SESSÃO,
  // A CONFIRMAÇÃO DE E-MAIL NÃO ESTÁ IMPEDINDO O LOGIN
  if (data.session) {
    redirect("/dashboard");
  }

  // SE NÃO EXISTE SESSÃO,
  // O USUÁRIO PRECISA CONFIRMAR O E-MAIL
  return {
    ok: true,
    requiresEmailConfirmation: true,
    message: "Verifique seu e-mail para confirmar o cadastro.",
  };
}

export async function logoutAction(): Promise<AuthActionResult> {
  const supabase = await createServerSupabase();

  const { error } = await supabase.auth.signOut({
    /**
     * Encerra somente esta sessão.
     * As sessões de outros dispositivos
     * continuam válidas.
     */
    scope: "local",
  });

  if (error) {
    console.error("Não foi possível encerrar a sessão", {
      event: "auth.logout.failed",
      authCode: error.code,
    });

    return {
      ok: false,
      code: "LOGOUT_FAILED",
      message: "Não foi possível encerrar a sessão.",
    };
  }

  redirect("/login");
}
