import "server-only";

import { createHmac } from "node:crypto";

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

function requireEnv(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`Variável de ambiente não configurada: ${name}`);
  }

  return value;
}

const rateLimitHashSecret = requireEnv(
  process.env.RATE_LIMIT_HASH_SECRET,
  "RATE_LIMIT_HASH_SECRET",
);

const redis = Redis.fromEnv();

/**
 * Valores iniciais.
 *
 * Ajuste depois com métricas reais do seu SaaS.
 */
const rateLimiters = {
  /**
   * Proteção geral contra muitas tentativas
   * de login originadas do mesmo IP.
   */
  loginIp: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, "1 m"),
    prefix: "saas:rate-limit:login-ip",
    analytics: false,
  }),

  /**
   * Proteção da combinação IP + e-mail.
   */
  loginCredential: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, "1 m"),
    prefix: "saas:rate-limit:login-credential",
    analytics: false,
  }),

  /**
   * Cadastro é mais restrito porque pode:
   * - gerar e-mail;
   * - criar registros;
   * - ser usado para spam.
   */
  registerIp: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, "1 h"),
    prefix: "saas:rate-limit:register-ip",
    analytics: false,
  }),

  registerCredential: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(3, "1 h"),
    prefix: "saas:rate-limit:register-credential",
    analytics: false,
  }),

  /**
   * Operações comuns autenticadas.
   */
  mutation: new Ratelimit({
    redis,
    limiter: Ratelimit.tokenBucket(20, "10 s", 40),
    prefix: "saas:rate-limit:mutation",
    analytics: false,
  }),

  /**
   * Operações destrutivas ou de segurança.
   */
  sensitiveMutation: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, "1 m"),
    prefix: "saas:rate-limit:sensitive-mutation",
    analytics: false,
  }),

  upload: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, "1 m"),
    prefix: "saas:rate-limit:upload",
    analytics: false,
  }),

  exportUser: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(3, "1 h"),
    prefix: "saas:rate-limit:export-user",
    analytics: false,
  }),

  exportTenant: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, "1 d"),
    prefix: "saas:rate-limit:export-tenant",
    analytics: false,
  }),

  passwordReset: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(3, "1 h"),
    prefix: "saas:rate-limit:password-reset",
    analytics: false,
  }),

  invitation: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, "1 h"),
    prefix: "saas:rate-limit:invitation",
    analytics: false,
  }),
} as const;

export type RateLimitScope = keyof typeof rateLimiters;

export type RateLimitDecision = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
};

export type RateLimitCheck = {
  scope: RateLimitScope;
  identifier: string;
};

function fingerprint(value: string): string {
  return createHmac("sha256", rateLimitHashSecret)
    .update(value)
    .digest("base64url");
}

export async function consumeRateLimit(
  scope: RateLimitScope,
  identifier: string,
): Promise<RateLimitDecision> {
  const limiter = rateLimiters[scope];

  /**
   * Nenhum IP, e-mail ou userId é armazenado
   * diretamente na chave do Redis.
   */
  const protectedIdentifier = fingerprint(`${scope}:${identifier}`);

  const result = await limiter.limit(protectedIdentifier);

  return {
    allowed: result.success,
    limit: result.limit,
    remaining: Math.max(0, result.remaining),
    resetAt: result.reset,

    retryAfterSeconds: result.success
      ? 0
      : Math.max(1, Math.ceil((result.reset - Date.now()) / 1_000)),
  };
}

export async function consumeRateLimits(
  checks: RateLimitCheck[],
): Promise<RateLimitDecision> {
  if (checks.length === 0) {
    throw new Error("Nenhuma verificação de rate limit informada");
  }

  const decisions = await Promise.all(
    checks.map(({ scope, identifier }) => consumeRateLimit(scope, identifier)),
  );

  const blockedDecisions = decisions.filter((decision) => !decision.allowed);

  if (blockedDecisions.length === 0) {
    return decisions.reduce((strictest, current) =>
      current.remaining < strictest.remaining ? current : strictest,
    );
  }

  /**
   * Retorna o bloqueio que demora mais
   * para expirar.
   */
  return blockedDecisions.reduce((longest, current) =>
    current.resetAt > longest.resetAt ? current : longest,
  );
}

export function createRateLimitHeaders(
  decision: RateLimitDecision,
): Record<string, string> {
  const headers: Record<string, string> = {
    "Cache-Control": "no-store",

    "X-RateLimit-Limit": String(
      decision.limit,
    ),

    "X-RateLimit-Remaining": String(
      decision.remaining,
    ),

    /*
     * Timestamp Unix em segundos.
     */
    "X-RateLimit-Reset": String(
      Math.ceil(
        decision.resetAt / 1_000,
      ),
    ),
  };

  if (!decision.allowed) {
    headers["Retry-After"] = String(
      decision.retryAfterSeconds,
    );
  }

  return headers;
}
