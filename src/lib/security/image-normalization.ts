import "server-only";

import sharp from "sharp";

export const DEFAULT_IMAGE_MAX_DIMENSION =
  4096;

export const DEFAULT_IMAGE_MAX_PIXELS =
  4096 * 4096;

export const DEFAULT_IMAGE_WEBP_QUALITY =
  82;

export const DEFAULT_NORMALIZED_IMAGE_MAX_BYTES =
  5 * 1024 * 1024;

const IMAGE_FORMAT_BY_MIME = {
  "image/jpeg": "jpeg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

export type NormalizableImageMimeType =
  keyof typeof IMAGE_FORMAT_BY_MIME;

type NormalizeImageOptions = {
  maxDimension?: number;
  maxPixels?: number;
  maxOutputBytes?: number;
  quality?: number;
};

export type NormalizeImageResult =
  | {
      ok: true;
      buffer: Buffer;
      mimeType: "image/webp";
      safeExtension: "webp";
      width: number;
      height: number;
      sizeBytes: number;
    }
  | {
      ok: false;
      code:
        | "INVALID_IMAGE"
        | "UNSUPPORTED_IMAGE_TYPE"
        | "ANIMATED_IMAGE_NOT_ALLOWED"
        | "IMAGE_DIMENSIONS_TOO_LARGE"
        | "NORMALIZED_IMAGE_TOO_LARGE";
      message: string;
    };

export function isNormalizableImageMimeType(
  mimeType: string,
): mimeType is NormalizableImageMimeType {
  return (
    mimeType in
    IMAGE_FORMAT_BY_MIME
  );
}

export async function normalizeUploadedImage(
  file: File,
  options: NormalizeImageOptions = {},
): Promise<NormalizeImageResult> {
  if (
    !isNormalizableImageMimeType(
      file.type,
    )
  ) {
    return {
      ok: false,
      code:
        "UNSUPPORTED_IMAGE_TYPE",
      message:
        "Tipo de imagem não suportado.",
    };
  }

  const maxDimension =
    options.maxDimension ??
    DEFAULT_IMAGE_MAX_DIMENSION;

  const maxPixels =
    options.maxPixels ??
    DEFAULT_IMAGE_MAX_PIXELS;

  const maxOutputBytes =
    options.maxOutputBytes ??
    DEFAULT_NORMALIZED_IMAGE_MAX_BYTES;

  const quality =
    options.quality ??
    DEFAULT_IMAGE_WEBP_QUALITY;

  try {
    const inputBuffer =
      Buffer.from(
        await file.arrayBuffer(),
      );

    /*
     * failOn: "warning"
     *
     * É o nível recomendado pelo Sharp
     * para entrada não confiável.
     *
     * limitInputPixels evita que imagens
     * comprimidas resultem em uma quantidade
     * excessiva de pixels na decodificação.
     *
     * unlimited permanece false para manter
     * as proteções contra exaustão de memória.
     */
    const image = sharp(
      inputBuffer,
      {
        failOn: "warning",

        limitInputPixels:
          maxPixels,

        limitInputChannels:
          4,

        unlimited:
          false,

        animated:
          false,
      },
    );

    /*
     * metadata() lê os metadados estruturais
     * necessários para validar o arquivo antes
     * da transformação.
     */
    const metadata =
      await image.metadata();

    if (
      !metadata.width ||
      !metadata.height ||
      !metadata.format
    ) {
      return {
        ok: false,
        code:
          "INVALID_IMAGE",
        message:
          "Não foi possível identificar a imagem.",
      };
    }

    /*
     * Confirma que o decoder reconheceu
     * exatamente o formato correspondente
     * ao MIME declarado.
     */
    const expectedFormat =
      IMAGE_FORMAT_BY_MIME[
        file.type
      ];

    if (
      metadata.format !==
      expectedFormat
    ) {
      return {
        ok: false,
        code:
          "INVALID_IMAGE",
        message:
          "O conteúdo da imagem não corresponde ao tipo informado.",
      };
    }

    /*
     * Por enquanto não aceitamos:
     *
     * - WebP animado;
     * - APNG/múltiplos frames;
     * - qualquer imagem multipágina.
     */
    if (
      (metadata.pages ?? 1) > 1
    ) {
      return {
        ok: false,
        code:
          "ANIMATED_IMAGE_NOT_ALLOWED",
        message:
          "Imagens animadas não são permitidas.",
      };
    }

    if (
      metadata.width >
        maxDimension ||
      metadata.height >
        maxDimension
    ) {
      return {
        ok: false,
        code:
          "IMAGE_DIMENSIONS_TOO_LARGE",
        message:
          "As dimensões da imagem excedem o limite permitido.",
      };
    }

    const pixelCount =
      metadata.width *
      metadata.height;

    if (
      pixelCount > maxPixels
    ) {
      return {
        ok: false,
        code:
          "IMAGE_DIMENSIONS_TOO_LARGE",
        message:
          "A imagem possui pixels demais.",
      };
    }

    /*
     * Reconstrução da imagem.
     *
     * autoOrient:
     * aplica orientação EXIF antes da saída.
     *
     * toColourspace:
     * normaliza a imagem para sRGB.
     *
     * webp:
     * gera um arquivo completamente novo.
     *
     * Não utilizamos withMetadata(), portanto
     * EXIF/XMP/IPTC e outros metadados não
     * são preservados na saída.
     */
    const {
      data,
      info,
    } = await image
      .autoOrient()
      .toColourspace("srgb")
      .webp({
        quality,
        effort: 4,
        smartSubsample: true,
      })
      .toBuffer({
        resolveWithObject: true,
      });

    /*
     * Defesa adicional após a conversão.
     */
    if (
      data.byteLength >
      maxOutputBytes
    ) {
      return {
        ok: false,
        code:
          "NORMALIZED_IMAGE_TOO_LARGE",
        message:
          "A imagem processada excede o tamanho permitido.",
      };
    }

    if (
      info.width >
        maxDimension ||
      info.height >
        maxDimension ||
      info.width *
        info.height >
        maxPixels
    ) {
      return {
        ok: false,
        code:
          "IMAGE_DIMENSIONS_TOO_LARGE",
        message:
          "As dimensões da imagem excedem o limite permitido.",
      };
    }

    return {
      ok: true,

      buffer:
        data,

      mimeType:
        "image/webp",

      safeExtension:
        "webp",

      width:
        info.width,

      height:
        info.height,

      sizeBytes:
        data.byteLength,
    };
  } catch (error) {
    console.warn(
      "Imagem rejeitada durante processamento",
      {
        event:
          "image.normalization_failed",

        error:
          error instanceof Error
            ? error.name
            : "unknown",
      },
    );

    return {
      ok: false,
      code:
        "INVALID_IMAGE",
      message:
        "A imagem enviada é inválida ou não pôde ser processada.",
    };
  }
}