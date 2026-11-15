# Usage (from frontend/): python scripts/build_earth_spin.py src/assets/images/planets/earth.svg src/assets/images/planets/earth_spin_sheet.png 28
"""Builds earth_spin_sheet.png (N frames of 32x32, 1 px per earth.svg block) from earth.svg."""
import re, sys, zlib, struct
src, out, N = sys.argv[1], sys.argv[2], int(sys.argv[3])
s = open(src, encoding='utf-8').read()
cells = {}
for m in re.finditer(r'<rect x="(\d+)" y="(\d+)" width="8" height="8" fill="(#[0-9a-fA-F]+)"(?: fill-opacity="([\d.]+)")?', s):
    cells[(int(m.group(1)) // 8, int(m.group(2)) // 8)] = (m.group(3).lower(), float(m.group(4) or 1))

OCEAN, LAND, LAND_DARK, SAND, LIGHT, CLOUD, OCEAN_SHADE, CLOUD_SHADE = '#2f8fe6', '#5cc94a', '#3a9a30', '#f2c94c', '#8be06d', '#ffffff', '#1f5fb8', '#c9dcf0'
SURFACE = {OCEAN, LAND, LAND_DARK, SAND, LIGHT, OCEAN_SHADE}
UNSHADE = {OCEAN_SHADE: OCEAN, LAND_DARK: LAND}
SHADE = {OCEAN: OCEAN_SHADE, LAND: LAND_DARK, LIGHT: LAND_DARK, SAND: '#b08a2e', CLOUD: CLOUD_SHADE, LAND_DARK: LAND_DARK}

def is_surface(x, y):
    c = cells.get((x, y))
    if not c: return False
    if c[0] == CLOUD: return 5 <= y <= 27   # clouds between the polar caps drift with the surface
    return c[0] in SURFACE

rows = {}
for y in range(32):
    xs = [x for x in range(32) if is_surface(x, y)]
    if xs:
        tex = [UNSHADE.get(cells[(x, y)][0], cells[(x, y)][0]) for x in xs]
        shaded = [cells[(x, y)][0] in (OCEAN_SHADE, LAND_DARK) for x in xs]
        rows[y] = (xs, tex, shaded)

def rgba(hexc, a):
    return bytes([int(hexc[1:3], 16), int(hexc[3:5], 16), int(hexc[5:7], 16), round(a * 255)])

W, H = 32 * N, 32
img = [[b'\0\0\0\0'] * W for _ in range(H)]
for k in range(N):
    for (x, y), (c, a) in cells.items():
        img[y][k * 32 + x] = rgba(c, a)
    for y, (xs, tex, shaded) in rows.items():
        L = len(tex)
        shift = round(k * L / N)            # every row makes one full turn in N frames
        for i, x in enumerate(xs):
            c = tex[(i + shift) % L]
            if shaded[i]: c = SHADE.get(c, c)
            img[y][k * 32 + x] = rgba(c, 1)

raw = b''.join(b'\0' + b''.join(r) for r in img)
def chunk(t, d): return struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
png = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', W, H, 8, 6, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(raw, 9)) + chunk(b'IEND', b'')
open(out, 'wb').write(png)
print(out, W, H, len(png), 'bytes')
