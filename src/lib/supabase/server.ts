// src/lib/supabase/server.ts

import "server-only";

import {
  createServerClient,
  type CookieMethodsServer,
} from "@supabase/ssr";
import { cookies } from "next/headers";

type RequiredSupabaseEnv =
  | "NEXT_PUBLIC_SUPABASE_URL"
  | "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY";

function requireEnv(name: RequiredSupabaseEnv): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Variável de ambiente não configurada: ${name}`);
  }

  return value;
}

const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");

const supabasePublishableKey = requireEnv(
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
);

export async function createServerSupabase() {
  const cookieStore = await cookies();

  const cookieMethods: CookieMethodsServer = {
    getAll() {
      return cookieStore.getAll();
    },

    setAll(cookiesToSet) {
      try {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      } catch {
        /*
         * Server Components não podem modificar cookies.
         *
         * Isso pode ser ignorado quando proxy.ts/middleware.ts
         * está responsável por atualizar a sessão.
         */
      }
    },
  };

  return createServerClient(
    supabaseUrl,
    supabasePublishableKey,
    {
      cookies: cookieMethods,
    },
  );
}