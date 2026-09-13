import { readFile, writeFile, mkdir, copyFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateAnimationStagingConfig, applyAnimationStagingConfig } from "./animation-staging-config.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const configPath = process.env.HOMEBREW_ANIMATION_STAGING_CONFIG;
if (!configPath) throw new Error("Set HOMEBREW_ANIMATION_STAGING_CONFIG to an authorized public staging JSON configuration. No production fallback is allowed.");
const config = validateAnimationStagingConfig(JSON.parse(await readFile(path.resolve(configPath), "utf8")));
const git = process.env.HOMEBREW_STAGING_GIT_EXECUTABLE || "git";
const sourceCommit = execFileSync(git, ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
if (!/^[a-f0-9]{40}$/.test(sourceCommit)) throw new Error("Cannot identify the source commit for the staging artifact.");
const dirty = Boolean(execFileSync(git, ["status", "--porcelain", "--untracked-files=normal"], { cwd: root, encoding: "utf8" }).trim());
const previousOutput = process.env.HOMEBREW_BUILD_OUTPUT;
process.env.HOMEBREW_BUILD_OUTPUT = "dist-staging";
try { await import("./build-pages.mjs"); }
finally { if (previousOutput === undefined) delete process.env.HOMEBREW_BUILD_OUTPUT; else process.env.HOMEBREW_BUILD_OUTPUT = previousOutput; }
const output = path.resolve(root, "dist-staging");
if (path.dirname(output) !== root || path.basename(output) !== "dist-staging") throw new Error("Unexpected staging output path.");
await writeFile(path.join(output, "app.js"), applyAnimationStagingConfig(await readFile(path.join(output, "app.js"), "utf8"), config));
const metadata = { ...config, sourceCommit, workingTreeDirty: dirty, builtAt: new Date().toISOString(), liveAcceptance: "NOT VERIFIED", hostedDeletionEndpointEnabled: false };
await writeFile(path.join(output, "animation-staging.json"), JSON.stringify(metadata, null, 2));
let html = await readFile(path.join(output, "index.html"), "utf8");
html = html.replace(/<title>/, "<title>STAGING · ").replace(/<body([^>]*)>/, '<body$1><aside style="position:fixed;bottom:4px;left:4px;z-index:99999;background:#421d00;color:white;padding:5px;pointer-events:none">ANIMATION STAGING · NOT VERIFIED</aside>');
await writeFile(path.join(output, "index.html"), html);
await mkdir(path.join(output, "staging"), { recursive: true });
await copyFile(path.join(root, "scripts", "animation-staging-rule-checks.mjs"), path.join(output, "staging", "rule-checks.mjs"));
console.log(`Staging artifact: ${output}. Firebase project: ${config.firebase.projectId}. Source: ${sourceCommit}${dirty ? " (uncommitted changes present; rebuild from clean committed code before live acceptance)" : ""}. Nothing was deployed; live checks remain NOT VERIFIED.`);
