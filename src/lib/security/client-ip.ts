import "server-only";

import { headers } from "next/headers";

function firstIp(
  value: string | null,
): string | null {
  const ip = value
    ?.split(",")
    .at(0)
    ?.trim();

  return ip || null;
}

export async function getTrustedClientIp(): Promise<string> {
  const requestHeaders = await headers();

  /**
   * Desenvolvimento local.
   */
  if (
    process.env.NODE_ENV ===
    "development"
  ) {
    return "127.0.0.1";
  }

  /**
   * Vercel define este header na infraestrutura.
   */
  if (process.env.VERCEL === "1") {
    const vercelIp = firstIp(
      requestHeaders.get(
        "x-vercel-forwarded-for",
      ),
    );

    if (vercelIp) {
      return vercelIp;
    }

    throw new Error(
      "IP confiável da Vercel não encontrado",
    );
  }

  /**
   * Infraestrutura própria.
   *
   * Configure, por exemplo:
   * TRUSTED_CLIENT_IP_HEADER=cf-connecting-ip
   *
   * Somente use x-forwarded-for se seu proxy
   * remover o valor enviado pelo usuário e
   * sobrescrever o header.
   */
  const trustedHeader =
    process.env.TRUSTED_CLIENT_IP_HEADER
      ?.trim()
      .toLowerCase();

  if (!trustedHeader) {
    throw new Error(
      "TRUSTED_CLIENT_IP_HEADER não configurado",
    );
  }

  const ip = firstIp(
    requestHeaders.get(trustedHeader),
  );

  if (!ip) {
    throw new Error(
      "Não foi possível determinar um IP confiável",
    );
  }

  return ip;
}