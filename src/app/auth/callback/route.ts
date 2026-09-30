import { NextResponse } from "next/server";
import { getAppUrl } from "@/lib/security/app-url";
import { createServerSupabase } from "@/lib/supabase/server";

function getSafeNextPath(value: string | null): string {
  if (value === "/redefinir-senha") {
    return value;
  }

  return "/redefinir-senha";
}

export async function GET(request: Request) {
  const appUrl = getAppUrl();

  if (!appUrl) {
    console.error("APP_URL ausente ou inválida.", {
      event: "auth.password_reset.invalid_app_url",
    });

    return new Response("Configuração inválida.", {
      status: 500,
    });
  }

  const requestUrl = new URL(request.url);

  const code = requestUrl.searchParams.get("code");

  const nextPath = getSafeNextPath(
    requestUrl.searchParams.get("next"),
  );

  if (!code) {
    return NextResponse.redirect(
      new URL("/login?recovery=invalid", appUrl),
    );
  }

  const supabase = await createServerSupabase();

  const { error } =
    await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.warn(
      "Falha ao trocar código de recovery por sessão.",
      {
        event: "auth.password_reset.callback_failed",
        authCode: error.code,
        authStatus: error.status,
        ...(process.env.NODE_ENV === "development"
          ? {
              authMessage: error.message,
              authName: error.name,
            }
          : {}),
      },
    );

    return NextResponse.redirect(
      new URL("/login?recovery=invalid", appUrl),
    );
  }

  return NextResponse.redirect(
    new URL(nextPath, appUrl),
  );
}