"""Builds the north-polar pixel Earth used on the orbit map.

Center is the North Pole, the rim is the South Pole, and longitude matches the
launch-site markers: 0 degrees is to the right, 90 degrees east is up.
Coastlines come from the Natural Earth 1:110m land file (public domain).
"""
import json
import math
from pathlib import Path

CELL = 2
SIZE = 256
CX = CY = 128
RADIUS = 112

LAND = {
    "#8ed36a", "#46b34a", "#2f8a38", "#1f6e30",
    "#e6c56a", "#c4a24a", "#a68432",
    "#e7f6e4", "#b7d7a8", "#f7fbff", "#d7e7f4",
}
WATER = {"#3d96d6", "#2a78c0", "#2f7ed0", "#1a5aa8", "#123f7c"}


def inside(poly, lon, lat):
    hit = False
    j = len(poly) - 1
    for i, point in enumerate(poly):
        xi, yi = point[0], point[1]
        xj, yj = poly[j][0], poly[j][1]
        # The date-line cut is not a real coast. Skipping it keeps Antarctica intact.
        if abs(xj - xi) <= 180 and ((yi > lat) != (yj > lat)) and (
            lon < (xj - xi) * (lat - yi) / ((yj - yi) or 1e-9) + xi
        ):
            hit = not hit
        j = i
    return hit


def load_land():
    path = Path(__file__).with_name("ne_110m_land.geojson")
    data = json.loads(path.read_text(encoding="utf-8"))
    shapes = []
    for feature in data["features"]:
        rings = feature["geometry"]["coordinates"]
        exterior = rings[0]
        holes = rings[1:]
        xs = [point[0] for point in exterior]
        ys = [point[1] for point in exterior]
        shapes.append((exterior, holes, (min(xs), max(xs), min(ys), max(ys))))
    return shapes


SHAPES = load_land()
DESERT = [
    [(-16, 30), (-10, 18), (15, 16), (32, 30), (10, 32), (-8, 31)],
    [(36, 31), (48, 18), (56, 22), (50, 32)],
    [(122, -20), (132, -26), (146, -24), (145, -18), (130, -17)],
]


def is_land(lon, lat):
    for exterior, holes, (min_lon, max_lon, min_lat, max_lat) in SHAPES:
        if lon < min_lon or lon > max_lon or lat < min_lat or lat > max_lat:
            continue
        if inside(exterior, lon, lat) and not any(inside(hole, lon, lat) for hole in holes):
            return True
    return False


def is_desert(lon, lat):
    return any(inside(poly, lon, lat) for poly in DESERT)


def xy_to_ll(x, y):
    dx = (x + CELL / 2) - CX
    dy = CY - (y + CELL / 2)
    radius = math.hypot(dx, dy)
    if radius > RADIUS:
        return None
    lat = 90 - (radius / RADIUS) * 180
    lon = math.degrees(math.atan2(dy, dx))
    return lon, lat


