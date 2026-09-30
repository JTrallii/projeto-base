import {
  redirect,
} from "next/navigation";

import Layout from "@/components/ui/Layout";

import {
  Card,
  CardBody,
  CardHeader,
} from "@/components/ui/card";

import {
  getRecoverySessionUserId,
} from "@/lib/auth/recovery-session";

import {
  createServerSupabase,
} from "@/lib/supabase/server";

import ResetPasswordForm from "./ResetPasswordForm";

export default async function RedefinirSenhaPage() {
  const supabase =
    await createServerSupabase();

  /*
   * A página exige uma sessão real e,
   * além disso, uma sessão originada
   * especificamente do fluxo de recovery.
   */
  const {
    data: {
      user,
    },
    error: userError,
  } =
    await supabase.auth
      .getUser();

  if (
    userError ||
    !user
  ) {
    redirect(
      "/login?recovery=invalid",
    );
  }

  const {
    data: claimsData,
    error: claimsError,
  } =
    await supabase.auth
      .getClaims();

  const recoveryUserId =
    claimsError
      ? null
      : getRecoverySessionUserId(
          claimsData?.claims,
        );

  if (
    !recoveryUserId ||
    recoveryUserId !== user.id
  ) {
    redirect(
      "/login?recovery=invalid",
    );
  }

  return (
    <Layout>
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4">
        <Card
          glass
          className="w-full max-w-md"
        >
          <CardHeader>
            <h1 className="text-2xl font-bold text-white">
              Definir nova senha
            </h1>

            <p className="text-sm text-white/50">
              Escolha uma nova senha forte para sua conta.
            </p>
          </CardHeader>

          <CardBody>
            <ResetPasswordForm />
          </CardBody>
        </Card>
      </div>
    </Layout>
  );
}