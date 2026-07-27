import {
  access,
  readFile,
  readdir
} from "node:fs/promises";
import path from "node:path";
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

async function collectSourceFiles(
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
        ...await collectSourceFiles(
          entryPath
        )
      );
    } else if (
      entry.isFile() &&
      /\.(?:html|js|mjs)$/i.test(
        entry.name
      )
    ) {
      files.push(entryPath);
    }
  }

  return files;
}

function cleanSpecifier(value) {
  return String(value || "")
    .split(/[?#]/, 1)[0]
    .trim();
}

function isLocalSpecifier(value) {
  return (
    value.startsWith("./") ||
    value.startsWith("../") ||
    value.startsWith("/")
  );
}

function collectSpecifiers(
  source,
  extension
) {
  const found = [];
  const addMatches = (
    expression
  ) => {
    for (
      const match of source.matchAll(
        expression
      )
    ) {
      found.push(match[1]);
    }
  };

  if (
    extension === ".js" ||
    extension === ".mjs"
  ) {
    addMatches(
      /\b(?:import|export)\s+(?:[^"'`]*?\s+from\s*)?["']([^"']+)["']/g
    );
    addMatches(
      /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g
    );
  }

  if (extension === ".html") {
    addMatches(
      /<(?:script|link)\b[^>]*?\b(?:src|href)=["']([^"']+)["'][^>]*>/gi
    );

    for (
      const match of source.matchAll(
        /<script\b[^>]*type=["']importmap["'][^>]*>([\s\S]*?)<\/script>/gi
      )
    ) {
      try {
        const importMap =
          JSON.parse(match[1]);

        Object.values(
          importMap.imports || {}
        ).forEach((value) => {
          found.push(value);
        });
      } catch (error) {
        found.push(
          `INVALID_IMPORT_MAP:${error.message}`
        );
      }
    }
  }

  return found;
}

async function hasExactCase(
  targetPath
) {
  const relative =
    path.relative(
      root,
      targetPath
    );

  if (
    relative.startsWith("..") ||
    path.isAbsolute(relative)
  ) {
    return false;
  }

  let current = root;

  for (
    const part of relative
      .split(path.sep)
      .filter(Boolean)
  ) {
    const entries =
      await readdir(current);

    if (!entries.includes(part)) {
      return false;
    }

    current =
      path.join(current, part);
  }

  return true;
}

const sourceFiles =
  await collectSourceFiles(root);
const failures = [];
let importCount = 0;

for (const sourceFile of sourceFiles) {
  const source =
    await readFile(
      sourceFile,
      "utf8"
    );
  const extension =
    path.extname(sourceFile)
      .toLowerCase();
  const specifiers =
    collectSpecifiers(
      source,
      extension
    );

  for (const rawSpecifier of specifiers) {
    if (
      rawSpecifier.startsWith(
        "INVALID_IMPORT_MAP:"
      )
    ) {
      failures.push(
        `${path.relative(root, sourceFile)} has an invalid import map: ${rawSpecifier.slice(19)}`
      );
      continue;
    }

    const specifier =
      cleanSpecifier(
        rawSpecifier
      );

    if (
      !specifier ||
      /^(?:data:|https?:|mailto:|#)/i.test(
        specifier
      ) ||
      !isLocalSpecifier(specifier)
    ) {
      continue;
    }

    importCount += 1;

    const target =
      specifier.startsWith("/")
        ? path.resolve(
            root,
            `.${specifier}`
          )
        : path.resolve(
            path.dirname(sourceFile),
            specifier
          );

    try {
      await access(target);

      if (
        !await hasExactCase(target)
      ) {
        failures.push(
          `${path.relative(root, sourceFile)} references ${rawSpecifier} with incorrect filename capitalization.`
        );
      }
    } catch {
      failures.push(
        `${path.relative(root, sourceFile)} references missing file ${rawSpecifier}.`
      );
    }
  }
}

if (failures.length) {
  console.error(
    failures.join("\n")
  );
  process.exit(1);
}

console.log(
  `Import graph check passed for ${importCount} local references across ${sourceFiles.length} source files.`
);
