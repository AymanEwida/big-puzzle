"""Cut an image into jigsaw-shaped pieces and pack them into one atlas.

Atlas layout: piece id = row * COLS + col sits in cell (col*CELL, row*CELL).
Each cell is CELL x CELL with the 32x32 body at offset (MARGIN, MARGIN);
tabs stick out into the margin, everything outside the shape is transparent.
"""
import json
import random
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

Image.MAX_IMAGE_PIXELS = None

SRC, OUT_DIR = sys.argv[1], sys.argv[2]
COLS, ROWS = 271, 221
P = 32            # body size
MARGIN = 8        # room for tabs
CELL = P + 2 * MARGIN
SS = 4            # supersampling for smooth edges
SEED = 2026
rng = random.Random(SEED)


def cubic(p0, p1, p2, p3, n=10):
    pts = []
    for i in range(1, n + 1):
        t = i / n
        mt = 1 - t
        pts.append((
            mt**3 * p0[0] + 3 * mt * mt * t * p1[0] + 3 * mt * t * t * p2[0] + t**3 * p3[0],
            mt**3 * p0[1] + 3 * mt * mt * t * p1[1] + 3 * mt * t * t * p2[1] + t**3 * p3[1],
        ))
    return pts


def tab_profile(center, height, width):
    """Classic knob in edge-local (u along edge 0..1, v = out-of-edge, >0 is the tab)."""
    c, h, w = center, height, width
    segs = [
        ((c - 0.16 * w, 0), (c - 0.10 * w, 0), (c - 0.07 * w, 0.18 * h), (c - 0.12 * w, 0.40 * h)),
        ((c - 0.12 * w, 0.40 * h), (c - 0.20 * w, 0.75 * h), (c - 0.10 * w, 1.00 * h), (c, 1.00 * h)),
        ((c, 1.00 * h), (c + 0.10 * w, 1.00 * h), (c + 0.20 * w, 0.75 * h), (c + 0.12 * w, 0.40 * h)),
        ((c + 0.12 * w, 0.40 * h), (c + 0.07 * w, 0.18 * h), (c + 0.10 * w, 0), (c + 0.16 * w, 0)),
    ]
    pts = [(0.0, 0.0), segs[0][0]]
    for s in segs:
        pts += cubic(*s)
    pts.append((1.0, 0.0))
    return pts


def make_edge(a, b, sign):
    """Absolute polyline from a to b; sign=+1 bulges toward +normal, -1 the other way."""
    center = 0.5 + rng.uniform(-0.05, 0.05)
    height = rng.uniform(0.85, 0.95) * MARGIN / P   # knob height in edge units (<= ~7.6px)
    width = rng.uniform(1.05, 1.20)                  # head is ~0.4*width of the edge
    dx, dy = (b[0] - a[0]) / P, (b[1] - a[1]) / P    # unit direction
    nx, ny = -dy, dx   # +normal: for a left->right edge this points down (+y)
    out = []
    for u, v in tab_profile(center, height, width):
        u, v = u * P, v * P
        out.append((a[0] + u * dx + sign * v * nx, a[1] + u * dy + sign * v * ny))
    return out


# --- edge layout --------------------------------------------------------------
# hsign[r][c]: horizontal edge under row r (between r and r+1), +1 = knob points down
# vsign[r][c]: vertical edge right of col c (between c and c+1), +1 = knob points right
hsign = [[rng.choice((1, -1)) for _ in range(COLS)] for _ in range(ROWS - 1)]
vsign = [[rng.choice((1, -1)) for _ in range(COLS - 1)] for _ in range(ROWS)]

# precompute absolute polylines (canonical direction: left->right / top->bottom)
hedge = [[make_edge((c * P, (r + 1) * P), ((c + 1) * P, (r + 1) * P), hsign[r][c])
          for c in range(COLS)] for r in range(ROWS - 1)]
# for a vertical edge going top->bottom the +normal points to -x, so flip the sign
vedge = [[make_edge(((c + 1) * P, r * P), ((c + 1) * P, (r + 1) * P), -vsign[r][c])
          for c in range(COLS - 1)] for r in range(ROWS)]


