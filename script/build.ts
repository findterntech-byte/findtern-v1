import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";
import { rm, readFile } from "fs/promises";

// server deps to bundle to reduce openat(2) syscalls
// which helps cold start times
const allowlist = [
  "@google/generative-ai",
  "axios",
  "connect-pg-simple",
  "cors",
  "date-fns",
  "drizzle-orm",
  "drizzle-zod",
  "express",
  "express-rate-limit",
  "express-session",
  "jsonwebtoken",
  "memorystore",
  "multer",
  "nanoid",
  "nodemailer",
  "openai",
  "passport",
  "passport-local",
  "pg",
  "stripe",
  "uuid",
  "ws",
  "xlsx",
  "zod",
  "zod-validation-error",
];

async function buildAll() {
  await rm("dist", { recursive: true, force: true });

  console.log("building client...");
  await viteBuild();

  console.log("building server...");
  const pkg = JSON.parse(await readFile("package.json", "utf-8"));
  const allDeps = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];
  const externals = allDeps.filter((dep) => !allowlist.includes(dep));
  
  // Add Node.js built-in modules to externals
  const nodeBuiltIns = [
    "path", "fs", "os", "crypto", "util", "url", "querystring", 
    "stream", "buffer", "events", "http", "https", "net", "tls",
    "dns", "child_process", "cluster", "worker_threads", "readline",
    "repl", "vm", "v8", "zlib", "constants", "assert", "module",
    "process", "timers", "console", "tty"
  ];
  
  const allExternals = [...externals, ...nodeBuiltIns];

  await esbuild({
    entryPoints: ["server/index.ts"],
    platform: "node",
    bundle: true,
    format: "esm",
    outfile: "dist/index.js",
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    minify: true,
    external: allExternals,
    logLevel: "info",
    banner: {
      js: "import { createRequire } from 'module';const require = createRequire(import.meta.url);",
    },
  });
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
