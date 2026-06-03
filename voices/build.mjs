import * as esbuild from "esbuild";
import { rmSync, mkdirSync, copyFileSync } from "node:fs";

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
    __APP_VERSION__: JSON.stringify(process.env.APP_VERSION || "dev"),
  },
  outfile: `${outdir}/bundle.js`,
  logLevel: "info",
});

copyFileSync("public/index.html", `${outdir}/index.html`);
console.log("voices: build complete → dist/");
