import type { NextConfig } from "next";

// Server Actions anti-CSRF: saat aplikasi diakses lewat proxy forwarding
// (preview Orca, reverse proxy), `origin` browser (mis. beta.orca.localhost:51069)
// berbeda dari host yang diteruskan (localhost:3000) sehingga Next membatalkan
// action. Pola wildcard dicocokkan per segmen titik DENGAN port menempel di
// segmen terakhir — `*.orca.*` menutup semua host preview Orca port berapa pun.
// Bisa dioverride: SERVER_ACTIONS_ALLOWED_ORIGINS="host1,host2".
const serverActionsAllowedOrigins = (process.env.SERVER_ACTIONS_ALLOWED_ORIGINS ?? "*.orca.*")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  transpilePackages: ["@mocci/shared"],
  experimental: {
    serverActions: {
      allowedOrigins: serverActionsAllowedOrigins,
    },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
