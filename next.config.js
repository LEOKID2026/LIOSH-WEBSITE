const path = require("path");

/** @type {import('next').NextConfig} */
const isProdBuild = process.env.NODE_ENV === "production";
const isWindows = process.platform === "win32";

function buildContentSecurityPolicy() {
  const connectSrc = [
    "'self'",
    "https://*.supabase.co",
    "wss://*.supabase.co",
    // Google Identity Services (parent GIS sign-in)
    "https://accounts.google.com",
    // Google Tag / AdSense — measurement + ad request beacons (only loaded after consent + env)
    "https://www.google-analytics.com",
    "https://analytics.google.com",
    "https://pagead2.googlesyndication.com",
    "https://googleads.g.doubleclick.net",
  ];
  if (!isProdBuild) {
    connectSrc.push(
      "ws://localhost:*",
      "wss://localhost:*",
      "http://localhost:*",
      "http://127.0.0.1:*"
    );
  }

  const scriptSrc = [
    "'self'",
    "'unsafe-inline'",
    // Google Identity Services (parent GIS sign-in)
    "https://accounts.google.com",
    // gtag.js loader (Consent Mode + optional analytics)
    "https://www.googletagmanager.com",
    // AdSense publisher script
    "https://pagead2.googlesyndication.com",
  ];
  if (!isProdBuild) {
    scriptSrc.push("'unsafe-eval'");
  }

  const imgSrc = [
    "'self'",
    "data:",
    "blob:",
    "https://*.supabase.co",
    // Ad impression pixels / Google ad images
    "https://pagead2.googlesyndication.com",
    "https://www.googletagmanager.com",
    "https://www.google.com",
    "https://googleads.g.doubleclick.net",
  ];

  return [
    "default-src 'self'",
    `script-src ${scriptSrc.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src ${imgSrc.join(" ")}`,
    "font-src 'self' data:",
    "media-src 'self' blob: data:",
    `connect-src ${connectSrc.join(" ")}`,
    "worker-src 'self' blob:",
    // Google Identity Services button iframe + AdSense / DoubleClick
    "frame-src 'self' https://accounts.google.com https://googleads.g.doubleclick.net https://tpc.googlesyndication.com",
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

// Video-builder API reads runtime files only under public/admin-video-assets and
// data/admin-video-builder. Without excludes, Next output tracing pulls in all of public/.
const VIDEO_BUILDER_API_ROUTE = "/api/admin/video-builder/**";

const nextConfig = {
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
  // Avoid wrong workspace root when another package-lock.json exists under the user profile.
  outputFileTracingRoot: path.join(__dirname),
  outputFileTracingExcludes: {
    [VIDEO_BUILDER_API_ROUTE]: ["./public/**"],
  },
  outputFileTracingIncludes: {
    [VIDEO_BUILDER_API_ROUTE]: [
      "./public/admin-video-assets/**",
      "./data/admin-video-builder/**",
    ],
  },
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
      // Windows + long paths: filesystem webpack cache often corrupts mid-compile (ENOENT/rename).
      if (isWindows) {
        config.cache = { type: "memory" };
      }
      config.watchOptions = {
        ...config.watchOptions,
        // keep watch ignores as simple string globs to satisfy webpack schema
        ignored: [
          "**/node_modules/**",
          "**/.git/**",
          "**/.next/**",
          "**/.next-qa-deep/**",
          "**/.cursor/**",
          "**/reports/**",
          "**/tmp/**",
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
        source: '/student/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/student/',
          },
        ],
      },
      {
        source: '/parent/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/parent/',
          },
        ],
      },
      {
        source: '/teacher/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/teacher/',
          },
        ],
      },
      {
        source: '/manifest-student.webmanifest',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/manifest+json',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
        ],
      },
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/manifest+json',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
        ],
      },
      {
        source: '/manifest-parent.webmanifest',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/manifest+json',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
        ],
      },
      {
        source: '/manifest-teacher.webmanifest',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/manifest+json',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/learning/book/:path*",
        destination: "/student/learning/book/:path*",
        permanent: false,
      },
      {
        source: "/offline/:path*",
        destination: "/student/offline/:path*",
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;
