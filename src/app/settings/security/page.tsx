import { redirect } from "next/navigation";

import Layout from "@/components/ui/Layout";

import { Card, CardBody, CardHeader } from "@/components/ui/card";

import { createServerSupabase } from "@/lib/supabase/server";

import PasswordChangeForm from "./PasswordChangeForm";

export default async function SettingsSecurityPage() {
  /*
   * ============================================================
   * AUTHENTICATION
   * ============================================================
   *
   * Não confiamos apenas:
   *
   * - no Middleware;
   * - na existência da página;
   * - no estado do client.
   *
   * A identidade é validada novamente
   * diretamente no Supabase Auth.
   */
  const supabase = await createServerSupabase();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login?redirect=%2Fsettings%2Fsecurity");
  }

  return (
    <Layout>
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-12">
        <Card glass className="w-full max-w-md">
          <CardHeader>
            <h1 className="text-2xl font-bold text-white">
              Segurança da conta
            </h1>

            <p className="text-sm text-white/50">
              Altere sua senha de acesso com segurança.
            </p>
          </CardHeader>

          <CardBody>
            <PasswordChangeForm />

            <div className="mt-6 border-t border-white/10 pt-5">
              <p className="text-xs leading-relaxed text-white/40">
                Após uma alteração bem-sucedida, suas sessões serão encerradas e
                será necessário fazer login novamente.
              </p>
            </div>
          </CardBody>
        </Card>
      </div>
    </Layout>
  );
}
