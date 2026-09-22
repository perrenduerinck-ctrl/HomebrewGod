import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { BUILTIN_ANIMATIONS } from "../vfx/animationBuiltins.js";

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  for (const animation of BUILTIN_ANIMATIONS) {
    const sourceUrl = new URL(`../${animation.sprite.replace(/^\.\//, "").split("?")[0]}`, import.meta.url);
    const outputUrl = new URL(`../${animation.thumbnailUrl.replace(/^\.\//, "")}`, import.meta.url);
    const source = await readFile(sourceUrl);
    const base64 = source.toString("base64");
    const dataUrl = await page.evaluate(async ({ animation, base64 }) => {
      const image = new Image();
      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = reject;
        image.src = `data:image/png;base64,${base64}`;
      });
      const columns = animation.grid.columns;
      const rows = animation.grid.rows;
      const frame = Math.max(0, Math.floor((animation.frameCount - 1) / 2));
      const column = frame % columns;
      const row = Math.floor(frame / columns);
      const atlas = animation.atlas;
      const left = atlas?.columns?.[column] ?? image.width * column / columns;
      const right = atlas?.columns?.[column + 1] ?? image.width * (column + 1) / columns;
      const top = atlas?.rows?.[row] ?? image.height * row / rows;
      const bottom = atlas?.rows?.[row + 1] ?? image.height * (row + 1) / rows;
      const inset = animation.inset ?? atlas?.inset ?? 0;
      const sourceWidth = Math.max(1, right - left - inset * 2);
      const sourceHeight = Math.max(1, bottom - top - inset * 2);
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 128;
      const context = canvas.getContext("2d");
      const scale = Math.min(120 / sourceWidth, 120 / sourceHeight);
      const width = sourceWidth * scale;
      const height = sourceHeight * scale;
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(image, left + inset, top + inset, sourceWidth, sourceHeight,
        (128 - width) / 2, (128 - height) / 2, width, height);
      return canvas.toDataURL("image/webp", .82);
    }, { animation, base64 });
    await mkdir(new URL(".", outputUrl), { recursive: true });
    await writeFile(fileURLToPath(outputUrl), Buffer.from(dataUrl.split(",")[1], "base64"));
  }
} finally {
  await browser.close();
}
