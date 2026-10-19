"""Check binary glyph fidelity, advances, coverage and content fingerprints."""

import hashlib
import json
from pathlib import Path

from fontTools.pens.recordingPen import DecomposingRecordingPen
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[2]


def outline(glyphs, name):
    pen = DecomposingRecordingPen(glyphs)
    glyphs[name].draw(pen)
    return pen.value


def main():
    source = TTFont(ROOT / "public/fonts/kami-cn.woff2")
    source_cmap = source.getBestCmap()
    source_glyphs = source.getGlyphSet()
    manifest = json.loads((ROOT / "src/generated/kami-fonts.json").read_text())
    partition = json.loads(Path(__file__).with_name("kami-groups.json").read_text())
    groups = {g["id"]: set(map(ord, g["characters"])) for g in partition["groups"]}
    seen = set()
    for chunk in manifest["chunks"]:
        file = ROOT / "public" / chunk["url"].lstrip("/")
        data = file.read_bytes()
        assert len(data) == chunk["bytes"], file
        assert hashlib.sha256(data).hexdigest()[:12] in file.name, file
        font = TTFont(file)
        cmap = font.getBestCmap()
        glyphs = font.getGlyphSet()
        assert set(cmap) == groups[chunk["id"]], file
        assert not seen.intersection(cmap), file
        seen.update(cmap)
        for point, name in cmap.items():
            original = source_cmap[point]
            assert font["hmtx"][name] == source["hmtx"][original], hex(point)
            assert outline(glyphs, name) == outline(source_glyphs, original), hex(point)
    assert seen == set(source_cmap)
    print(f"PASS: {len(seen)} codepoints, identical outlines and advances, no overlaps")


if __name__ == "__main__":
    main()
