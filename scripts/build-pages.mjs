import {
  cp,
  mkdir,
  readdir,
  rm
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
const output =
  path.join(root, "dist");
await import(
  "./check-imports.mjs"
);
await import(
  "./validate-data.mjs"
);

if (
  path.dirname(output) !== root ||
  path.basename(output) !== "dist"
) {
  throw new Error(
    "Refusing to clean an unexpected Pages output path."
  );
}

await rm(
  output,
  {
    recursive: true,
    force: true
  }
);
await mkdir(
  output,
  {
    recursive: true
  }
);

const rootEntries =
  await readdir(
    root,
    {
      withFileTypes: true
    }
  );
const rootFiles =
  rootEntries.filter((entry) => {
    return (
      entry.isFile() &&
      (
        /\.(?:css|html|js)$/i.test(
          entry.name
        ) ||
        entry.name === ".nojekyll"
      )
    );
  });

for (const entry of rootFiles) {
  await cp(
    path.join(root, entry.name),
    path.join(output, entry.name)
  );
}

for (
  const auditFile of
  [
    "firebase.json",
    "firestore.rules"
  ]
) {
  await cp(
    path.join(root, auditFile),
    path.join(output, auditFile)
  );
}

await mkdir(
  path.join(output, "functions"),
  {
    recursive: true
  }
);
await cp(
  path.join(root, "functions", "index.js"),
  path.join(output, "functions", "index.js")
);

for (
  const directory of
  [
    "tests/browser-pages",
    "assets",
    "battleMap",
    "characterCreator",
    "characterSheet",
    "data",
    "monsters",
    "shared",
    "tokens",
    "vfx"
  ]
) {
  await cp(
    path.join(root, directory),
    path.join(output, directory),
    {
      recursive: true
    }
  );
}

console.log(
  `GitHub Pages artifact created at ${output}.`
);

