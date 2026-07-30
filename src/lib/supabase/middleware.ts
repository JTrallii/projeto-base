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

function isDashboardPath(pathname: string): boolean {
  return (
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/")
  );
}

function isAuthPath(pathname: string): boolean {
  return (
    pathname === "/login" ||
    pathname.startsWith("/login/") ||
    pathname === "/cadastro" ||
    pathname.startsWith("/cadastro/")
  );
}

function copyResponseCookies(
  source: NextResponse,
  destination: NextResponse,
): NextResponse {
  source.cookies.getAll().forEach((cookie) => {
    destination.cookies.set(
      cookie.name,
      cookie.value,
      cookie,
    );
  });

  return destination;
}

export async function updateSession(
  request: NextRequest,
): Promise<NextResponse> {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const cookieMethods: CookieMethodsServer = {
    getAll() {
      return request.cookies.getAll();
    },

    setAll(cookiesToSet) {
      /*
       * Atualiza os cookies da requisição para que
       * o restante da execução veja a sessão renovada.
       */
      cookiesToSet.forEach(({ name, value }) => {
        request.cookies.set(name, value);
      });

      /*
       * Recria a resposta com a requisição atualizada.
       */
      supabaseResponse = NextResponse.next({
        request,
      });

      /*
       * Envia os cookies renovados ao navegador,
       * preservando as opções definidas pelo Supabase.
       */
      cookiesToSet.forEach(
        ({ name, value, options }) => {
          supabaseResponse.cookies.set(
            name,
            value,
            options,
          );
        },
      );
    },
  };

  const supabase = createServerClient(
    supabaseUrl,
    supabasePublishableKey,
    {
      cookies: cookieMethods,
    },
  );

  /*
   * Não use getSession() como prova de identidade.
   * getClaims() valida o token.
   */
  const {
    data: claimsData,
    error: claimsError,
  } = await supabase.auth.getClaims();

  const userId = claimsData?.claims?.sub;

  const isAuthenticated =
    !claimsError &&
    typeof userId === "string" &&
    userId.length > 0;

  const { pathname, search } = request.nextUrl;

  if (
    !isAuthenticated &&
    isDashboardPath(pathname)
  ) {
    const redirectUrl = request.nextUrl.clone();

    redirectUrl.pathname = "/login";
    redirectUrl.search = "";

    redirectUrl.searchParams.set(
      "redirect",
      `${pathname}${search}`,
    );

    const redirectResponse =
      NextResponse.redirect(redirectUrl);

    return copyResponseCookies(
      supabaseResponse,
      redirectResponse,
    );
  }

  if (
    isAuthenticated &&
    isAuthPath(pathname)
  ) {
    const redirectUrl = request.nextUrl.clone();

    redirectUrl.pathname = "/dashboard";
    redirectUrl.search = "";

    const redirectResponse =
      NextResponse.redirect(redirectUrl);

    return copyResponseCookies(
      supabaseResponse,
      redirectResponse,
    );
  }

  return supabaseResponse;
}