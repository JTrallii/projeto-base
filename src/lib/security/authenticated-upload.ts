import "server-only";

import {
  randomUUID,
} from "crypto";

import {
  requireAuthenticatedUser,
} from "@/lib/auth/require-authenticated-user";

import {
  recordAuditEvent,
} from "@/lib/security/audit-log";

import {
  validateUploadFile,
  validateUploadSignature,
} from "@/lib/security/file-upload";

type AuthenticatedUploadOptions = {
  file: unknown;

  /**
   * Deve ser definido pelo código server-side.
   *
   * Nunca permita que o cliente escolha
   * livremente o bucket.
   */
  bucket: string;

  maxBytes?: number;

  allowedMimeTypes?:
    readonly string[];
};

export type AuthenticatedUploadResult =
  | {
      ok: true;
      bucket: string;
      path: string;
    }
  | {
      ok: false;
      code: string;
      message: string;
      retryAfterSeconds?: number;
    };

function isSafeBucketName(
  bucket: string,
): boolean {
  return /^[a-z0-9][a-z0-9_-]{0,62}$/.test(
    bucket,
  );
}

export async function uploadAuthenticatedFile(
  options: AuthenticatedUploadOptions,
): Promise<AuthenticatedUploadResult> {
  /*
   * 1. Validação estrutural barata.
   */
  const validation =
    validateUploadFile(
      options.file,
      {
        maxBytes:
          options.maxBytes,

        allowedMimeTypes:
          options.allowedMimeTypes,
      },
    );

  if (!validation.ok) {
    return validation;
  }

  /*
   * O bucket vem do servidor,
   * mas ainda validamos defensivamente.
   */
  if (
    !isSafeBucketName(
      options.bucket,
    )
  ) {
    return {
      ok: false,
      code:
        "INVALID_BUCKET",
      message:
        "Configuração de armazenamento inválida.",
    };
  }

  /*
   * 2. Autenticação + rate limit.
   */
  const auth =
    await requireAuthenticatedUser({
      rateLimitScope:
        "upload",
    });

  if (!auth.ok) {
    return auth;
  }

  const {
    userId,
    supabase,
  } = auth.context;

  /*
   * 3. Validação do conteúdo real.
   */
  const signatureValidation =
    await validateUploadSignature(
      validation.file,
    );

  if (
    !signatureValidation.ok
  ) {
    return signatureValidation;
  }

  /*
   * 4. Path seguro gerado pelo servidor.
   *
   * Nunca usamos file.name.
   */
  const objectPath =
    `${userId}/${randomUUID()}.${validation.safeExtension}`;

  /*
   * 5. Upload usando o cliente autenticado.
   *
   * Storage RLS continua sendo aplicado.
   */
  const {
    data,
    error,
  } = await supabase.storage
    .from(options.bucket)
    .upload(
      objectPath,
      validation.file,
      {
        contentType:
          validation.file.type,

        upsert: false,
      },
    );

  /*
   * 6. Falha no Storage.
   */
  if (error) {
    console.warn(
      "Upload rejeitado pelo Storage",
      {
        event:
          "storage.upload_failed",

        bucket:
          options.bucket,

        storageError:
          error.name,
      },
    );

    /*
     * Auditoria da falha.
     *
     * Não armazenamos:
     * - conteúdo;
     * - nome original;
     * - token;
     * - cookie;
     * - signed URL.
     */
    await recordAuditEvent({
      eventType:
        "storage.file_uploaded",

      outcome:
        "failure",

      actorUserId:
        userId,

      resourceType:
        "storage_object",

      resourceId:
        objectPath,

      metadata: {
        bucket:
          options.bucket,

        mimeType:
          validation.file.type,

        sizeBytes:
          validation.file.size,
      },
    });

    return {
      ok: false,
      code:
        "UPLOAD_FAILED",
      message:
        "Não foi possível enviar o arquivo.",
    };
  }

  /*
   * 7. Auditoria do upload bem-sucedido.
   */
  await recordAuditEvent({
    eventType:
      "storage.file_uploaded",

    outcome:
      "success",

    actorUserId:
      userId,

    resourceType:
      "storage_object",

    resourceId:
      data.path,

    metadata: {
      bucket:
        options.bucket,

      mimeType:
        validation.file.type,

      sizeBytes:
        validation.file.size,
    },
  });

  return {
    ok: true,
    bucket:
      options.bucket,
    path:
      data.path,
  };
}