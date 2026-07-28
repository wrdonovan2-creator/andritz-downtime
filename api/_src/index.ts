// Vercel serverless entry point.
//
// This wraps the same Express app + route handlers used by the rest of the
// codebase (server/routes.ts) behind a single serverless function. Vercel
// routes every /api/* request here via the rewrite in vercel.json.
//
// Notes:
// - There is no persistent local filesystem on Vercel, so the old
//   `/uploads/*` static file serving is replaced with a 410 stub below.
// - Session store is express-session's default in-memory MemoryStore. This
//   is fine for a small single-shop tool but does NOT persist across
//   serverless function cold starts/instances — see MIGRATION_NOTES.md.
// - `registerRoutes` originally took an `http.Server` as its first arg (to
//   attach a WebSocket server). There's no long-lived server here, so we
//   pass a minimal stub object that satisfies the type shape it actually
//   uses (`{ on: () => {} }`).
import express, { type Express } from "express";
import session from "express-session";
import { registerRoutes } from "../../server/routes";

const app = express();
app.use(express.json({ limit: "5mb" }));
app.use(
  session({
    name: "sid",
    secret: process.env.SESSION_SECRET || "dev-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 30 * 24 * 3600 * 1000,
    },
  })
);

// Static uploads no-op — file uploads are disabled in this deployment (no
// persistent filesystem on Vercel). See server/routes.ts TODOs for the
// planned @vercel/blob follow-up.
app.use("/uploads", (_req, res) => res.status(410).json({ error: "File uploads disabled in this deployment" }));

let ready: Promise<void> | null = null;
async function ensureReady() {
  if (!ready) ready = registerRoutesAsync(app);
  return ready;
}

async function registerRoutesAsync(app: Express) {
  // Adapt to accept just the express app — the original signature also took
  // an http.Server (used only for WebSocket attachment, which no longer
  // exists in this deployment), so a minimal stub is enough.
  await registerRoutes({ on: () => {} } as any, app);
}

// Vercel's @vercel/node runtime expects the handler as the CJS module.exports
// (a bare function), not { default: handler }. esbuild's default CJS output
// wraps ESM `export default` as `exports.default = ...`, which Vercel does not
// recognize — hence /api/* returns 404. Cast to any to satisfy TS.
(module as any).exports = async function handler(req: any, res: any) {
  await ensureReady();
  return app(req, res);
};
