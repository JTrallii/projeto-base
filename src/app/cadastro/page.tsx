"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, Eye, EyeOff, User } from "lucide-react";
import { toast } from "sonner";
import { register } from "@/actions/register";
import Layout from "@/components/ui/Layout";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/input";
import { Card, CardHeader, CardBody } from "@/components/ui/card";

export default function CadastroPage() {
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string>("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setFieldErrors({});
    setGeneralError("");

    const formData = new FormData(e.currentTarget);
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    // Validação de senhas iguais (frontend)
    if (password !== confirmPassword) {
      setFieldErrors({ confirmPassword: "As senhas não coincidem." });
      setLoading(false);
      toast.error("As senhas não coincidem.");
      return;
    }

    const result = await register(formData);

    setLoading(false);

    if (result.success) {
      toast.success("Conta criada com sucesso! Faça login.");
      setTimeout(() => router.push("/login?registered=true"), 2000);
      return;
    }

    if (result.errors) {
      setFieldErrors(result.errors);
      toast.error("Preencha todos os campos corretamente.");
      return;
    }

    if (result.message) {
      setGeneralError(result.message);
      toast.error(result.message);
    }
  }

  return (
    <Layout>
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4">
        <Card glass className="w-full max-w-md">
          <CardHeader>
            <h1 className="text-2xl font-bold text-white">Criar conta</h1>
            <p className="text-sm text-white/50">
              Preencha os dados para se cadastrar.
            </p>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Nome"
                name="nome"
                type="text"
                placeholder="Seu nome"
                icon={<User size={16} />}
                error={fieldErrors.nome}
              />
              <Input
                label="Email"
                name="email"
                type="email"
                placeholder="seu@email.com"
                icon={<Mail size={16} />}
                error={fieldErrors.email}
              />
              <div className="relative">
                <Input
                  label="Senha"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Mínimo 6 caracteres"
                  icon={<Lock size={16} />}
                  error={fieldErrors.password}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 bottom-2.5 text-white/40 hover:text-white/70 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <div className="relative">
                <Input
                  label="Confirmar senha"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Repita a senha"
                  icon={<Lock size={16} />}
                  error={fieldErrors.confirmPassword}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 bottom-2.5 text-white/40 hover:text-white/70 transition-colors"
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {generalError && (
                <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-2">
                  {generalError}
                </p>
              )}

              <Button
                type="submit"
                variant="primary"
                className="w-full"
                isLoading={loading}
              >
                Criar conta
              </Button>
            </form>

            <p className="mt-4 text-center text-sm text-white/40">
              Já tem conta?{" "}
              <Link
                href="/login"
                className="text-[#38bdf8] hover:text-[#38bdf8]/80 transition-colors"
              >
                Entrar
              </Link>
            </p>
          </CardBody>
        </Card>
      </div>
    </Layout>
  );
}