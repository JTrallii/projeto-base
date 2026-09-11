"use client";

import { useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import TurnstileWidget from "@/components/security/TurnstileWidget";
import { useAuth } from "@/contexts/AuthContext";
import Layout from "@/components/ui/Layout";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import { Card, CardHeader, CardBody } from "@/components/ui/card";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  const [captchaResetSignal, setCaptchaResetSignal] = useState(0);

  const { login } = useAuth();
  const searchParams = useSearchParams();

  function resetCaptcha() {
    setCaptchaToken(null);

    setCaptchaResetSignal((current) => current + 1);
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Preencha todos os campos.");

      return;
    }

    if (!captchaToken) {
      setError("Conclua a verificação de segurança.");

      return;
    }

    setLoading(true);

    try {
      /*
       * O middleware adiciona:
       *
       * /login?redirect=/dashboard/alguma-rota
       *
       * quando o usuário tenta acessar uma rota
       * protegida sem estar autenticado.
       */
      const redirectTo = searchParams.get("redirect") ?? "/dashboard";

      /*
       * login() chama a Server Action.
       *
       * No servidor:
       * 1. valida os dados;
       * 2. identifica o IP;
       * 3. aplica o rate limit no Upstash;
       * 4. autentica no Supabase;
       * 5. grava os cookies;
       * 6. redireciona.
       */
      const result = await login(email, password, captchaToken, redirectTo);

      /*
       * Em caso de sucesso, a Server Action
       * redireciona e normalmente não chega aqui.
       */
      if (result.error) {
        if (result.retryAfterSeconds) {
          setError(
            `${result.error} Tente novamente em aproximadamente ${result.retryAfterSeconds} segundos.`,
          );
        } else {
          setError(result.error);
        }

        resetCaptcha();
      }
    } catch (unexpectedError) {
      console.error("Erro inesperado durante o login:", unexpectedError);
      resetCaptcha();

      setError("Não foi possível realizar o login. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4">
        <Card glass className="w-full max-w-md">
          <CardHeader>
            <h1 className="text-2xl font-bold text-white">Entrar</h1>
            <p className="text-sm text-white/50">
              Acesse sua conta para continuar.
            </p>
          </CardHeader>

          <CardBody>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                icon={<Mail size={16} />}
                autoComplete="email"
                required
                disabled={loading}
              />

              <div className="relative">
                <Input
                  label="Senha"
                  type={showPassword ? "text" : "password"}
                  placeholder="Sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  icon={<Lock size={16} />}
                  autoComplete="current-password"
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
              <TurnstileWidget
                onTokenChange={setCaptchaToken}
                resetSignal={captchaResetSignal}
              />

              {error && (
                <p
                  role="alert"
                  aria-live="polite"
                  className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-2"
                >
                  {error}
                </p>
              )}

              <Button
                type="submit"
                variant="primary"
                className="w-full"
                isLoading={loading}
                disabled={loading || !captchaToken}
              >
                Entrar
              </Button>
            </form>

            <p className="mt-4 text-center text-sm text-white/40">
              <Link
                href="/esqueci-senha"
                className="text-[#38bdf8] hover:text-[#38bdf8]/80 transition-colors"
              >
                Esqueceu sua senha?
              </Link>
            </p>

            <p className="mt-4 text-center text-sm text-white/40">
              Não tem conta?{" "}
              <Link
                href="/cadastro"
                className="text-[#38bdf8] hover:text-[#38bdf8]/80 transition-colors"
              >
                Criar conta
              </Link>
            </p>
          </CardBody>
        </Card>
      </div>
    </Layout>
  );
}
