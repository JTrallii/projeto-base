"use client";

import {
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  ShieldCheck,
} from "lucide-react";

import { useRouter } from "next/navigation";

import {
  useState,
  type FormEvent,
} from "react";

import {
  changePasswordAction,
  requestPasswordChangeReauthenticationAction,
} from "@/actions/password-change";

import Button from "@/components/ui/button";
import Input from "@/components/ui/input";

export default function PasswordChangeForm() {
  const router = useRouter();

  const [
    currentPassword,
    setCurrentPassword,
  ] = useState("");

  const [
    newPassword,
    setNewPassword,
  ] = useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [
    nonce,
    setNonce,
  ] = useState("");

  const [
    showCurrentPassword,
    setShowCurrentPassword,
  ] = useState(false);

  const [
    showNewPassword,
    setShowNewPassword,
  ] = useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);

  const [
    reauthenticationRequired,
    setReauthenticationRequired,
  ] = useState(false);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    resendLoading,
    setResendLoading,
  ] = useState(false);

  const [
    generalError,
    setGeneralError,
  ] = useState("");

  const [
    infoMessage,
    setInfoMessage,
  ] = useState("");

  const [
    fieldErrors,
    setFieldErrors,
  ] = useState<
    Record<
      string,
      string
    >
  >({});

  function normalizeFieldErrors(
    errors:
      | Record<
          string,
          string[] | undefined
        >
      | undefined,
  ) {
    const normalizedErrors:
      Record<
        string,
        string
      > = {};

    if (!errors) {
      return normalizedErrors;
    }

    for (
      const [
        field,
        messages,
      ] of Object.entries(
        errors,
      )
    ) {
      const firstMessage =
        messages?.[0];

      if (firstMessage) {
        normalizedErrors[
          field
        ] =
          firstMessage;
      }
    }

    return normalizedErrors;
  }

  async function requestReauthentication() {
    setGeneralError("");
    setInfoMessage("");

    setResendLoading(true);

    try {
      const result =
        await requestPasswordChangeReauthenticationAction();

      if (!result.ok) {
        const message =
          result.retryAfterSeconds
            ? `${result.message} Tente novamente em aproximadamente ${result.retryAfterSeconds} segundos.`
            : result.message;

        setGeneralError(
          message,
        );

        return false;
      }

      setReauthenticationRequired(
        true,
      );

      setNonce("");

      setInfoMessage(
        result.message,
      );

      return true;
    } catch (unexpectedError) {
      console.error(
        "Erro inesperado ao solicitar reautenticação:",
        unexpectedError,
      );

      setGeneralError(
        "Não foi possível enviar o código de segurança neste momento.",
      );

      return false;
    } finally {
      setResendLoading(
        false,
      );
    }
  }

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setGeneralError("");
    setInfoMessage("");
    setFieldErrors({});

    setLoading(true);

    try {
      const result =
        await changePasswordAction({
          currentPassword,
          newPassword,
          confirmPassword,

          ...(reauthenticationRequired
            ? {
                nonce,
              }
            : {}),
        });

      if (!result.ok) {
        if (
          result.fieldErrors
        ) {
          setFieldErrors(
            normalizeFieldErrors(
              result.fieldErrors,
            ),
          );
        }

        /*
         * Sessão antiga:
         *
         * solicita automaticamente
         * o nonce de reautenticação.
         */
        if (
          result.code ===
          "REAUTHENTICATION_REQUIRED"
        ) {
          setLoading(false);

          await requestReauthentication();

          return;
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
       * A Server Action já:
       *
       * - validou a senha atual;
       * - alterou a senha;
       * - registrou Audit Log;
       * - tentou revogar as sessões.
       *
       * Agora voltamos para o login.
       */
      router.replace(
        "/login?passwordChanged=success",
      );

      router.refresh();
    } catch (unexpectedError) {
      console.error(
        "Erro inesperado durante alteração de senha:",
        unexpectedError,
      );

      setGeneralError(
        "Não foi possível alterar a senha neste momento.",
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
          label="Senha atual"
          type={
            showCurrentPassword
              ? "text"
              : "password"
          }
          placeholder="Digite sua senha atual"
          value={
            currentPassword
          }
          onChange={(
            event,
          ) =>
            setCurrentPassword(
              event.target
                .value,
            )
          }
          icon={
            <KeyRound
              size={16}
            />
          }
          error={
            fieldErrors
              .currentPassword
          }
          autoComplete="current-password"
          maxLength={1024}
          required
          disabled={
            loading ||
            resendLoading
          }
        />

        <button
          type="button"
          onClick={() =>
            setShowCurrentPassword(
              (
                current,
              ) =>
                !current,
            )
          }
          disabled={
            loading ||
            resendLoading
          }
          aria-label={
            showCurrentPassword
              ? "Ocultar senha atual"
              : "Mostrar senha atual"
          }
          aria-pressed={
            showCurrentPassword
          }
          className="absolute right-3 bottom-2.5 text-white/40 hover:text-white/70 transition-colors disabled:opacity-50"
        >
          {showCurrentPassword
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
          label="Nova senha"
          type={
            showNewPassword
              ? "text"
              : "password"
          }
          placeholder="Mínimo 12 caracteres"
          value={
            newPassword
          }
          onChange={(
            event,
          ) =>
            setNewPassword(
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
              .newPassword
          }
          autoComplete="new-password"
          minLength={12}
          maxLength={256}
          required
          disabled={
            loading ||
            resendLoading
          }
        />

        <button
          type="button"
          onClick={() =>
            setShowNewPassword(
              (
                current,
              ) =>
                !current,
            )
          }
          disabled={
            loading ||
            resendLoading
          }
          aria-label={
            showNewPassword
              ? "Ocultar nova senha"
              : "Mostrar nova senha"
          }
          aria-pressed={
            showNewPassword
          }
          className="absolute right-3 bottom-2.5 text-white/40 hover:text-white/70 transition-colors disabled:opacity-50"
        >
          {showNewPassword
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
            loading ||
            resendLoading
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
            loading ||
            resendLoading
          }
          aria-label={
            showConfirmPassword
              ? "Ocultar confirmação da senha"
              : "Mostrar confirmação da senha"
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

      {reauthenticationRequired && (
        <div className="space-y-3 rounded-xl border border-[#38bdf8]/30 bg-[#38bdf8]/5 p-4">
          <div className="flex gap-3">
            <ShieldCheck
              size={20}
              className="mt-0.5 shrink-0 text-[#38bdf8]"
            />

            <div>
              <p className="text-sm font-medium text-white">
                Confirme sua identidade
              </p>

              <p className="mt-1 text-sm text-white/50">
                Sua sessão precisa ser confirmada novamente antes da alteração da senha.
                Digite o código enviado para sua conta.
              </p>
            </div>
          </div>

          <Input
            label="Código de segurança"
            type="text"
            placeholder="000000"
            value={
              nonce
            }
            onChange={(
              event,
            ) => {
              const value =
                event.target.value
                  .replace(
                    /\D/g,
                    "",
                  )
                  .slice(
                    0,
                    6,
                  );

              setNonce(
                value,
              );
            }}
            icon={
              <ShieldCheck
                size={16}
              />
            }
            error={
              fieldErrors.nonce
            }
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            disabled={
              loading ||
              resendLoading
            }
          />

          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="w-full"
            isLoading={
              resendLoading
            }
            disabled={
              loading ||
              resendLoading
            }
            onClick={() =>
              requestReauthentication()
            }
          >
            Reenviar código
          </Button>
        </div>
      )}

      {infoMessage && (
        <p
          role="status"
          aria-live="polite"
          className="text-sm text-[#38bdf8] bg-[#38bdf8]/10 border border-[#38bdf8]/30 rounded-xl px-4 py-2"
        >
          {infoMessage}
        </p>
      )}

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
          loading ||
          resendLoading ||
          (
            reauthenticationRequired &&
            nonce.length !== 6
          )
        }
      >
        Alterar senha
      </Button>
    </form>
  );
}