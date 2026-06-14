const path = require("path");

/** @type {import('next').NextConfig} */
const isProdBuild = process.env.NODE_ENV === "production";
const isWindows = process.platform === "win32";

function buildContentSecurityPolicy() {
  const connectSrc = [
    "'self'",
    "https://*.supabase.co",
    "wss://*.supabase.co",
  ];
  if (!isProdBuild) {
    connectSrc.push(
      "ws://localhost:*",
      "wss://localhost:*",
      "http://localhost:*",
      "http://127.0.0.1:*"
    );
  }

  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${isProdBuild ? "" : " 'unsafe-eval'"}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://*.supabase.co",
    "font-src 'self' data:",
    "media-src 'self' blob: data:",
    `connect-src ${connectSrc.join(" ")}`,
    "worker-src 'self' blob:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "report-uri /api/security/csp-report",
  ].join("; ");
}

const globalSecurityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Content-Security-Policy",
    value: buildContentSecurityPolicy(),
  },
];

if (isProdBuild) {
  globalSecurityHeaders.push({
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  });
}

const nextConfig = {
  // Avoid wrong workspace root when another package-lock.json exists under the user profile.
  outputFileTracingRoot: path.join(__dirname),
  reactStrictMode: false, // זמנית - כדי למנוע רענון אינסופי בפיתוח
  // Windows: lower parallel SSG concurrency to avoid intermittent PageNotFoundError
  // during prerender ("Cannot find module for page") when workers race on .next artifacts.
  ...(isWindows
    ? {
        experimental: {
          staticGenerationMaxConcurrency: 1,
        },
      }
    : {}),
  webpack: (config, { dev, isServer }) => {
    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
        // keep watch ignores as simple string globs to satisfy webpack schema
        ignored: [
          "**/node_modules/**",
          "**/.git/**",
          "**/.next/**",
          "**/.cursor/**",
        ],
      };
      /**
       * React Fast Refresh נשען על שינויי רנטיים בזמן ריצה.
       * השבתת הפלאגין: אין Fast Refresh, אבל שמירת קבצים עדיין מרעננת את הדף (רענון מלא).
       * ראה: https://nextjs.org/docs/messages/fast-refresh-reload
       */
      if (!isServer && Array.isArray(config.plugins)) {
        config.plugins = config.plugins.filter((p) => {
          const n = p?.constructor?.name || "";
          return n !== "ReactRefreshWebpackPlugin";
        });
      }
    }
    return config;
  },
  // PWA support
  async headers() {
    return [
      {
        source: "/:path*",
        headers: globalSecurityHeaders,
      },
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
