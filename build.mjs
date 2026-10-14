import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const dist = join(root, "dist");
const assets = join(dist, "assets");

async function build() {
  if (existsSync(dist)) rmSync(dist, { recursive: true, force: true });
  mkdirSync(assets, { recursive: true });

  let viteModule;
  let reactPlugin;
  try {
    viteModule = await import("vite");
    const reactModule = await import("@vitejs/plugin-react");
    reactPlugin = reactModule.default;
  } catch (error) {
    console.error("ERREUR : Vite ou le plugin React est introuvable.");
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }

  const vite = viteModule.default || viteModule;
  if (!vite || typeof vite.build !== "function") {
    console.error("ERREUR : la commande de build Vite est absente.");
    process.exit(1);
  }

  try {
    await vite.build({
      root,
      configFile: false,
      base: "./",
      plugins: [reactPlugin()],
      build: {
        outDir: dist,
        emptyOutDir: true,
        assetsDir: "assets",
        cssCodeSplit: false,
      },
    });
  } catch (error) {
    console.error("ERREUR : le build Vite a échoué.");
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }

  const names = existsSync(assets) ? readdirSync(assets) : [];
  const jsFiles = names.filter((name) => name.endsWith(".js"));
  const cssFiles = names.filter((name) => name.endsWith(".css"));
  if (jsFiles.length === 0) {
    console.error("ERREUR : aucun fichier JavaScript dans dist/assets — interface absente.");
    process.exit(1);
  }

  const cssLinks = cssFiles
    .map((name) => `    <link rel="stylesheet" href="./assets/${name}" />`)
    .join("\n");
  const scripts = jsFiles
    .map((name) => `    <script type="module" src="./assets/${name}"></script>`)
    .join("\n");

  const html = `<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="color-scheme" content="dark" />
    <title>Partants PMU</title>
    <style>
      html, body, #root { min-height: 100%; background: #04180f; color: #ecfdf5; }
      body { margin: 0; font-family: "Segoe UI", system-ui, sans-serif; }
    </style>
${cssLinks}
  </head>
  <body>
    <div id="root"></div>
${scripts}
  </body>
</html>
`;
  writeFileSync(join(dist, "index.html"), html, "utf8");

  try {
    const pub = join(root, "public");
    if (existsSync(pub)) cpSync(pub, dist, { recursive: true });
  } catch {
    /* public optionnel */
  }

  const index = readFileSync(join(dist, "index.html"), "utf8");
  if (index.indexOf("./assets/") < 0 || index.indexOf("<script") < 0 || readdirSync(assets).filter((name) => name.endsWith(".js")).length === 0) {
    console.error("ERREUR : aucun fichier JavaScript dans dist/assets — interface absente.");
    process.exit(1);
  }
  console.log("Partants PMU : page autonome prête dans dist/ (" + jsFiles.join(", ") + ")");
}

build();
