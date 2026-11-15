"""One-off preview of the Earth sprite with launch-site dots. Not used by the game."""
import math
import re
import struct
import zlib
from pathlib import Path

svg_path = Path(__file__).resolve().parents[1] / "src" / "assets" / "images" / "planets" / "earth.svg"
text = svg_path.read_text(encoding="utf-8")
scale = 3
size = 256 * scale
rgb = bytearray([0, 0, 0] * size * size)

def hex_to_rgb(value):
    value = value.lstrip("#")
    return int(value[0:2], 16), int(value[2:4], 16), int(value[4:6], 16)

for x, y, w, h, fill in re.findall(
    r'<rect x="(\d+)" y="(\d+)" width="(\d+)" height="(\d+)" fill="(#[0-9a-fA-F]+)"',
    text,
):
    color = hex_to_rgb(fill)
    x, y, w, h = int(x), int(y), int(w), int(h)
    for py in range(y * scale, (y + h) * scale):
        row = py * size
        for px in range(x * scale, (x + w) * scale):
            i = (row + px) * 3
            rgb[i:i + 3] = color

sites = [
    ("Lompoc", -120.6, 34.7),
    ("Cape", -80.6, 28.5),
    ("Kourou", -52.8, 5.2),
    ("Mirny", 40.6, 62.9),
    ("Baikonur", 63.3, 45.9),
    ("Sullurpeta", 80.2, 13.7),
    ("Japan", 131.0, 30.4),
    ("Mahia", 177.9, -39.3),
]
for _name, lon, lat in sites:
    radius = ((90 - lat) / 180) * 112
    sx = (128 + radius * math.cos(math.radians(lon))) * scale
    sy = (128 - radius * math.sin(math.radians(lon))) * scale
    for py in range(int(sy) - 7, int(sy) + 8):
        for px in range(int(sx) - 7, int(sx) + 8):
            dist = math.hypot(px - sx, py - sy)
            if 3.5 <= dist <= 6.5 and 0 <= px < size and 0 <= py < size:
                i = (py * size + px) * 3
                rgb[i:i + 3] = (255, 80, 120)

def chunk(tag, data):
    return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

raw = b"".join(b"\x00" + bytes(rgb[y * size * 3:(y + 1) * size * 3]) for y in range(size))
png = (
    b"\x89PNG\r\n\x1a\n"
    + chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0))
    + chunk(b"IDAT", zlib.compress(raw, 9))
    + chunk(b"IEND", b"")
)
out = Path(__file__).with_name("earth_preview.png")
out.write_bytes(png)
print(out)
