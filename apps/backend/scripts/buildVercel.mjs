import { createRequire } from "node:module";
import path from "node:path";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.resolve(currentDir, "..");
const requireFromBackend = createRequire(path.join(backendDir, "package.json"));
const requireFromTsx = createRequire(requireFromBackend.resolve("tsx/package.json"));
const esbuild = requireFromTsx("esbuild");

const pkg = JSON.parse(readFileSync(path.join(backendDir, "package.json"), "utf8"));
const externalDeps = Object.keys(pkg.dependencies ?? {}).filter((dep) => !dep.startsWith("@rab/"));

await esbuild.build({
  entryPoints: [path.join(backendDir, "src/vercel.ts")],
  outfile: path.join(backendDir, "dist/vercel.cjs"),
  bundle: true,
  platform: "node",
  target: "node20",
  format: "cjs",
  external: externalDeps,
  footer: {
    js: "if (module.exports && module.exports.default) { module.exports = module.exports.default; }",
  },
});
