import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import fs from "fs";
import path from "path";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { startInterviewReminderScheduler } from "./interviewReminderScheduler";
import { startNotificationScheduler } from "./notificationScheduler";

declare module "express-session" {
  interface SessionData {
    admin?: {
      id: string;
      email: string;
      role?: string | null;
      name?: string | null;
      permissions?: string[];
    };
    signupEmailVerification?: {
      email: string;
      verifiedAt: number;
    };
  }
}

const app = express();
const httpServer = createServer(app);

 if (process.env.NODE_ENV === "production") {
   app.set("trust proxy", 1);
 }

const runtimeDirname = (() => {
  const entrypoint = process.argv[1];
  if (typeof entrypoint === "string" && entrypoint.length > 0) {
    return path.dirname(path.resolve(entrypoint));
  }

  return process.cwd();
})();

const bodyLimit = process.env.BODY_LIMIT || "25mb";

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    limit: bodyLimit,
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false, limit: bodyLimit }));

const sessionSecret = process.env.SESSION_SECRET;
if (process.env.NODE_ENV === "production" && !sessionSecret) {
  throw new Error("SESSION_SECRET is required in production");
}

app.use(
  session({
    secret: sessionSecret ?? "dev-session-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    },
  }),
);

const uploadsCandidates = [
  path.resolve(process.cwd(), "uploads"),
  path.resolve(runtimeDirname, "..", "uploads"),
];

const uploadsDir = uploadsCandidates.find((p) => fs.existsSync(p)) ?? uploadsCandidates[0];

const extraUploadsDir = uploadsCandidates.find((p) => p !== uploadsDir && fs.existsSync(p)) ?? null;

try {
  fs.mkdirSync(uploadsDir, { recursive: true });
} catch {
  // ignore
}

if (extraUploadsDir) {
  try {
    fs.mkdirSync(extraUploadsDir, { recursive: true });
  } catch {
    // ignore
  }
}

app.use(
  "/uploads",
  ...(extraUploadsDir
    ? [
        express.static(extraUploadsDir, {
          fallthrough: true,
        }),
      ]
    : []),
  express.static(uploadsDir, {
    fallthrough: false,
  }),
);

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

(async () => {
  await registerRoutes(httpServer, app);

  startInterviewReminderScheduler();
  startNotificationScheduler();

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message =
      status === 413 || err?.type === "entity.too.large"
        ? "Payload Too Large"
        : err.message || "Internal Server Error";

    res.status(status).json({ message });
    if (status >= 500) {
      console.error(err);
    }
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV !== "development") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  const listenOptions: any = {
    port,
    host: "0.0.0.0",
  };

  // `reusePort` (SO_REUSEPORT) is not supported on all platforms (notably Windows)
  // and can cause ENOTSUP: operation not supported on socket. Only enable it
  // on non-Windows platforms.
  if (process.platform !== "win32") {
    listenOptions.reusePort = true;
  }

  httpServer.listen(listenOptions, () => {
    log(`serving on port ${port}`);
  });
})();
