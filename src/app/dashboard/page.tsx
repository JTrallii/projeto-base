"use client";

import { useEffect } from "react";

import {
  Calendar,
  LogOut,
  Mail,
  Shield,
  User,
} from "lucide-react";

import { useRouter } from "next/navigation";

import Button from "@/components/ui/button";

import {
  Card,
  CardBody,
} from "@/components/ui/card";

import Layout from "@/components/ui/Layout";

import { useAuth } from "@/contexts/AuthContext";

export default function DashboardPage() {
  const {
    user,
    isAuthenticated,
    isLoading,
    logout,
  } =
    useAuth();

  const router =
    useRouter();

  /*
   * Se a sessão deixar de ser válida
   * enquanto esta aba estiver aberta,
   * direcionamos para o login.
   */
  useEffect(() => {
    if (
      !isLoading &&
      !isAuthenticated
    ) {
      router.replace(
        "/login",
      );
    }
  }, [
    isLoading,
    isAuthenticated,
    router,
  ]);

  /*
   * Nunca devolvemos null aqui.
   *
   * Se a sessão tiver acabado, mostramos
   * um estado transitório enquanto o
   * redirecionamento acontece.
   */
  if (
    isLoading ||
    !user
  ) {
    return (
      <Layout>
        <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center">
          <div
            className="animate-spin w-8 h-8 border-2 border-[#38bdf8] border-t-transparent rounded-full"
            aria-label="Carregando"
          />
        </div>
      </Layout>
    );
  }

  const infoItems = [
    {
      icon: User,
      label: "Nome",
      value:
        user.name ||
        "Não informado",
    },
    {
      icon: Mail,
      label: "Email",
      value:
        user.email,
    },
    {
      icon: Calendar,
      label:
        "Membro desde",
      value:
        new Date(
          user.created_at,
        ).toLocaleDateString(
          "pt-BR",
        ),
    },
    {
      icon: Shield,
      label:
        "ID do usuário",
      value:
        `${user.id.slice(
          0,
          8,
        )}...`,
    },
  ];

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-white">
            Bem-vindo,{" "}
            <span className="bg-gradient-to-r from-[#38bdf8] to-[#a855f7] bg-clip-text text-transparent">
              {user.name ||
                user.email}
              !
            </span>
          </h1>

          <p className="mt-2 text-white/50">
            Este é seu dashboard. Aqui você pode gerenciar sua conta.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          {infoItems.map(
            (
              item,
              index,
            ) => {
              const Icon =
                item.icon;

              return (
                <Card
                  key={
                    index
                  }
                  glass
                >
                  <CardBody className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-[#38bdf8]/20 to-[#a855f7]/20 flex items-center justify-center shrink-0">
                      <Icon
                        size={
                          20
                        }
                        className="text-[#38bdf8]"
                      />
                    </div>

                    <div>
                      <p className="text-xs text-white/40 uppercase tracking-wider">
                        {
                          item.label
                        }
                      </p>

                      <p className="text-base font-medium text-white mt-1">
                        {
                          item.value
                        }
                      </p>
                    </div>
                  </CardBody>
                </Card>
              );
            },
          )}
        </div>

        <div className="mt-10 flex justify-center">
          <Button
            variant="danger"
            size="lg"
            onClick={
              logout
            }
          >
            <LogOut
              size={
                18
              }
            />

            Sair da conta
          </Button>
        </div>
      </div>
    </Layout>
  );
}