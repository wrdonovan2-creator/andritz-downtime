import express from 'express';
import type { Express } from 'express';
import fs from "node:fs";
import path from "node:path";

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  const hasStatic = fs.existsSync(distPath);
  if (hasStatic) {
    app.use(express.static(distPath));
    // fall through to index.html if the file doesn't exist
    app.use("/{*path}", (_req, res) => {
      res.sendFile(path.resolve(distPath, "index.html"));
    });
  } else {
    // In the published sandbox, the static frontend is served from S3, not from the backend.
    // The backend only handles /api routes. Provide a stub for any non-api hit so we don't 500.
    console.warn(`[static] no dist/public found at ${distPath} — backend running in API-only mode`);
    app.get("/", (_req, res) => res.status(200).json({ ok: true, mode: "api-only" }));
  }
}