def outline(r, c):
    x0, y0, x1, y1 = c * P, r * P, (c + 1) * P, (r + 1) * P
    pts = []
    pts += hedge[r - 1][c] if r > 0 else [(x0, y0), (x1, y0)]                 # top  L->R
    pts += vedge[r][c] if c < COLS - 1 else [(x1, y0), (x1, y1)]              # right T->B
    pts += hedge[r][c][::-1] if r < ROWS - 1 else [(x1, y1), (x0, y1)]        # bottom R->L
    pts += vedge[r][c - 1][::-1] if c > 0 else [(x0, y1), (x0, y0)]           # left B->T
    return pts


# --- image --------------------------------------------------------------------
img = Image.open(SRC).convert("RGB").resize((COLS * P, ROWS * P), Image.LANCZOS)
padded = Image.new("RGB", (COLS * P + 2 * MARGIN, ROWS * P + 2 * MARGIN))
padded.paste(img, (MARGIN, MARGIN))
padded_np = np.asarray(padded)

atlas = Image.new("RGBA", (COLS * CELL, ROWS * CELL), (0, 0, 0, 0))

for r in range(int(__import__("os").environ.get("ROWS_LIMIT", ROWS))):
    # 1) alpha mask for the whole row strip, supersampled
    mask_ss = Image.new("L", (COLS * CELL * SS, CELL * SS), 0)
    d = ImageDraw.Draw(mask_ss)
    for c in range(COLS):
        ox, oy = c * CELL + MARGIN - c * P, MARGIN - r * P   # world -> strip coords
        d.polygon([((x + ox) * SS, (y + oy) * SS) for x, y in outline(r, c)], fill=255)
    mask = mask_ss.resize((COLS * CELL, CELL), Image.LANCZOS)
    a = np.asarray(mask).astype(np.float32) / 255.0

    # 2) colour strip: each cell gets the 48x48 image area around its piece
    rgb = np.zeros((CELL, COLS * CELL, 3), np.float32)
    for c in range(COLS):
        rgb[:, c * CELL:(c + 1) * CELL] = padded_np[r * P:r * P + CELL, c * P:c * P + CELL]

    # 3) bevel: light on top-left edges, shade on bottom-right, thin dark outline
    soft = np.asarray(mask.filter(ImageFilter.GaussianBlur(float(__import__("os").environ.get("BLUR", "2.0"))))).astype(np.float32) / 255.0
    gy, gx = np.gradient(soft)
    light = np.clip(gx + gy, 0, None) * 3.0      # alpha rising toward bottom-right => top-left rim
    shade = np.clip(-(gx + gy), 0, None) * 3.0
    edge = np.clip(1.0 - np.abs(soft - 0.5) * 4.0, 0, 1) * a
    BEV = float(__import__('os').environ.get('BEVEL', '0.75'))
    rgb = rgb + BEV * 255 * 0.55 * light[..., None] - BEV * 255 * 0.55 * shade[..., None]
    rgb = rgb * (1 - BEV * 0.25 * edge[..., None])
    rgb[a <= 0.0] = 0   # fully transparent pixels: black compresses far better
    rgba = np.dstack([np.clip(rgb, 0, 255), a * 255]).astype(np.uint8)
    atlas.paste(Image.fromarray(rgba, "RGBA"), (0, r * CELL))
    if r % 20 == 0:
        print("row", r, flush=True)

atlas.save(f"{OUT_DIR}/puzzle_atlas.png", compress_level=1)

meta = {
    "image": "puzzle_atlas.webp",
    "cols": COLS, "rows": ROWS, "pieceCount": COLS * ROWS,
    "pieceSize": P, "margin": MARGIN, "cellSize": CELL,
    "width": COLS * CELL, "height": ROWS * CELL, "seed": SEED,
    "indexing": "sx = (id % cols) * cellSize; sy = floor(id / cols) * cellSize; "
                "draw at (pieceX - margin, pieceY - margin) with size cellSize",
    # edge layout, one char per edge: '+' knob points down/right, '-' up/left
    "hEdges": ["".join("+" if s > 0 else "-" for s in row) for row in hsign],
    "vEdges": ["".join("+" if s > 0 else "-" for s in row) for row in vsign],
}
with open(f"{OUT_DIR}/puzzle_atlas.json", "w") as f:
    json.dump(meta, f)
print("done")