def main():
    land_cells = set()
    located_cells = {}
    for y in range(0, SIZE, CELL):
        for x in range(0, SIZE, CELL):
            located = xy_to_ll(x, y)
            if located is None:
                continue
            located_cells[(x, y)] = located
            if is_land(*located):
                land_cells.add((x, y))

    grid = {}
    for y in range(0, SIZE, CELL):
        for x in range(0, SIZE, CELL):
            located = located_cells.get((x, y))
            if located is None:
                dx = (x + CELL / 2) - CX
                dy = CY - (y + CELL / 2)
                if math.hypot(dx, dy) <= RADIUS + 4:
                    grid[(x, y)] = "#7fd4ff"
                continue
            lon, lat = located
            light = max(0, min(1, ((CX - x) + (CY - y)) / (RADIUS * 1.6) + 0.45))
            on_land = (x, y) in land_cells
            if on_land and (lat > 75 or lat < -80):
                grid[(x, y)] = "#f7fbff" if light > 0.55 else "#d7e7f4"
            elif on_land and lat < -60:
                grid[(x, y)] = "#e7f6f2" if light > 0.55 else "#c5ddd4"
            elif on_land:
                if is_desert(lon, lat) and lat < 36:
                    grid[(x, y)] = "#e6c56a" if light > 0.55 else "#c4a24a"
                elif lat > 60:
                    grid[(x, y)] = "#e7f6e4" if light > 0.6 else "#b7d7a8"
                elif light > 0.62:
                    grid[(x, y)] = "#8ed36a"
                elif light > 0.38:
                    grid[(x, y)] = "#46b34a"
                else:
                    grid[(x, y)] = "#2f8a38"
            else:
                neighbor_land = any((x + ox, y + oy) in land_cells for ox, oy in ((CELL, 0), (-CELL, 0), (0, CELL), (0, -CELL)))
                if neighbor_land:
                    grid[(x, y)] = "#3d96d6" if light > 0.4 else "#2a78c0"
                elif light > 0.55:
                    grid[(x, y)] = "#2f7ed0"
                elif light > 0.3:
                    grid[(x, y)] = "#1a5aa8"
                else:
                    grid[(x, y)] = "#123f7c"

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
        radius = ((90 - lat) / 180) * RADIUS
        sx = CX + radius * math.cos(math.radians(lon))
        sy = CY - radius * math.sin(math.radians(lon))
        cell = (int(sx // CELL) * CELL, int(sy // CELL) * CELL)
        if grid.get(cell) not in WATER:
            continue
        for y in range(int(sy - 6), int(sy + 7), CELL):
            for x in range(int(sx - 6), int(sx + 7), CELL):
                if (x + CELL / 2 - sx) ** 2 + (y + CELL / 2 - sy) ** 2 > 16:
                    continue
                pad = (int(x // CELL) * CELL, int(y // CELL) * CELL)
                if grid.get(pad) in WATER:
                    grid[pad] = "#46b34a"

    for (x, y), color in list(grid.items()):
        if color not in LAND or color in ("#f7fbff", "#d7e7f4"):
            continue
        if any(grid.get((x + ox, y + oy)) in WATER for ox, oy in ((CELL, 0), (-CELL, 0), (0, CELL), (0, -CELL))):
            if color in ("#e6c56a", "#c4a24a"):
                grid[(x, y)] = "#a68432"
            else:
                grid[(x, y)] = "#1f6e30"

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
    for name, lon, lat in sites:
        radius = ((90 - lat) / 180) * RADIUS
        sx = CX + radius * math.cos(math.radians(lon))
        sy = CY - radius * math.sin(math.radians(lon))
        cell = (int(sx // CELL) * CELL, int(sy // CELL) * CELL)
        color = grid.get(cell, "OUT")
        print(f"{name:12} {color:8} land={color in LAND} shape={is_land(lon, lat)}")

    lines = [
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="512" height="512" shape-rendering="crispEdges">',
        "  <title>Earth (pixel art)</title>",
    ]
    for y in range(0, SIZE, CELL):
        row = sorted(x for (x, yy) in grid if yy == y)
        if not row:
            continue
        start = row[0]
        color = grid[(start, y)]
        width = CELL
        for x in row[1:]:
            next_color = grid[(x, y)]
            if next_color == color and x == start + width:
                width += CELL
                continue
            opacity = ' fill-opacity="0.45"' if color == "#7fd4ff" else ""
            lines.append(f'  <rect x="{start}" y="{y}" width="{width}" height="{CELL}" fill="{color}"{opacity}/>')
            start, color, width = x, next_color, CELL
        opacity = ' fill-opacity="0.45"' if color == "#7fd4ff" else ""
        lines.append(f'  <rect x="{start}" y="{y}" width="{width}" height="{CELL}" fill="{color}"{opacity}/>')
    lines.append("</svg>")
    out = Path(__file__).resolve().parents[1] / "src" / "assets" / "images" / "planets" / "earth.svg"
    out.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"wrote {out} ({out.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
