import type { NextConfig } from "next";

const isDevelopment = process.env.NODE_ENV === "development";

function getSupabaseSources() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) {
    return {
      httpOrigin: "",
      websocketOrigin: "",
    };
  }

  try {
    const url = new URL(supabaseUrl);

    const websocketProtocol =
      url.protocol === "https:"
        ? "wss:"
        : "ws:";

    return {
      httpOrigin: url.origin,
      websocketOrigin:
        `${websocketProtocol}//${url.host}`,
    };
  } catch {
    return {
      httpOrigin: "",
      websocketOrigin: "",
    };
  }
}

const {
  httpOrigin: supabaseHttpOrigin,
  websocketOrigin: supabaseWebsocketOrigin,
} = getSupabaseSources();

const connectSources = [
  "'self'",
  supabaseHttpOrigin,
  supabaseWebsocketOrigin,
  "https://challenges.cloudflare.com",
  ...(isDevelopment
    ? [
        "ws://localhost:*",
        "ws://127.0.0.1:*",
      ]
    : []),
].filter(Boolean);

const imageSources = [
  "'self'",
  "data:",
  "blob:",
  supabaseHttpOrigin,
].filter(Boolean);

const mediaSources = [
  "'self'",
  "blob:",
  supabaseHttpOrigin,
].filter(Boolean);

const contentSecurityPolicy = [
  "default-src 'self'",

  [
    "script-src",
    "'self'",
    "'unsafe-inline'",
    ...(isDevelopment
      ? ["'unsafe-eval'"]
      : []),
    "https://challenges.cloudflare.com",
  ].join(" "),

  "script-src-attr 'none'",
  "style-src 'self' 'unsafe-inline'",

  `img-src ${imageSources.join(" ")}`,

  `media-src ${mediaSources.join(" ")}`,

  "font-src 'self' data:",

  `connect-src ${connectSources.join(" ")}`,

  "frame-src https://challenges.cloudflare.com",

  "worker-src 'self' blob:",

  "object-src 'none'",

  "base-uri 'self'",

  "form-action 'self'",

  "frame-ancestors 'none'",

  "manifest-src 'self'",

  ...(!isDevelopment
    ? ["upgrade-insecure-requests"]
    : []),
]
  .join("; ")
  .concat(";");

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: contentSecurityPolicy,
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
  },
  {
    key: "X-Permitted-Cross-Domain-Policies",
    value: "none",
  },

  ...(!isDevelopment
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=31536000",
        },
      ]
    : []),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,

  experimental: {
    serverActions: {
      bodySizeLimit: "6mb",
    },
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },

  webpack: (config) => {
    if (
      process.env.NODE_ENV ===
      "development"
    ) {
      config.module.rules.push({
        test: /\.(jsx|tsx)$/,
        exclude: /node_modules/,
        enforce: "pre",
        use:
          "@dyad-sh/nextjs-webpack-component-tagger",
      });
    }

    return config;
  },
};

export default nextConfig;