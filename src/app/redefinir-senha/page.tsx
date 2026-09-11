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
  createServerSupabase,
} from "@/lib/supabase/server";

import ResetPasswordForm from "./ResetPasswordForm";

export default async function RedefinirSenhaPage() {
  const supabase =
    await createServerSupabase();

  /*
   * Esta página só deve existir para um usuário
   * que chegou pelo fluxo de recovery e possui
   * uma sessão válida.
   *
   * getUser() valida a identidade no Supabase Auth.
   */
  const {
    data: {
      user,
    },
    error,
  } =
    await supabase.auth
      .getUser();

  if (
    error ||
    !user
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