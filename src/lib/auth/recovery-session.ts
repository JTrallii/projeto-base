import "server-only";

type UnknownRecord =
  Record<string, unknown>;

function isRecord(
  value: unknown,
): value is UnknownRecord {
  return (
    typeof value === "object" &&
    value !== null
  );
}

/**
 * Retorna o subject (user id) somente quando:
 *
 * - os claims são válidos estruturalmente;
 * - existe um `sub`;
 * - o JWT possui um método AMR `recovery`.
 *
 * Claims devem vir de `supabase.auth.getClaims()`,
 * nunca diretamente do cliente.
 */
export function getRecoverySessionUserId(
  claims: unknown,
): string | null {
  if (!isRecord(claims)) {
    return null;
  }

  const {
    sub,
    amr,
  } = claims;

  if (
    typeof sub !== "string" ||
    !sub ||
    !Array.isArray(amr)
  ) {
    return null;
  }

  const hasRecoveryMethod =
    amr.some(
      (entry) =>
        isRecord(entry) &&
        entry.method ===
          "recovery",
    );

  if (!hasRecoveryMethod) {
    return null;
  }

  return sub;
}