import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const dist = join(root, "dist");
const assets = join(dist, "assets");

function walkJs(dir, acc) {
  if (!existsSync(dir)) return acc;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walkJs(full, acc);
    else if (String(entry.name).endsWith(".js")) acc.push(full);
  }
  return acc;
}

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
        emptyOutDir: false,
        assetsDir: "assets",
        cssCodeSplit: false,
        rollupOptions: {
          output: {
            format: "es",
            inlineDynamicImports: true,
            entryFileNames: "assets/index.js",
            assetFileNames: "assets/index[extname]",
          },
        },
      },
    });
  } catch (error) {
    console.error("ERREUR : le build Vite a échoué.");
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }

  if (!existsSync(assets)) mkdirSync(assets, { recursive: true });
  const jsPaths = walkJs(dist, []).filter((file) => statSync(file).size > 500);
  const entry = jsPaths.find((file) => file.endsWith(join("assets", "index.js"))) || jsPaths[0];
  if (!entry) {
    console.error("ERREUR : aucun fichier JavaScript dans dist/assets — interface absente.");
    process.exit(1);
  }
  const indexJs = join(assets, "index.js");
  if (entry !== indexJs) {
    writeFileSync(indexJs, readFileSync(entry));
  }
  if (!existsSync(indexJs) || statSync(indexJs).size < 500) {
    console.error("ERREUR : aucun fichier JavaScript dans dist/assets — interface absente.");
    process.exit(1);
  }

  const cssName = existsSync(assets)
    ? readdirSync(assets).find((name) => name.endsWith(".css"))
    : "";
  const cssLink = cssName ? `    <link rel="stylesheet" href="./assets/${cssName}" />\n` : "";

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
${cssLink}  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./assets/index.js"></script>
  </body>
</html>
`;
  writeFileSync(join(dist, "index.html"), html, "utf8");

  const pub = join(root, "public");
  if (existsSync(pub)) {
    for (const name of readdirSync(pub)) {
      if (name === "index.html") continue;
      const from = join(pub, name);
      const to = join(dist, name);
      if (!existsSync(to)) cpSync(from, to, { recursive: true });
    }
  }

  const indexHtml = readFileSync(join(dist, "index.html"), "utf8");
  const jsOk = existsSync(indexJs) && statSync(indexJs).size > 500;
  if (!jsOk || indexHtml.indexOf("./assets/index.js") < 0 || indexHtml.indexOf("<script") < 0) {
    console.error("ERREUR : aucun fichier JavaScript dans dist/assets — interface absente.");
    process.exit(1);
  }
  console.log("Partants PMU : page autonome prête dans dist/ (index.js, " + statSync(indexJs).size + " octets)");
}

build();
