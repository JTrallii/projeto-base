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

import {
  isNormalizableImageMimeType,
  normalizeUploadedImage,
} from "@/lib/security/image-normalization";

import {
  createAdminSupabase,
} from "@/lib/supabase/admin";

type AuthenticatedUploadOptions = {
  file: unknown;

  /**
   * O bucket deve ser escolhido
   * exclusivamente pelo servidor.
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
   * 1. Validação estrutural.
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
  } = auth.context;

  /*
   * 3. Verificação inicial
   * da assinatura do arquivo.
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
   * Valores padrão para documentos
   * que não passam por normalização.
   */
  let uploadBody:
    | File
    | Buffer =
    validation.file;

  let storedMimeType =
    validation.file.type;

  let storedExtension =
    validation.safeExtension;

  let storedSizeBytes =
    validation.file.size;

  let normalized = false;

  let imageWidth:
    | number
    | undefined;

  let imageHeight:
    | number
    | undefined;

  /*
   * 4. Imagens nunca são persistidas
   * diretamente.
   *
   * JPEG / PNG / WebP:
   *
   * arquivo recebido
   *   -> Sharp
   *   -> decode
   *   -> validação
   *   -> remoção de metadata
   *   -> auto-orient
   *   -> sRGB
   *   -> novo WebP
   */
  if (
    isNormalizableImageMimeType(
      validation.file.type,
    )
  ) {
    const normalizedImage =
      await normalizeUploadedImage(
        validation.file,
      );

    if (
      !normalizedImage.ok
    ) {
      return normalizedImage;
    }

    uploadBody =
      normalizedImage.buffer;

    storedMimeType =
      normalizedImage.mimeType;

    storedExtension =
      normalizedImage.safeExtension;

    storedSizeBytes =
      normalizedImage.sizeBytes;

    imageWidth =
      normalizedImage.width;

    imageHeight =
      normalizedImage.height;

    normalized = true;
  }

  /*
   * 5. Path sempre gerado
   * pelo servidor.
   */
  const objectPath =
    `${userId}/${randomUUID()}.${storedExtension}`;

  /*
   * 6. O cliente administrativo existe
   * somente no servidor.
   *
   * O usuário autenticado não precisa
   * receber INSERT direto no Storage.
   */
  const adminSupabase =
    createAdminSupabase();

  const {
    data,
    error,
  } = await adminSupabase.storage
    .from(options.bucket)
    .upload(
      objectPath,
      uploadBody,
      {
        contentType:
          storedMimeType,

        upsert: false,
      },
    );

  /*
   * 7. Falha no Storage.
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

        originalMimeType:
          validation.file.type,

        storedMimeType,

        originalSizeBytes:
          validation.file.size,

        storedSizeBytes,

        normalized,

        ...(imageWidth !==
        undefined
          ? {
              width:
                imageWidth,
            }
          : {}),

        ...(imageHeight !==
        undefined
          ? {
              height:
                imageHeight,
            }
          : {}),
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
   * 8. Auditoria de sucesso.
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

      originalMimeType:
        validation.file.type,

      storedMimeType,

      originalSizeBytes:
        validation.file.size,

      storedSizeBytes,

      normalized,

      ...(imageWidth !==
      undefined
        ? {
            width:
              imageWidth,
          }
        : {}),

      ...(imageHeight !==
      undefined
        ? {
            height:
              imageHeight,
          }
        : {}),
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