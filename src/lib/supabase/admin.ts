// src/lib/supabase/admin.ts

import "server-only";

import { createClient } from "@supabase/supabase-js";

function requireServerEnv(
  name: "NEXT_PUBLIC_SUPABASE_URL" | "SUPABASE_SECRET_KEY",
): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Variável de ambiente não configurada: ${name}`);
  }

  return value;
}

const supabaseUrl = requireServerEnv(
  "NEXT_PUBLIC_SUPABASE_URL",
);

const supabaseSecretKey = requireServerEnv(
  "SUPABASE_SECRET_KEY",
);

export function createAdminSupabase() {
  return createClient(
    supabaseUrl,
    supabaseSecretKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );
}