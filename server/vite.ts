import { type Express } from "express";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import fs from "fs";
import path from "path";
import { nanoid } from "nanoid";
import { storage } from "./storage";

const viteLogger = createLogger();

export async function setupVite(server: Server, app: Express) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server, path: "/vite-hmr" },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);

  const escapeHtml = (v: string) =>
    String(v)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const toAbsoluteUrl = (base: string, maybeUrl: string) => {
    const raw = String(maybeUrl ?? "").trim();
    if (!raw) return raw;
    if (/^https?:\/\//i.test(raw)) return raw;
    if (raw.startsWith("/")) return `${base}${raw}`;
    return `${base}/${raw}`;
  };

  app.get("/blog/:slug", async (req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") return next();

    const accept = req.headers.accept;
    if (typeof accept === "string" && !accept.includes("text/html")) return next();

    const base = `${req.protocol}://${req.get("host")}`;
    const slug = String(req.params.slug ?? "").trim();

    try {
      const clientTemplate = path.resolve(import.meta.dirname, "..", "client", "index.html");
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(`src=\"/src/main.tsx\"`, `src=\"/src/main.tsx?v=${nanoid()}\"`);

      let title = "Findtern | Internship Simplified";
      let description = "Sign up for Findtern to find internships you love. Join thousands of students connecting with top companies.";
      let image = `${base}/logo.png`;

      if (slug) {
        const posts = await storage.listWebsiteBlogPosts();
        const post = (posts ?? []).find((p: any) => String(p?.slug ?? "") === slug);
        if (post && String(post?.status ?? "").toLowerCase() === "published") {
          title = String(post.title ?? title);
          description = String(post.excerpt ?? description);
          image = toAbsoluteUrl(base, String(post.bannerImageUrl ?? "")) || image;
        }
      }

      const safeTitle = escapeHtml(title);
      const safeDescription = escapeHtml(description);
      const safeImage = escapeHtml(image);

      template = template.replace(/<title>[^<]*<\/title>/i, `<title>${safeTitle}</title>`);
      template = template.replace(
        /<meta\s+name=\"description\"\s+content=\"[^\"]*\"\s*\/>/i,
        `<meta name=\"description\" content=\"${safeDescription}\" />`,
      );

      template = template.replace(
        /<meta\s+property=\"og:title\"\s+content=\"[^\"]*\"\s*\/>/i,
        `<meta property=\"og:title\" content=\"${safeTitle}\" />`,
      );
      template = template.replace(
        /<meta\s+property=\"og:description\"\s+content=\"[^\"]*\"\s*\/>/i,
        `<meta property=\"og:description\" content=\"${safeDescription}\" />`,
      );
      template = template.replace(
        /<meta\s+property=\"og:image\"\s+content=\"[^\"]*\"\s*\/>/i,
        `<meta property=\"og:image\" content=\"${safeImage}\" />`,
      );

      template = template.replace(
        /<meta\s+name=\"twitter:title\"\s+content=\"[^\"]*\"\s*\/>/i,
        `<meta name=\"twitter:title\" content=\"${safeTitle}\" />`,
      );
      template = template.replace(
        /<meta\s+name=\"twitter:description\"\s+content=\"[^\"]*\"\s*\/>/i,
        `<meta name=\"twitter:description\" content=\"${safeDescription}\" />`,
      );
      template = template.replace(
        /<meta\s+name=\"twitter:image\"\s+content=\"[^\"]*\"\s*\/>/i,
        `<meta name=\"twitter:image\" content=\"${safeImage}\" />`,
      );

      const page = await vite.transformIndexHtml(req.originalUrl, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });

  app.use("*", async (req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") return next();
    if (req.path.startsWith("/api")) return next();

    const accept = req.headers.accept;
    if (typeof accept === "string" && !accept.includes("text/html")) return next();

    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}
