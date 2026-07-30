import { NextResponse } from "next/server";
import { z } from "zod";

import {
  consumeRateLimit,
  createRateLimitHeaders,
  type RateLimitDecision,
} from "@/lib/security/rate-limit";

import { createServerSupabase } from "@/lib/supabase/server";

const exportSchema = z.object({
  organizationId: z
    .string()
    .uuid("Organização inválida"),

  format: z.enum([
    "csv",
    "xlsx",
    "json",
  ]),
});

type ExportRequest =
  z.infer<typeof exportSchema>;

function rateLimitedResponse(
  decision: RateLimitDecision,
) {
  return NextResponse.json(
    {
      error: {
        code: "RATE_LIMITED",

        message:
          "Limite de exportações excedido.",

        retryAfterSeconds:
          decision.retryAfterSeconds,
      },
    },
    {
      status: 429,

      headers:
        createRateLimitHeaders(
          decision,
        ),
    },
  );
}

export async function POST(
  request: Request,
) {
  /*
   * 1. Validar o JSON.
   */
  let input: unknown;

  try {
    input = await request.json();
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_JSON",
          message:
            "O corpo da solicitação é inválido.",
        },
      },
      {
        status: 400,
      },
    );
  }

  const parsed =
    exportSchema.safeParse(input);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_INPUT",
          message:
            "Revise os dados enviados.",

          fields:
            parsed.error.flatten()
              .fieldErrors,
        },
      },
      {
        status: 400,
      },
    );
  }

  /*
   * 2. Autenticar o usuário.
   */
  const supabase =
    await createServerSupabase();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      {
        error: {
          code: "UNAUTHENTICATED",
          message:
            "Sua sessão expirou. Entre novamente.",
        },
      },
      {
        status: 401,
      },
    );
  }

  /*
   * 3. Limite individual.
   *
   * Este limite ocorre antes da consulta
   * de autorização para impedir que um usuário
   * abuse repetidamente da verificação.
   */
  let userRateLimit: RateLimitDecision;

  try {
    userRateLimit =
      await consumeRateLimit(
        "exportUser",
        `user:${user.id}`,
      );
  } catch (error) {
    console.error(
      "Rate limit de exportação indisponível",
      {
        event:
          "export.user_rate_limit_unavailable",

        userId: user.id,

        error:
          error instanceof Error
            ? error.message
            : "unknown",
      },
    );

    /*
     * Exportação é uma operação cara.
     * Portanto, falha fechada.
     */
    return NextResponse.json(
      {
        error: {
          code: "UNAVAILABLE",
          message:
            "Não foi possível processar a exportação neste momento.",
        },
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store",
          "Retry-After": "30",
        },
      },
    );
  }

  if (!userRateLimit.allowed) {
    console.warn(
      "Limite individual de exportação excedido",
      {
        event:
          "export.user_rate_limited",
        userId: user.id,
        resetAt:
          userRateLimit.resetAt,
      },
    );

    return rateLimitedResponse(
      userRateLimit,
    );
  }

  const {
    organizationId,
    format,
  }: ExportRequest = parsed.data;

  /*
   * 4. Autorizar acesso ao tenant.
   *
   * Não aplique o limite do tenant antes
   * desta verificação. Caso contrário, um
   * atacante poderia informar o UUID de outro
   * tenant e consumir a quota dele.
   */
  const {
    data: membership,
    error: membershipError,
  } = await supabase
    .from("organization_members")
    .select("role")
    .eq(
      "organization_id",
      organizationId,
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipError) {
    console.error(
      "Erro ao validar membership",
      {
        event:
          "export.membership_check_failed",
        userId: user.id,
        organizationId,
        databaseCode:
          membershipError.code,
      },
    );

    return NextResponse.json(
      {
        error: {
          code: "DATABASE_ERROR",
          message:
            "Não foi possível validar a operação.",
        },
      },
      {
        status: 500,
      },
    );
  }

  if (!membership) {
    /*
     * Resposta genérica:
     * não revela se a organização existe.
     */
    return NextResponse.json(
      {
        error: {
          code: "FORBIDDEN",
          message:
            "Recurso não encontrado ou operação não autorizada.",
        },
      },
      {
        status: 403,
      },
    );
  }

  /*
   * Opcional:
   * restringir exportação por papel.
   */
  if (
    ![
      "owner",
      "admin",
    ].includes(membership.role)
  ) {
    return NextResponse.json(
      {
        error: {
          code: "FORBIDDEN",
          message:
            "Você não possui permissão para exportar esses dados.",
        },
      },
      {
        status: 403,
      },
    );
  }

  /*
   * 5. Rate limit do tenant.
   *
   * Agora sabemos que o usuário realmente
   * pertence à organização.
   */
  let tenantRateLimit:
    RateLimitDecision;

  try {
    tenantRateLimit =
      await consumeRateLimit(
        "exportTenant",
        `organization:${organizationId}`,
      );
  } catch (error) {
    console.error(
      "Rate limit do tenant indisponível",
      {
        event:
          "export.tenant_rate_limit_unavailable",

        userId: user.id,
        organizationId,

        error:
          error instanceof Error
            ? error.message
            : "unknown",
      },
    );

    return NextResponse.json(
      {
        error: {
          code: "UNAVAILABLE",
          message:
            "Não foi possível processar a exportação neste momento.",
        },
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store",
          "Retry-After": "30",
        },
      },
    );
  }

  if (!tenantRateLimit.allowed) {
    console.warn(
      "Limite do tenant excedido",
      {
        event:
          "export.tenant_rate_limited",
        userId: user.id,
        organizationId,
        resetAt:
          tenantRateLimit.resetAt,
      },
    );

    return rateLimitedResponse(
      tenantRateLimit,
    );
  }

  /*
   * 6. Executar a operação.
   *
   * A consulta deve continuar sujeita à RLS.
   * Não use supabaseAdmin para exportação
   * solicitada por um usuário comum.
   */
  const {
    data: records,
    error: exportError,
  } = await supabase
    .from("projects")
    .select(
      "id, name, created_at",
    )
    .eq(
      "organization_id",
      organizationId,
    )
    .limit(10_000);

  if (exportError) {
    console.error(
      "Falha ao gerar exportação",
      {
        event:
          "export.generation_failed",
        userId: user.id,
        organizationId,
        databaseCode:
          exportError.code,
      },
    );

    return NextResponse.json(
      {
        error: {
          code: "EXPORT_FAILED",
          message:
            "Não foi possível gerar a exportação.",
        },
      },
      {
        status: 500,
      },
    );
  }

  /*
   * Exemplo simplificado.
   *
   * Aqui você deverá gerar CSV, XLSX ou
   * iniciar um job assíncrono.
   */
  return NextResponse.json(
    {
      ok: true,
      format,
      totalRecords:
        records.length,
      data: records,
    },
    {
      status: 200,

      headers: {
        "Cache-Control":
          "private, no-store",

        /*
         * Retorna os dados do limite do tenant,
         * que é a quota final da operação.
         */
        ...createRateLimitHeaders(
          tenantRateLimit,
        ),
      },
    },
  );
}