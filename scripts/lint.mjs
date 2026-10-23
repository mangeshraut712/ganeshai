import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import vm from "node:vm";
import { sanitizeCatalog } from "../radio-core.js";

const files = [
  "app.js",
  "songs.js",
  "radio-core.js",
  "sw.js",
  "scripts/lint.mjs",
  "scripts/build.mjs",
  "test/radio-core.test.js",
];

let failed = false;

for (const file of files) {
  const result = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
  if (result.status !== 0) {
    failed = true;
    console.error(result.stderr || `${file} failed syntax check`);
  }
}

const app = readFileSync(new URL("../app.js", import.meta.url), "utf8");
if (app.includes("innerHTML")) {
  failed = true;
  console.error("app.js must build playlist rows with DOM APIs, not innerHTML");
}

const worker = readFileSync(new URL("../sw.js", import.meta.url), "utf8");
if (!worker.includes("classifyFetch") || worker.includes(".includes(\"youtube\")") || worker.includes(".includes('youtube')")) {
  failed = true;
  console.error("sw.js must classify requests by origin instead of matching the youtube substring");
}

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
if (!html.includes("type=\"module\"") || !html.includes("src=\"app.js\"")) {
  failed = true;
  console.error("index.html must load app.js as a module");
}

const sandbox = { window: {} };
vm.runInNewContext(readFileSync(new URL("../songs.js", import.meta.url), "utf8"), sandbox);
const songs = sanitizeCatalog(sandbox.window.GANESH_SONGS);
if (songs.length !== sandbox.window.GANESH_SONGS.length || songs[0]?.title !== "Ya Re Ya") {
  failed = true;
  console.error("songs.js has invalid, duplicate, or reordered tracks");
}

const referenced = new Set();
for (const source of [html, readFileSync(new URL("../styles.css", import.meta.url), "utf8")]) {
  for (const match of source.matchAll(/(?:src|href)=["']([^"']+)["']|url\(["']?([^"')]+)["']?\)/g)) {
    const value = match[1] || match[2];
    if (!value || /^(?:https?:|data:|#|mailto:)/.test(value)) continue;
    referenced.add(value.split("?")[0].split("#")[0]);
  }
}
for (const asset of referenced) {
  if (!existsSync(new URL(`../${asset}`, import.meta.url))) {
    failed = true;
    console.error(`Missing asset referenced by the page: ${asset}`);
  }
}

if (failed) process.exit(1);
console.log("lint ok");
