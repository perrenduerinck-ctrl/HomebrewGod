import {
  createReadStream
} from "node:fs";
import {
  stat
} from "node:fs/promises";
import {
  createServer
} from "node:http";
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
const port = Number(
  process.env.PORT ||
  4173
);
const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".mp3": "audio/mpeg",
  ".svg": "image/svg+xml",
  ".webp": "image/webp"
};

function resolveRequestPath(urlValue) {
  const requestUrl =
    new URL(
      urlValue,
      `http://127.0.0.1:${port}`
    );
  const decodedPath =
    decodeURIComponent(
      requestUrl.pathname
    );
  const relativePath =
    decodedPath === "/"
      ? "index.html"
      : decodedPath.replace(
          /^\/+/,
          ""
        );
  const resolved =
    path.resolve(
      root,
      relativePath
    );

  if (
    resolved !== root &&
    !resolved.startsWith(
      `${root}${path.sep}`
    )
  ) {
    return null;
  }

  return resolved;
}

const server = createServer(
  async (request, response) => {
    const filePath =
      resolveRequestPath(
        request.url ||
        "/"
      );

    if (!filePath) {
      response.writeHead(403);
      response.end("Forbidden");
      return;
    }

    try {
      const info = await stat(filePath);

      if (!info.isFile()) {
        throw new Error(
          "Not a file"
        );
      }

      response.writeHead(200, {
        "Cache-Control": "no-store",
        "Content-Length": info.size,
        "Content-Type":
          mimeTypes[
            path.extname(filePath)
              .toLowerCase()
          ] ||
          "application/octet-stream"
      });
      createReadStream(filePath)
        .pipe(response);
    } catch {
      response.writeHead(404);
      response.end("Not found");
    }
  }
);

server.listen(
  port,
  "127.0.0.1",
  () => {
    console.log(
      `Homebrew God test server listening on http://127.0.0.1:${port}`
    );
  }
);

function stopServer() {
  server.close(() => {
    process.exit(0);
  });
}

process.on("SIGINT", stopServer);
process.on("SIGTERM", stopServer);
