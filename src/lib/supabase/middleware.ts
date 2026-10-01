// src/lib/supabase/middleware.ts

import {
  createServerClient,
  type CookieMethodsServer,
} from "@supabase/ssr";

import {
  NextResponse,
  type NextRequest,
} from "next/server";

function requireEnv(
  value: string | undefined,
  name: string,
): string {
  if (!value) {
    throw new Error(
      `Variável de ambiente não configurada: ${name}`,
    );
  }

  return value;
}

const supabaseUrl: string = requireEnv(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  "NEXT_PUBLIC_SUPABASE_URL",
);

const supabasePublishableKey: string = requireEnv(
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
);

/*
 * ============================================================
 * PROTECTED PATHS
 * ============================================================
 */

function isProtectedPath(
  pathname: string,
): boolean {
  return (
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/") ||
    pathname === "/settings" ||
    pathname.startsWith("/settings/")
  );
}

/*
 * ============================================================
 * RESPONSE COOKIES
 * ============================================================
 */

function copyResponseCookies(
  source: NextResponse,
  destination: NextResponse,
): NextResponse {
  source.cookies
    .getAll()
    .forEach(
      (cookie) => {
        destination.cookies.set(
          cookie.name,
          cookie.value,
          cookie,
        );
      },
    );

  return destination;
}

/*
 * ============================================================
 * UPDATE SESSION
 * ============================================================
 */

export async function updateSession(
  request: NextRequest,
): Promise<NextResponse> {
  let supabaseResponse =
    NextResponse.next({
      request,
    });

  const cookieMethods: CookieMethodsServer = {
    getAll() {
      return request.cookies.getAll();
    },

    setAll(
      cookiesToSet,
    ) {
      /*
       * Atualiza também a request atual.
       */
      cookiesToSet.forEach(
        ({
          name,
          value,
        }) => {
          request.cookies.set(
            name,
            value,
          );
        },
      );

      /*
       * Recria a resposta utilizando
       * os cookies atualizados.
       */
      supabaseResponse =
        NextResponse.next({
          request,
        });

      /*
       * Persiste os cookies atualizados
       * no navegador.
       */
      cookiesToSet.forEach(
        ({
          name,
          value,
          options,
        }) => {
          supabaseResponse.cookies.set(
            name,
            value,
            options,
          );
        },
      );
    },
  };

  const supabase =
    createServerClient(
      supabaseUrl,
      supabasePublishableKey,
      {
        cookies:
          cookieMethods,
      },
    );

  /*
   * getClaims() valida criptograficamente
   * o access token.
   *
   * Não utilizamos getSession()
   * como prova de identidade.
   */
  const {
    data:
      claimsData,
    error:
      claimsError,
  } =
    await supabase.auth
      .getClaims();

  const userId =
    claimsData?.claims?.sub;

  const isAuthenticated =
    !claimsError &&
    typeof userId ===
      "string" &&
    userId.length > 0;

  const {
    pathname,
    search,
  } =
    request.nextUrl;

  /*
   * Rotas privadas sem JWT válido.
   */
  if (
    !isAuthenticated &&
    isProtectedPath(
      pathname,
    )
  ) {
    const redirectUrl =
      request.nextUrl.clone();

    redirectUrl.pathname =
      "/login";

    redirectUrl.search =
      "";

    redirectUrl.searchParams.set(
      "redirect",
      `${pathname}${search}`,
    );

    const redirectResponse =
      NextResponse.redirect(
        redirectUrl,
      );

    return copyResponseCookies(
      supabaseResponse,
      redirectResponse,
    );
  }

  /*
   * IMPORTANTE:
   *
   * Não redirecionamos automaticamente
   * /login → /dashboard apenas porque
   * getClaims() encontrou um JWT válido.
   *
   * Após logout global, um access token
   * já emitido pode permanecer válido
   * até expirar.
   *
   * Fazer esse redirect aqui poderia
   * criar:
   *
   * /dashboard
   * → /login
   * → /dashboard
   *
   * usando uma sessão que já perdeu
   * o refresh token.
   */

  return supabaseResponse;
}