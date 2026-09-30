"use client";

import Link from "next/link";
import {
  Mail,
} from "lucide-react";
import {
  useState,
  type FormEvent,
} from "react";

import {
  requestPasswordResetAction,
} from "@/actions/password-reset";

import TurnstileWidget from "@/components/security/TurnstileWidget";

import Layout from "@/components/ui/Layout";

import Button from "@/components/ui/button";

import Input from "@/components/ui/input";

import {
  Card,
  CardBody,
  CardHeader,
} from "@/components/ui/card";

export default function EsqueciSenhaPage() {
  const [
    email,
    setEmail,
  ] =
    useState("");

  const [
    captchaToken,
    setCaptchaToken,
  ] =
    useState<string | null>(
      null,
    );

  const [
    captchaResetSignal,
    setCaptchaResetSignal,
  ] =
    useState(0);

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    success,
    setSuccess,
  ] =
    useState("");

  function resetCaptcha() {
    setCaptchaToken(
      null,
    );

    setCaptchaResetSignal(
      (current) =>
        current + 1,
    );
  }

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!email.trim()) {
      setError(
        "Informe seu e-mail.",
      );

      return;
    }

    if (!captchaToken) {
      setError(
        "Conclua a verificação de segurança.",
      );

      return;
    }

    setLoading(true);

    try {
      const result =
        await requestPasswordResetAction({
          email,
          captchaToken,
        });

      if (!result.ok) {
        const message =
          result.retryAfterSeconds
            ? `${result.message} Tente novamente em aproximadamente ${result.retryAfterSeconds} segundos.`
            : result.message;

        setError(
          message,
        );

        resetCaptcha();

        return;
      }

      /*
       * A mensagem é deliberadamente genérica:
       *
       * nunca revela se o e-mail existe.
       */
      setSuccess(
        result.message,
      );

      resetCaptcha();
    } catch (unexpectedError) {
      console.error(
        "Erro inesperado durante a solicitação de recuperação de senha:",
        unexpectedError,
      );

      setError(
        "Não foi possível processar a recuperação de senha. Tente novamente.",
      );

      resetCaptcha();
    } finally {
      setLoading(false);
    }
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
              Recuperar senha
            </h1>

            <p className="text-sm text-white/50">
              Informe seu e-mail para receber as instruções de recuperação.
            </p>
          </CardHeader>

          <CardBody>
            <form
              onSubmit={
                handleSubmit
              }
              className="space-y-4"
            >
              <Input
                label="Email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(
                  event,
                ) =>
                  setEmail(
                    event.target
                      .value,
                  )
                }
                icon={
                  <Mail
                    size={16}
                  />
                }
                autoComplete="email"
                maxLength={254}
                required
                disabled={
                  loading
                }
              />

              <TurnstileWidget
                onTokenChange={
                  setCaptchaToken
                }
                resetSignal={
                  captchaResetSignal
                }
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

              {success && (
                <p
                  role="status"
                  aria-live="polite"
                  className="text-sm text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-2"
                >
                  {success}
                </p>
              )}

              <Button
                type="submit"
                variant="primary"
                className="w-full"
                isLoading={
                  loading
                }
                disabled={
                  loading ||
                  !captchaToken
                }
              >
                Enviar instruções
              </Button>
            </form>

            <p className="mt-4 text-center text-sm text-white/40">
              <Link
                href="/login"
                className="text-[#38bdf8] hover:text-[#38bdf8]/80 transition-colors"
              >
                Voltar para o login
              </Link>
            </p>
          </CardBody>
        </Card>
      </div>
    </Layout>
  );
}