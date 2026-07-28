// Absolute minimum boot to isolate whether the publish sandbox can run a
// vanilla Express app at all. If this works, the problem is in our full
// server bundle (native modules, DB, seed logic). If this also 503s, the
// sandbox itself is misconfigured.
import express from "express";
import { createServer } from "node:http";

console.log("[min] loaded cwd=", process.cwd(), "node=", process.version, "PORT=", process.env.PORT);

process.on("uncaughtException", (err) => console.error("[min-fatal]", err));
process.on("unhandledRejection", (err) => console.error("[min-reject]", err));

const app = express();
const httpServer = createServer(app);

app.get("/api/_ping", (_req, res) => {
  res.json({ ok: true, boot: "minimal", cwd: process.cwd(), node: process.version, now: new Date().toISOString(), env_port: process.env.PORT });
});

app.get("/api/_env", (_req, res) => {
  const keys = Object.keys(process.env).sort();
  res.json({ keys, PORT: process.env.PORT, PWD: process.env.PWD, HOME: process.env.HOME, NODE_ENV: process.env.NODE_ENV });
});

app.get("/", (_req, res) => {
  res.status(200).send("<html><body><h1>SHD backend minimal alive</h1><p>Try /api/_ping</p></body></html>");
});

app.use((_req, res) => {
  res.status(404).json({ minimal: true, path: _req.path });
});

const port = parseInt(process.env.PORT || "5000", 10);
httpServer.on("error", (err) => console.error("[min-listen-err]", err));
httpServer.on("listening", () => console.log("[min] listening event addr=", JSON.stringify(httpServer.address())));
httpServer.listen(port, "0.0.0.0", () => console.log(`[min] serving on ${port}`));
