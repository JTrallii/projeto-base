"use client";

import {
  Eye,
  EyeOff,
  Lock,
} from "lucide-react";

import {
  useRouter,
} from "next/navigation";

import {
  useState,
  type FormEvent,
} from "react";

import {
  completePasswordResetAction,
} from "@/actions/password-reset";

import Button from "@/components/ui/button";
import Input from "@/components/ui/input";

export default function ResetPasswordForm() {
  const router =
    useRouter();

  const [
    password,
    setPassword,
  ] =
    useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] =
    useState("");

  const [
    showPassword,
    setShowPassword,
  ] =
    useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] =
    useState(false);

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  const [
    generalError,
    setGeneralError,
  ] =
    useState("");

  const [
    fieldErrors,
    setFieldErrors,
  ] =
    useState<
      Record<
        string,
        string
      >
    >({});

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setGeneralError("");
    setFieldErrors({});

    setLoading(true);

    try {
      const result =
        await completePasswordResetAction({
          password,
          confirmPassword,
        });

      if (!result.ok) {
        if (
          result.fieldErrors
        ) {
          const normalizedErrors:
            Record<
              string,
              string
            > = {};

          for (
            const [
              field,
              messages,
            ] of Object.entries(
              result.fieldErrors,
            )
          ) {
            const firstMessage =
              messages?.[0];

            if (
              firstMessage
            ) {
              normalizedErrors[
                field
              ] =
                firstMessage;
            }
          }

          setFieldErrors(
            normalizedErrors,
          );
        }

        const message =
          result.retryAfterSeconds
            ? `${result.message} Tente novamente em aproximadamente ${result.retryAfterSeconds} segundos.`
            : result.message;

        setGeneralError(
          message,
        );

        return;
      }

      /*
       * A Action já:
       *
       * - alterou a senha;
       * - registrou Audit Log;
       * - tentou revogar sessões.
       *
       * Agora mandamos o usuário de volta ao login.
       */
      router.replace(
        "/login?passwordReset=success",
      );

      router.refresh();
    } catch (unexpectedError) {
      console.error(
        "Erro inesperado durante a redefinição de senha:",
        unexpectedError,
      );

      setGeneralError(
        "Não foi possível redefinir a senha. Solicite um novo link e tente novamente.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={
        handleSubmit
      }
      className="space-y-4"
    >
      <div className="relative">
        <Input
          label="Nova senha"
          type={
            showPassword
              ? "text"
              : "password"
          }
          placeholder="Mínimo 12 caracteres"
          value={
            password
          }
          onChange={(
            event,
          ) =>
            setPassword(
              event.target
                .value,
            )
          }
          icon={
            <Lock
              size={16}
            />
          }
          error={
            fieldErrors.password
          }
          autoComplete="new-password"
          minLength={12}
          maxLength={256}
          required
          disabled={
            loading
          }
        />

        <button
          type="button"
          onClick={() =>
            setShowPassword(
              (
                current,
              ) =>
                !current,
            )
          }
          disabled={
            loading
          }
          aria-label={
            showPassword
              ? "Ocultar senha"
              : "Mostrar senha"
          }
          aria-pressed={
            showPassword
          }
          className="absolute right-3 bottom-2.5 text-white/40 hover:text-white/70 transition-colors disabled:opacity-50"
        >
          {showPassword
            ? (
              <EyeOff
                size={18}
              />
            )
            : (
              <Eye
                size={18}
              />
            )}
        </button>
      </div>

      <div className="relative">
        <Input
          label="Confirmar nova senha"
          type={
            showConfirmPassword
              ? "text"
              : "password"
          }
          placeholder="Repita a nova senha"
          value={
            confirmPassword
          }
          onChange={(
            event,
          ) =>
            setConfirmPassword(
              event.target
                .value,
            )
          }
          icon={
            <Lock
              size={16}
            />
          }
          error={
            fieldErrors
              .confirmPassword
          }
          autoComplete="new-password"
          minLength={12}
          maxLength={256}
          required
          disabled={
            loading
          }
        />

        <button
          type="button"
          onClick={() =>
            setShowConfirmPassword(
              (
                current,
              ) =>
                !current,
            )
          }
          disabled={
            loading
          }
          aria-label={
            showConfirmPassword
              ? "Ocultar confirmação de senha"
              : "Mostrar confirmação de senha"
          }
          aria-pressed={
            showConfirmPassword
          }
          className="absolute right-3 bottom-2.5 text-white/40 hover:text-white/70 transition-colors disabled:opacity-50"
        >
          {showConfirmPassword
            ? (
              <EyeOff
                size={18}
              />
            )
            : (
              <Eye
                size={18}
              />
            )}
        </button>
      </div>

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
        isLoading={
          loading
        }
        disabled={
          loading
        }
      >
        Redefinir senha
      </Button>
    </form>
  );
}