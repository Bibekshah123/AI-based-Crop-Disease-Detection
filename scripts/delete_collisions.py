"""
Delete EVERY copy of any image that appears in more than one class folder.
Cross-folder duplicate => at least one is mislabeled; on confusable disease pairs
a wrong label is very costly, so we drop all copies. Reproducible via re-download.
"""
import os, collections
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "field_data")
EXTS = (".jpg", ".jpeg", ".png", ".bmp", ".webp")


def ahash(path):
    try:
        im = Image.open(path).convert("L").resize((8, 8), Image.BILINEAR)
    except Exception:
        return None
    px = list(im.getdata()); avg = sum(px) / len(px)
    bits = 0
    for i, p in enumerate(px):
        if p >= avg:
            bits |= (1 << i)
    return bits


groups = collections.defaultdict(list)
for folder in sorted(os.listdir(ROOT)):
    fdir = os.path.join(ROOT, folder)
    if not os.path.isdir(fdir):
        continue
    for f in sorted(os.listdir(fdir)):
        if f.lower().endswith(EXTS):
            h = ahash(os.path.join(fdir, f))
            if h is not None:
                groups[h].append((folder, f))

deleted = 0
for h, locs in groups.items():
    if len({fo for fo, _ in locs}) > 1:      # spans >1 folder
        for fo, fi in locs:
            p = os.path.join(ROOT, fo, fi)
            if os.path.exists(p):
                os.remove(p); deleted += 1
                print(f"del {fo}/{fi}")

print(f"\ndeleted {deleted} cross-folder-collision files")
print("remaining total:", sum(
    len([x for x in os.listdir(os.path.join(ROOT, d)) if x.lower().endswith(EXTS)])
    for d in os.listdir(ROOT) if os.path.isdir(os.path.join(ROOT, d))))
