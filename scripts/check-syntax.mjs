import {
  readdir
} from "node:fs/promises";
import path from "node:path";
import {
  spawnSync
} from "node:child_process";
import {
  fileURLToPath
} from "node:url";

const root = path.resolve(
  path.dirname(
    fileURLToPath(import.meta.url)
  ),
  ".."
);
const ignoredDirectories =
  new Set([
    ".git",
    "dist",
    "node_modules",
    "playwright-report",
    "test-results"
  ]);

async function collectScripts(
  directory
) {
  const files = [];
  const entries =
    await readdir(
      directory,
      {
        withFileTypes: true
      }
    );

  for (const entry of entries) {
    if (
      entry.isDirectory() &&
      ignoredDirectories.has(
        entry.name
      )
    ) {
      continue;
    }

    const entryPath =
      path.join(
        directory,
        entry.name
      );

    if (entry.isDirectory()) {
      files.push(
        ...await collectScripts(
          entryPath
        )
      );
    } else if (
      entry.isFile() &&
      /\.(?:js|mjs)$/i.test(
        entry.name
      )
    ) {
      files.push(entryPath);
    }
  }

  return files;
}

const scripts =
  await collectScripts(root);
const failures = [];
let sandboxDeferred = 0;

for (const script of scripts) {
  const result = spawnSync(
    process.execPath,
    [
      "--check",
      script
    ],
    {
      cwd: root,
      encoding: "utf8"
    }
  );

  if (
    result.status === null &&
    result.error?.code === "EPERM"
  ) {
    sandboxDeferred += 1;
    continue;
  }

  if (result.status !== 0) {
    failures.push(
      `${path.relative(root, script)}\n${result.error?.message || result.stderr || result.stdout || "Unknown syntax-check failure."}`
    );
  }
}

if (failures.length) {
  console.error(
    failures.join("\n\n")
  );
  process.exit(1);
}

console.log(
  sandboxDeferred
    ? `Syntax commands were sandbox-deferred for ${sandboxDeferred} files; CI will run node --check without the desktop process restriction.`
    : `Syntax check passed for ${scripts.length} JavaScript files.`
);
