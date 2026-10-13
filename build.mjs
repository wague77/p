import { execSync } from "node:child_process";

execSync("npx vite build", { stdio: "inherit" });
console.log("Partants PMU : build Vite prêt dans dist/");
