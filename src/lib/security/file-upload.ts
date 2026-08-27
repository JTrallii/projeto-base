import "server-only";

export const DEFAULT_UPLOAD_MAX_BYTES =
  5 * 1024 * 1024;

export const DEFAULT_ALLOWED_MIME_TYPES =
  [
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
  ] as const;

export type AllowedMimeType =
  (typeof DEFAULT_ALLOWED_MIME_TYPES)[number];

export type FileValidationErrorCode =
  | "FILE_REQUIRED"
  | "FILE_TOO_LARGE"
  | "INVALID_MIME_TYPE"
  | "INVALID_EXTENSION"
  | "SVG_NOT_ALLOWED"
  | "INVALID_FILE_NAME"
  | "INVALID_FILE_SIGNATURE";

export type FileValidationResult =
  | {
      ok: true;
      file: File;
      safeExtension: string;
    }
  | {
      ok: false;
      code: FileValidationErrorCode;
      message: string;
    };

type ValidateUploadOptions = {
  maxBytes?: number;
  allowedMimeTypes?: readonly string[];
};

const MIME_TO_EXTENSIONS: Record<
  string,
  readonly string[]
> = {
  "image/jpeg": [
    "jpg",
    "jpeg",
  ],

  "image/png": [
    "png",
  ],

  "image/webp": [
    "webp",
  ],

  "application/pdf": [
    "pdf",
  ],
};

function getExtension(
  fileName: string,
): string {
  const lastDot =
    fileName.lastIndexOf(".");

  if (
    lastDot <= 0 ||
    lastDot ===
      fileName.length - 1
  ) {
    return "";
  }

  return fileName
    .slice(lastDot + 1)
    .toLowerCase();
}

function isSafeFileName(
  fileName: string,
): boolean {
  if (
    !fileName ||
    fileName.length > 180
  ) {
    return false;
  }

  if (
    fileName.includes("/") ||
    fileName.includes("\\") ||
    fileName.includes("\0")
  ) {
    return false;
  }

  return true;
}

export function validateUploadFile(
  input: unknown,
  options: ValidateUploadOptions = {},
): FileValidationResult {
  if (!(input instanceof File)) {
    return {
      ok: false,
      code: "FILE_REQUIRED",
      message:
        "Arquivo não informado.",
    };
  }

  const maxBytes =
    options.maxBytes ??
    DEFAULT_UPLOAD_MAX_BYTES;

  const allowedMimeTypes =
    options.allowedMimeTypes ??
    DEFAULT_ALLOWED_MIME_TYPES;

  if (input.size <= 0) {
    return {
      ok: false,
      code: "FILE_REQUIRED",
      message:
        "Arquivo vazio ou inválido.",
    };
  }

  if (input.size > maxBytes) {
    return {
      ok: false,
      code: "FILE_TOO_LARGE",
      message:
        "O arquivo excede o tamanho permitido.",
    };
  }

  const extension =
    getExtension(input.name);

  if (
    extension === "svg" ||
    input.type ===
      "image/svg+xml"
  ) {
    return {
      ok: false,
      code: "SVG_NOT_ALLOWED",
      message:
        "Arquivos SVG não são permitidos.",
    };
  }

  if (
    !allowedMimeTypes.includes(
      input.type,
    )
  ) {
    return {
      ok: false,
      code: "INVALID_MIME_TYPE",
      message:
        "Tipo de arquivo não permitido.",
    };
  }

  const expectedExtensions =
    MIME_TO_EXTENSIONS[
      input.type
    ];

  if (
    !expectedExtensions ||
    !expectedExtensions.includes(
      extension,
    )
  ) {
    return {
      ok: false,
      code: "INVALID_EXTENSION",
      message:
        "Extensão incompatível com o tipo do arquivo.",
    };
  }

  if (
    !isSafeFileName(
      input.name,
    )
  ) {
    return {
      ok: false,
      code: "INVALID_FILE_NAME",
      message:
        "Nome de arquivo inválido.",
    };
  }

  return {
    ok: true,
    file: input,
    safeExtension:
      extension,
  };
}

export async function validateUploadSignature(
  file: File,
): Promise<
  | { ok: true }
  | {
      ok: false;
      code: "INVALID_FILE_SIGNATURE";
      message: string;
    }
> {
  const buffer =
    await file
      .slice(0, 16)
      .arrayBuffer();

  const bytes =
    new Uint8Array(buffer);

  const matches = (
    signature: number[],
    offset = 0,
  ) =>
    signature.every(
      (byte, index) =>
        bytes[offset + index] ===
        byte,
    );

  let valid = false;

  switch (file.type) {
    case "image/jpeg":
      valid = matches([
        0xff,
        0xd8,
        0xff,
      ]);
      break;

    case "image/png":
      valid = matches([
        0x89,
        0x50,
        0x4e,
        0x47,
        0x0d,
        0x0a,
        0x1a,
        0x0a,
      ]);
      break;

    case "image/webp":
      valid =
        matches([
          0x52,
          0x49,
          0x46,
          0x46,
        ]) &&
        matches(
          [
            0x57,
            0x45,
            0x42,
            0x50,
          ],
          8,
        );
      break;

    case "application/pdf":
      valid = matches([
        0x25,
        0x50,
        0x44,
        0x46,
        0x2d,
      ]);
      break;

    default:
      valid = false;
  }

  if (!valid) {
    return {
      ok: false,
      code:
        "INVALID_FILE_SIGNATURE",
      message:
        "O conteúdo do arquivo não corresponde ao tipo informado.",
    };
  }

  return {
    ok: true,
  };
}