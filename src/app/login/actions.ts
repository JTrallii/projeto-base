// src/app/(auth)/login/actions.ts

"use server";

import { headers } from "next/headers";
import { z } from "zod";

import { createClient } from "@/lib/supabase/supabase";
import {
  consumeRateLimit,
  getTrustedClientIp,
} from "@/lib/security/rate-limit";

const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(1_024),
});

type LoginResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      code:
        | "INVALID_INPUT"
        | "INVALID_CREDENTIALS"
        | "RATE_LIMITED"
        | "UNAVAILABLE";
      message: string;
      retryAfterSeconds?: number;
    };

export async function loginAction(
  input: unknown,
): Promise<LoginResult> {
  const parsed = loginSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      code: "INVALID_INPUT",
      message: "Dados de acesso inválidos.",
    };
  }

  const requestHeaders = await headers();
  const ip = getTrustedClientIp(requestHeaders);

  if (!ip) {
    console.error("Não foi possível determinar um IP confiável");

    return {
      ok: false,
      code: "UNAVAILABLE",
      message: "Não foi possível processar a solicitação.",
    };
  }

  const email = parsed.data.email.toLowerCase();

  const [ipDecision, credentialDecision] = await Promise.all([
    consumeRateLimit("authIp", `ip:${ip}`),

    /*
     * A função central aplica HMAC antes de gravar no Redis.
     */
    consumeRateLimit(
      "authCredential",
      `ip:${ip}:email:${email}`,
    ),
  ]);

  const blockedDecision = [ipDecision, credentialDecision].find(
    (decision) => !decision.allowed,
  );

  if (blockedDecision) {
    console.warn("Rate limit de login excedido", {
      event: "auth.login.rate_limited",
      resetAt: blockedDecision.resetAt,
    });

    return {
      ok: false,
      code: "RATE_LIMITED",
      message: "Muitas tentativas. Tente novamente mais tarde.",
      retryAfterSeconds: blockedDecision.retryAfterSeconds,
    };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: parsed.data.password,
  });

  if (error) {
    /*
     * Não informe se o e-mail existe.
     */
    return {
      ok: false,
      code: "INVALID_CREDENTIALS",
      message: "E-mail ou senha inválidos.",
    };
  }

  return { ok: true };
}