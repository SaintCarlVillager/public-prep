/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
  env: {
    // Versão do deploy: muda o endereço do service worker (/sw.js?v=…), que então guarda a versão nova.
    NEXT_PUBLIC_VERSAO: (process.env.VERCEL_GIT_COMMIT_SHA ?? "").slice(0, 12) || String(Date.now()),
  },
  async headers() {
    return [
      {
        // O service worker nunca vem de cache HTTP: é ele que decide o que guardar.
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
        ],
      },
    ];
  },
};

export default config;
