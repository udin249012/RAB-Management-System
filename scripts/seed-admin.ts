import { spawnSync } from "node:child_process";

const result = spawnSync("pnpm", ["--filter", "@rab/backend", "seed:admin"], {
  stdio: "inherit",
  shell: true,
  env: process.env,
});

process.exit(result.status ?? 1);
