import express, { type Express, type Request } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { storage } from "./storage";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

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
      const indexPath = path.resolve(distPath, "index.html");
      let template = await fs.promises.readFile(indexPath, "utf-8");

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

      res.status(200).set({ "Content-Type": "text/html" }).end(template);
    } catch (e) {
      next(e);
    }
  });

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (req: Request, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") return next();
    if (req.path.startsWith("/api")) return next();

    const accept = req.headers.accept;
    if (typeof accept === "string" && !accept.includes("text/html")) return next();

    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
