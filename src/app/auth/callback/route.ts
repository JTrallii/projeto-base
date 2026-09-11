import {
  NextResponse,
  type NextRequest,
} from "next/server";

import {
  createServerSupabase,
} from "@/lib/supabase/server";

const ALLOWED_NEXT_PATHS =
  new Set([
    "/redefinir-senha",
  ]);

export async function GET(
  request: NextRequest,
) {
  const requestUrl =
    new URL(request.url);

  const code =
    requestUrl.searchParams.get(
      "code",
    );

  const requestedNext =
    requestUrl.searchParams.get(
      "next",
    ) ??
    "/redefinir-senha";

  /*
   * Evita open redirect.
   *
   * Mesmo que alguém tente:
   *
   * ?next=https://evil.com
   *
   * o redirect continuará limitado
   * às rotas explicitamente permitidas.
   */
  const nextPath =
    ALLOWED_NEXT_PATHS.has(
      requestedNext,
    )
      ? requestedNext
      : "/redefinir-senha";

  /*
   * Callback sem code válido.
   */
  if (!code) {
    return NextResponse.redirect(
      new URL(
        "/login?recovery=invalid",
        requestUrl.origin,
      ),
      303,
    );
  }

  const supabase =
    await createServerSupabase();

  /*
   * Troca o authorization code
   * por uma sessão server-side.
   *
   * Os cookies são gravados pelo
   * cliente SSR do Supabase.
   */
  const {
    error,
  } =
    await supabase.auth
      .exchangeCodeForSession(
        code,
      );

  if (error) {
    console.warn(
      "Falha ao trocar código de recuperação por sessão.",
      {
        event:
          "auth.password_reset.callback_failed",

        authCode:
          error.code,

        authStatus:
          error.status,

        ...(
          process.env.NODE_ENV ===
          "development"
            ? {
                authMessage:
                  error.message,

                authName:
                  error.name,
              }
            : {}
        ),
      },
    );

    /*
     * Não exponha detalhes internos do
     * Supabase para o navegador.
     */
    return NextResponse.redirect(
      new URL(
        "/login?recovery=invalid",
        requestUrl.origin,
      ),
      303,
    );
  }

  return NextResponse.redirect(
    new URL(
      nextPath,
      requestUrl.origin,
    ),
    303,
  );
}