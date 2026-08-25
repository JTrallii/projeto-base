// src/lib/supabase/client.ts

import { createBrowserClient } from "@supabase/ssr";

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

const supabaseUrl = requireEnv(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  "NEXT_PUBLIC_SUPABASE_URL",
);

const supabasePublishableKey = requireEnv(
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
);

export function createClient() {
  return createBrowserClient(
    supabaseUrl,
    supabasePublishableKey,
  );
}