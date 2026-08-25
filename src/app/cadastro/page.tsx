"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, Eye, EyeOff, User } from "lucide-react";
import { toast } from "sonner";
import TurnstileWidget from "@/components/security/TurnstileWidget";
import { useAuth } from "@/contexts/AuthContext";
import Layout from "@/components/ui/Layout";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import { Card, CardHeader, CardBody } from "@/components/ui/card";

export default function CadastroPage() {
  const [loading, setLoading] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [generalError, setGeneralError] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  const [captchaResetSignal, setCaptchaResetSignal] = useState(0);

  function resetCaptcha() {
    setCaptchaToken(null);

    setCaptchaResetSignal((current) => current + 1);
  }

  const { register } = useAuth();
  const router = useRouter();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setFieldErrors({});
    setGeneralError("");

    if (!captchaToken) {
      const message = "Conclua a verificação de segurança.";

      setGeneralError(message);

      toast.error(message);

      return;
    }

    setLoading(true);

    try {
      const formData = new FormData(event.currentTarget);

      const nome = String(formData.get("nome") ?? "");

      const sobrenome = String(formData.get("sobrenome") ?? "");

      const email = String(formData.get("email") ?? "");

      const password = String(formData.get("password") ?? "");

      const confirmPassword = String(formData.get("confirmPassword") ?? "");

      const result = await register(
        nome,
        sobrenome,
        email,
        password,
        confirmPassword,
        captchaToken,
      );

      if (result.error) {
        if (result.fieldErrors) {
          const normalizedErrors: Record<string, string> = {};

          for (const [field, messages] of Object.entries(result.fieldErrors)) {
            const firstMessage = messages?.[0];

            if (firstMessage) {
              normalizedErrors[field] = firstMessage;
            }
          }

          setFieldErrors(normalizedErrors);
        }

        const errorMessage = result.retryAfterSeconds
          ? `${result.error} Tente novamente em aproximadamente ${result.retryAfterSeconds} segundos.`
          : result.error;

        setGeneralError(errorMessage);

        toast.error(errorMessage);
        resetCaptcha();
        return;
      }

      if (result.requiresEmailConfirmation) {
        toast.success(
          result.message ?? "Verifique seu e-mail para confirmar o cadastro.",
        );

        router.push("/login?registered=true");

        return;
      }

      if (result.message) {
        toast.success(result.message);
      }
    } catch (error) {
      console.error("Erro inesperado durante o cadastro:", error);

      const message = "Não foi possível concluir o cadastro. Tente novamente.";

      setGeneralError(message);
      toast.error(message);
      resetCaptcha();
    } finally {
      setLoading(false);
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
                autoComplete="given-name"
                required
                disabled={loading}
              />

              <Input
                label="Sobrenome"
                name="sobrenome"
                type="text"
                placeholder="Seu sobrenome"
                icon={<User size={16} />}
                error={fieldErrors.sobrenome}
                autoComplete="family-name"
                required
                disabled={loading}
              />

              <Input
                label="Email"
                name="email"
                type="email"
                placeholder="seu@email.com"
                icon={<Mail size={16} />}
                error={fieldErrors.email}
                autoComplete="email"
                required
                disabled={loading}
              />

              <div className="relative">
                <Input
                  label="Senha"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Mínimo 12 caracteres"
                  icon={<Lock size={16} />}
                  error={fieldErrors.password}
                  autoComplete="new-password"
                  minLength={12}
                  required
                  disabled={loading}
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  disabled={loading}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  aria-pressed={showPassword}
                  className="absolute right-3 bottom-2.5 text-white/40 hover:text-white/70 transition-colors disabled:opacity-50"
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
                  autoComplete="new-password"
                  minLength={12}
                  required
                  disabled={loading}
                />

                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((current) => !current)}
                  disabled={loading}
                  aria-label={
                    showConfirmPassword
                      ? "Ocultar confirmação de senha"
                      : "Mostrar confirmação de senha"
                  }
                  aria-pressed={showConfirmPassword}
                  className="absolute right-3 bottom-2.5 text-white/40 hover:text-white/70 transition-colors disabled:opacity-50"
                >
                  {showConfirmPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>
              <TurnstileWidget
                onTokenChange={setCaptchaToken}
                resetSignal={captchaResetSignal}
              />
              {generalError && (
                <p
                  role="alert"
                  aria-live="polite"
                  className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-2"
                >
                  {generalError}
                </p>
              )}

              <Button
                type="submit"
                variant="primary"
                className="w-full"
                isLoading={loading}
                disabled={loading || !captchaToken}
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
