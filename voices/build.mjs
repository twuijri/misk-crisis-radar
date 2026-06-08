import * as esbuild from "esbuild";
import { rmSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const APP_VERSION = process.env.APP_VERSION || "dev";

/* Bundle the React library into a single self-contained file. No CDN:
   everything (React, lucide-react, app code) is bundled, and fonts are
   served self-hosted from /assets/fonts. Output goes to dist/, which the
   Docker build copies into the nginx web root under /voices/. */

const outdir = "dist";
rmSync(outdir, { recursive: true, force: true });
mkdirSync(outdir, { recursive: true });

await esbuild.build({
  entryPoints: ["src/main.jsx"],
  bundle: true,
  minify: true,
  sourcemap: false,
  format: "iife",
  target: ["es2019"],
  loader: { ".js": "jsx", ".jsx": "jsx" },
  jsx: "automatic",
  define: {
    "process.env.NODE_ENV": '"production"',
    __APP_VERSION__: JSON.stringify(APP_VERSION),
  },
  outfile: `${outdir}/bundle.js`,
  logLevel: "info",
});

// Stamp the version into the shell so the bundle URL is cache-busted on every
// deploy (bundle.js?v=<version>) — otherwise browsers serve a stale cached JS.
const html = readFileSync("public/index.html", "utf8").replaceAll("__APP_VERSION__", APP_VERSION);
writeFileSync(`${outdir}/index.html`, html);
console.log(`voices: build complete → dist/ (version ${APP_VERSION})`);
