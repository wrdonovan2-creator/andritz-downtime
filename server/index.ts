import "dotenv/config";
import express, { Response, NextFunction } from 'express';
import type { Request } from 'express';
import { createServer } from "node:http";

// Boot diagnostics. Everything below is intentionally guarded so a failure in
// route registration, DB init, or migration cannot prevent the HTTP server
// from listening — we always want the process to answer on the port so the
// deploy proxy stops returning 503.
const bootDiag: { started: string; steps: string[]; errors: string[] } = {
  started: new Date().toISOString(),
  steps: [],
  errors: [],
};
function bootStep(msg: string) {
  const line = `[boot] ${new Date().toISOString()} ${msg}`;
  bootDiag.steps.push(msg);
  console.log(line);
}
function bootError(where: string, err: unknown) {
  const line = `[boot-error] ${where}: ${err instanceof Error ? err.stack || err.message : String(err)}`;
  bootDiag.errors.push(`${where}: ${err instanceof Error ? err.message : String(err)}`);
  console.error(line);
}

process.on("uncaughtException", (err) => bootError("uncaughtException", err));
process.on("unhandledRejection", (err) => bootError("unhandledRejection", err));

bootStep(`server/index.ts loaded cwd=${process.cwd()} node=${process.version} NODE_ENV=${process.env.NODE_ENV}`);

const app = express();
const httpServer = createServer(app);

// Health/diagnostic endpoint that is always available BEFORE any other route
// registration so we can hit it even if downstream registration fails.
app.get("/api/_health", (_req, res) => {
  res.json({ ok: true, boot: bootDiag, now: new Date().toISOString() });
});

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

// Start listening FIRST so the deploy proxy stops returning 503 while we
// initialise DB + routes. Endpoints that need the DB will return 503 with a
// helpful body until registration completes.
const port = parseInt(process.env.PORT || "5000", 10);
bootStep(`env dump PORT=${process.env.PORT} HOME=${process.env.HOME} PWD=${process.env.PWD} PATH_HEAD=${(process.env.PATH || "").slice(0, 80)} entries=${Object.keys(process.env).length}`);
httpServer.on("error", (err) => bootError("httpServer.error", err));
httpServer.on("listening", () => {
  const addr = httpServer.address();
  bootStep(`httpServer listening event addr=${JSON.stringify(addr)}`);
});
httpServer.listen(port, "0.0.0.0", () => {
  bootStep(`http server listen callback on port ${port}`);
  log(`serving on port ${port}`);
});

// Placeholder for /api/* before routes register.
let routesRegistered = false;
app.use("/api", (req, res, next) => {
  if (routesRegistered) return next();
  if (req.path === "/_health") return next();
  res.status(503).json({ message: "Server is starting, retry shortly.", boot: bootDiag });
});

(async () => {
  try {
    bootStep("importing ./routes");
    const { registerRoutes } = await import("./routes");
    bootStep("registering routes");
    await registerRoutes(httpServer, app);
    routesRegistered = true;
    bootStep("routes registered");

    app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      console.error("Internal Server Error:", err);
      if (res.headersSent) return next(err);
      return res.status(status).json({ message });
    });

    if (process.env.NODE_ENV === "production") {
      bootStep("importing ./static");
      const { serveStatic } = await import("./static");
      serveStatic(app);
      bootStep("static configured");
    } else {
      const { setupVite } = await import("./vite");
      await setupVite(httpServer, app);
    }
    bootStep("boot complete");
  } catch (e) {
    bootError("async boot", e);
    // Do NOT rethrow — keep the HTTP server up so /_health reports the error.
  }
})();
