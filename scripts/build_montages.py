"""
Build one labeled contact-sheet PNG per class folder so images can be reviewed
visually. Each tile is numbered; a sidecar JSON maps folder -> [filenames in tile order]
so a reviewer can say "delete tiles 3,7,12" and we map back to real files.
Output: <out>/montages/<folder>.png  and  <out>/montage_index.json
"""
import os, json, math
from PIL import Image, ImageDraw

ROOT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "field_data")
OUT = os.environ.get("MONT_OUT")
EXTS = (".jpg", ".jpeg", ".png", ".bmp", ".webp")
TILE = 200
COLS = 8
PAD = 4
LABEL_H = 16

os.makedirs(os.path.join(OUT, "montages"), exist_ok=True)
index = {}

for folder in sorted(os.listdir(ROOT)):
    fdir = os.path.join(ROOT, folder)
    if not os.path.isdir(fdir):
        continue
    files = sorted(f for f in os.listdir(fdir) if f.lower().endswith(EXTS))
    index[folder] = files
    if not files:
        continue
    rows = math.ceil(len(files) / COLS)
    cell_w = TILE + PAD
    cell_h = TILE + LABEL_H + PAD
    sheet = Image.new("RGB", (COLS * cell_w + PAD, rows * cell_h + PAD), (30, 30, 30))
    draw = ImageDraw.Draw(sheet)
    for i, f in enumerate(files):
        r, c = divmod(i, COLS)
        x = PAD + c * cell_w
        y = PAD + r * cell_h
        # index label
        draw.text((x + 2, y + 2), str(i), fill=(255, 255, 0))
        try:
            im = Image.open(os.path.join(fdir, f)).convert("RGB")
            im.thumbnail((TILE, TILE))
            tx = x + (TILE - im.width) // 2
            ty = y + LABEL_H + (TILE - im.height) // 2
            sheet.paste(im, (tx, ty))
        except Exception:
            draw.text((x + 20, y + LABEL_H + 80), "ERR", fill=(255, 0, 0))
    sheet.save(os.path.join(OUT, "montages", f"{folder}.png"))
    print(f"{folder:34s} {len(files):3d} tiles")

with open(os.path.join(OUT, "montage_index.json"), "w") as fh:
    json.dump(index, fh, indent=1)
print("\nmontages ->", os.path.join(OUT, "montages"))
