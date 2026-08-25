"use client";

import Link from "next/link";
import { ArrowRight, Shield, Zap, Palette } from "lucide-react";
import Layout from "@/components/ui/Layout";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import Button from "@/components/ui/button";

const features = [
  {
    icon: Shield,
    title: "Autenticação Segura",
    desc: "Login com email/senha via Supabase Auth, proteção de rotas e gerenciamento de sessão.",
  },
  {
    icon: Zap,
    title: "Pronto pra usar",
    desc: "Componentes reutilizáveis, hooks customizados e estrutura organizada para acelerar o desenvolvimento.",
  },
  {
    icon: Palette,
    title: "Tema Escuro",
    desc: "Design responsivo com glassmorphism, gradientes e paleta moderna em tons de azul e roxo.",
  },
];

export default function Home() {
  return (
    <Layout>
      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#38bdf8]/5 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#a855f7]/20 rounded-full blur-[128px] pointer-events-none" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-28 text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight">
            Template{" "}
            <span className="bg-gradient-to-r from-[#38bdf8] to-[#a855f7] bg-clip-text text-transparent">
              Next.js + Supabase
            </span>
          </h1>
          <p className="mt-4 text-lg text-white/60 max-w-2xl mx-auto">
            Base completa para criar demos de aplicações com autenticação,
            componentes prontos e tema escuro moderno.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Link href="/cadastro">
              <Button variant="primary" size="lg">
                Começar agora
                <ArrowRight size={18} />
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="lg">
                Já tenho conta
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <Card key={i} glass>
                <CardHeader>
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-[#38bdf8]/20 to-[#a855f7]/20 flex items-center justify-center">
                    <Icon size={24} className="text-[#38bdf8]" />
                  </div>
                </CardHeader>
                <CardBody>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-white/50">{feature.desc}</p>
                </CardBody>
              </Card>
            );
          })}
        </div>
      </section>
    </Layout>
  );
}