"""Inspect VFX PNGs and optionally create non-destructive RGBA compatibility copies.

Requires Pillow and numpy. Run from the repository root:
  python scripts/vfx-alpha.py --audit
  python scripts/vfx-alpha.py --build-compat
  python scripts/vfx-alpha.py --source NEW.png --output CLEAN.png --unmat --columns 6 --rows 6
The original path is never overwritten. Review flagged frames before accepting new art.
"""
import argparse
import hashlib
import json
import subprocess
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]


def inspect(path, columns=1, rows=1, atlas=None):
    im = Image.open(path).convert("RGBA")
    a = np.asarray(im)
    alpha = a[:, :, 3]
    dark = (a[:, :, :3].max(2) <= 20) & (alpha >= 250)
    report = dict(source=path.relative_to(ROOT).as_posix() if path.is_relative_to(ROOT) else str(path),
                  sha256=hashlib.sha256(path.read_bytes()).hexdigest(),
                  width=im.width, height=im.height, transparent=round(float((alpha == 0).mean()), 5),
                  lowAlpha=round(float(((alpha > 0) & (alpha <= 3)).mean()), 5),
                  opaqueBlack=round(float(dark.mean()), 5),
                  fullyOpaque=bool((alpha == 255).all()), frames=[])
    xs = atlas["columns"] if atlas else np.linspace(0, im.width, columns + 1, dtype=int)
    ys = atlas["rows"] if atlas else np.linspace(0, im.height, rows + 1, dtype=int)
    previous = None
    for y in range(rows):
        for x in range(columns):
            cell = a[int(ys[y]):int(ys[y + 1]), int(xs[x]):int(xs[x + 1])]
            energy = cell[:, :, :3].max(2) / 255 * cell[:, :, 3] / 255
            mass = float(energy.sum())
            yy, xx = np.indices(energy.shape)
            center = [float((xx * energy).sum() / max(mass, 1)) / cell.shape[1],
                      float((yy * energy).sum() / max(mass, 1)) / cell.shape[0]]
            edge = np.concatenate([energy[0], energy[-1], energy[:, 0], energy[:, -1]])
            frame = dict(index=y * columns + x, empty=mass < 1,
                         center=[round(v, 4) for v in center], brightness=round(float(energy.mean()), 4),
                         edgeCoverage=round(float((edge > .15).mean()), 4))
            if previous:
                frame["centerJump"] = round(float(np.linalg.norm(np.array(center) - previous[0])), 4)
                frame["brightnessJump"] = round(abs(frame["brightness"] - previous[1]), 4)
            previous = (center, frame["brightness"])
            report["frames"].append(frame)
    report["review"] = dict(emptyFrames=[f["index"] for f in report["frames"] if f["empty"]],
                           edgeFrames=[f["index"] for f in report["frames"] if f["edgeCoverage"] > .1],
                           centerJumps=[f["index"] for f in report["frames"] if f.get("centerJump", 0) > .18])
    return report


def clean(source, output, unmat=False, cutoff=3, matte=(0, 0, 0)):
    if source.resolve() == output.resolve():
        raise ValueError("The output must differ from the original.")
    a = np.array(Image.open(source).convert("RGBA"), dtype=np.float32)
    if unmat:
        a[:, :, :3] = np.maximum(0, a[:, :, :3] - np.array(matte))
        # RGB is premultiplied light over black. Divide by the new coverage,
        # preserving the original emitted color on black while removing matte.
        coverage = a[:, :, :3].max(2) / 255
        a[:, :, 3] *= coverage
        a[:, :, :3] /= np.maximum(coverage[:, :, None], 1 / 255)
    a[a[:, :, 3] <= cutoff] = 0
    output.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(np.rint(a).clip(0, 255).astype(np.uint8)).save(output)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--audit", action="store_true")
    parser.add_argument("--build-compat", action="store_true")
    parser.add_argument("--source", type=Path)
    parser.add_argument("--output", type=Path)
    parser.add_argument("--unmat", action="store_true")
    parser.add_argument("--columns", type=int, default=6)
    parser.add_argument("--rows", type=int, default=6)
    parser.add_argument("--metadata", type=Path)
    args = parser.parse_args()
    if args.source:
        if args.output:
            clean(args.source, args.output, args.unmat)
        print(json.dumps(inspect(args.output or args.source, args.columns, args.rows), indent=2))
        return
    metadata = json.loads(args.metadata.read_text(encoding="utf-8-sig")) if args.metadata else json.loads(
        subprocess.run(["node", str(ROOT / "scripts/vfx-asset-metadata.mjs")],
                       cwd=ROOT, capture_output=True, text=True, check=True).stdout)
    metadata = {key.split("?")[0]: value for key, value in metadata.items()}
    reports, aliases, thumbnails = [], {}, []
    for path in sorted((ROOT / "assets/vfx").rglob("*.png")):
        if "alpha-compat" in path.parts:
            continue
        key = "./" + path.relative_to(ROOT).as_posix()
        data = metadata.get(key, {})
        report = inspect(path, data.get("columns", 1), data.get("rows", 1), data.get("atlas"))
        reports.append(report)
        if report["fullyOpaque"] and report["opaqueBlack"] > .05:
            output = ROOT / "assets/vfx/alpha-compat" / path.relative_to(ROOT / "assets/vfx")
            aliases[key] = "./" + output.relative_to(ROOT).as_posix()
            matte = (0, 9, 26) if key.endswith("/buffs/blessing.png") else (0, 0, 0)
            report["removedMatte"] = matte
            if args.build_compat:
                # Blessing's nominal black background is actually dark blue.
                clean(path, output, unmat=True, matte=matte)
                thumb = Image.new("RGB", (250, 275), "#3b6671")
                im = Image.open(output).convert("RGBA")
                im.thumbnail((246, 246))
                thumb.paste(im, (2, 2), im)
                ImageDraw.Draw(thumb).text((4, 250), path.parent.name + "/" + path.stem[:22], fill="white")
                thumbnails.append(thumb)
            if output.exists():
                report["compatibilityCopy"] = inspect(output, data.get("columns", 1), data.get("rows", 1), data.get("atlas"))
    out = ROOT / "assets/vfx/audit"
    out.mkdir(exist_ok=True)
    (out / "alpha-report.json").write_text(json.dumps(reports, indent=2) + "\n", encoding="utf-8")
    if args.build_compat:
        (ROOT / "vfx/alphaAssets.js").write_text(
            "// Generated by scripts/vfx-alpha.py --build-compat. Originals remain intact.\n"
            "export const VFX_ALPHA_COPIES = Object.freeze(" + json.dumps(aliases, indent=2) + ");\n"
            "export function resolveVfxAlphaSource(src) { return VFX_ALPHA_COPIES[String(src).split(\"?\")[0]] || src; }\n", encoding="utf-8")
        if thumbnails:
            gallery = Image.new("RGB", (250 * 5, 275 * ((len(thumbnails) + 4) // 5)), "#182c34")
            for i, thumb in enumerate(thumbnails):
                gallery.paste(thumb, ((i % 5) * 250, (i // 5) * 275))
            gallery.save(out / "alpha-contact-sheet.jpg", quality=90)
    print(json.dumps(dict(inspected=len(reports), blackBacked=len(aliases), compatibilityBuilt=args.build_compat)))


if __name__ == "__main__":
    main()
