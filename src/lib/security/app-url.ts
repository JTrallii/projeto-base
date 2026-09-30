import "server-only";

export function getAppUrl(): string | null {
  const rawAppUrl = process.env.APP_URL?.trim();

  if (!rawAppUrl) {
    return null;
  }

  try {
    const url = new URL(rawAppUrl);

    if (url.username || url.password) {
      return null;
    }

    if (url.pathname !== "/" || url.search || url.hash) {
      return null;
    }

    if (url.protocol === "https:") {
      return url.origin;
    }

    const isLocalhost =
      url.hostname === "localhost" ||
      url.hostname === "127.0.0.1" ||
      url.hostname === "[::1]";

    if (
      process.env.NODE_ENV === "development" &&
      url.protocol === "http:" &&
      isLocalhost
    ) {
      return url.origin;
    }

    return null;
  } catch {
    return null;
  }
}