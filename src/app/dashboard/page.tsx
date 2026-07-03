"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  User,
  Mail,
  Calendar,
  Shield,
  LogOut,
} from "lucide-react";
import Layout from "@/components/ui/Layout";
import Button from "@/components/ui/Button";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";

export default function DashboardPage() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();

  // Redireciona se não estiver autenticado
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-2 border-[#38bdf8] border-t-transparent rounded-full" />
        </div>
      </Layout>
    );
  }

  if (!user) return null;

  const infoItems = [
    { icon: User, label: "Nome", value: user.name || "Não informado" },
    { icon: Mail, label: "Email", value: user.email },
    {
      icon: Calendar,
      label: "Membro desde",
      value: new Date(user.created_at).toLocaleDateString("pt-BR"),
    },
    {
      icon: Shield,
      label: "ID do usuário",
      value: user.id.slice(0, 8) + "...",
    },
  ];

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Saudação */}
        <div className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-white">
            Bem-vindo,{" "}
            <span className="bg-gradient-to-r from-[#38bdf8] to-[#a855f7] bg-clip-text text-transparent">
              {user.name || user.email}!
            </span>
          </h1>
          <p className="mt-2 text-white/50">
            Este é seu dashboard. Aqui você pode gerenciar sua conta.
          </p>
        </div>

        {/* Cartões de informações */}
        <div className="grid sm:grid-cols-2 gap-6">
          {infoItems.map((item, i) => {
            const Icon = item.icon;
            return (
              <Card key={i} glass>
                <CardBody className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-[#38bdf8]/20 to-[#a855f7]/20 flex items-center justify-center shrink-0">
                    <Icon size={20} className="text-[#38bdf8]" />
                  </div>
                  <div>
                    <p className="text-xs text-white/40 uppercase tracking-wider">
                      {item.label}
                    </p>
                    <p className="text-base font-medium text-white mt-1">
                      {item.value}
                    </p>
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>

        {/* Ação de logout */}
        <div className="mt-10 flex justify-center">
          <Button
            variant="danger"
            size="lg"
            onClick={logout}
          >
            <LogOut size={18} />
            Sair da conta
          </Button>
        </div>
      </div>
    </Layout>
  );
}