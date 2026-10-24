/**
 * PM2 process for the production Next.js server (VPS).
 * Binds to loopback only; Caddy proxies https://benuuprint.com -> 127.0.0.1:3021.
 * NEXT_PUBLIC_* values are build-time: set them BEFORE `pnpm build` (docs/PRODUCTION_DEPLOYMENT.md).
 * No secrets live here; the frontend has none.
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports -- CommonJS PM2 config
const path = require("node:path");

const HOST = process.env.BENUE_FRONTEND_HOST || "127.0.0.1";
const PORT = process.env.BENUE_FRONTEND_PORT || "3021";

module.exports = {
  apps: [
    {
      name: "benue-frontend",
      cwd: __dirname,
      script: path.join(__dirname, "node_modules", "next", "dist", "bin", "next"),
      args: `start --hostname ${HOST} --port ${PORT}`,
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_restarts: 10,
      min_uptime: "10s",
      restart_delay: 3000,
      env: {
        NODE_ENV: "production",
        HOST,
        PORT,
      },
    },
  ],
};
