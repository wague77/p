import { spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";

const run = spawnSync("npx", ["vite", "build"], { stdio: "inherit", shell: true });
if (run.status !== 0) {
  process.exit(run.status || 1);
}

const assetsDir = "dist/assets";
const files = existsSync(assetsDir) ? readdirSync(assetsDir) : [];
const js = files.filter((name) => name.endsWith(".js"));
if (js.length === 0) {
  console.error("ERREUR : aucun fichier JavaScript dans dist/assets — interface absente.");
  process.exit(1);
}
console.log("Partants PMU : build Vite prêt (" + js.join(", ") + ")");
