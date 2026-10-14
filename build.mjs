import { mkdirSync, writeFileSync, existsSync, readdirSync, cpSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";

const dist = "dist";
const assets = dist + "/assets";

function writeIndex(scriptSrc) {
  const html = `<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <title>Partants PMU</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
      :root { color-scheme: dark; }
      html, body, #root { min-height: 100%; background: #04180f; color: #ecfdf5; }
      body { margin: 0; font-family: "Segoe UI", system-ui, sans-serif; }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="${scriptSrc}"></script>
  </body>
</html>
`;
  writeFileSync(dist + "/index.html", html, "utf8");
}

function listJs() {
  if (!existsSync(assets)) return [];
  return readdirSync(assets).filter((name) => name.endsWith(".js"));
}

if (existsSync(dist)) rmSync(dist, { recursive: true, force: true });
mkdirSync(assets, { recursive: true });

let viteOk = false;
try {
  const run = spawnSync("npx", ["vite", "build"], { stdio: "inherit", shell: true });
  viteOk = run.status === 0;
} catch {
  viteOk = false;
}

const viteJs = listJs();
if (!viteOk || viteJs.length === 0) {
  console.error("ERREUR : le build Vite n'a produit aucun JavaScript.");
  process.exit(1);
}

writeIndex("./assets/" + viteJs[0]);
try {
  if (existsSync("public")) cpSync("public", dist, { recursive: true });
} catch {
  /* public optionnel */
}

if (!existsSync(dist + "/index.html") || listJs().length === 0) {
  console.error("ERREUR : aucun fichier JavaScript dans dist/assets — interface absente.");
  process.exit(1);
}
console.log("Partants PMU : page prête dans dist/ (" + listJs().join(", ") + ")");
