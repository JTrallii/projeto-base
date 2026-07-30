import "server-only";

import type {
  User as SupabaseUser,
} from "@supabase/supabase-js";

import type { User } from "@/types";
import { createServerSupabase } from "@/lib/supabase/server";

function mapSupabaseUser(
  authUser: SupabaseUser,
): User | null {
  if (!authUser.email) {
    return null;
  }

  const metadata =
    authUser.user_metadata;

  const name =
    typeof metadata?.name === "string"
      ? metadata.name
      : undefined;

  const avatarUrl =
    typeof metadata?.avatar_url ===
    "string"
      ? metadata.avatar_url
      : undefined;

  return {
    id: authUser.id,
    email: authUser.email,
    name,
    avatar_url: avatarUrl,
    created_at:
      authUser.created_at,
  };
}

export async function getCurrentUser(): Promise<User | null> {
  const supabase =
    await createServerSupabase();

  /**
   * getUser consulta o Supabase Auth
   * e retorna o registro atual do usuário.
   */
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return mapSupabaseUser(user);
}