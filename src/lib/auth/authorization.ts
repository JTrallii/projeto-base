import "server-only";

export type AuthorizationErrorCode =
  | "FORBIDDEN"
  | "NOT_FOUND";

export type AuthorizationError = {
  ok: false;
  code: AuthorizationErrorCode;
  message: string;
};

export type AuthorizationSuccess<T> = {
  ok: true;
  resource: T;
};

export type AuthorizationResult<T> =
  | AuthorizationSuccess<T>
  | AuthorizationError;

export function authorized<T>(
  resource: T,
): AuthorizationSuccess<T> {
  return {
    ok: true,
    resource,
  };
}

export function forbidden(
  message =
    "Você não possui permissão para realizar esta operação.",
): AuthorizationError {
  return {
    ok: false,
    code: "FORBIDDEN",
    message,
  };
}

export function notFound(
  message =
    "Recurso não encontrado.",
): AuthorizationError {
  return {
    ok: false,
    code: "NOT_FOUND",
    message,
  };
}