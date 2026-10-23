import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";

const runtime = [
  "index.html",
  "styles.css",
  "app.js",
  "radio-core.js",
  "songs.js",
  "sw.js",
  "manifest.webmanifest",
  "favicon.png",
  "icon-192.png",
  "icon-512.png",
  "ganesh-background.webp",
  "ganesh-background-mobile.webp",
  "ganesh-logo.webp",
  ".nojekyll",
];

rmSync("_site", { recursive: true, force: true });
mkdirSync("_site", { recursive: true });

for (const file of runtime) {
  if (!existsSync(file)) {
    console.error(`Build input missing: ${file}`);
    process.exit(1);
  }
  cpSync(file, `_site/${file}`);
}

const excluded = ["ganesh background.png", "ganesh logo.png"];
for (const file of excluded) {
  if (existsSync(`_site/${file}`)) {
    console.error(`Published site should not include source artwork: ${file}`);
    process.exit(1);
  }
}

console.log(`build ok (${runtime.length} files in _site)`);
