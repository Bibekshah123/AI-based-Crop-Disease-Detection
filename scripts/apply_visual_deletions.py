"""
Apply the visual-review deletions. Maps each flagged tile index back to its real
filename via montage_index.json, then deletes it from field_data/<class>/.
Out-of-range indices are skipped safely. Prints before/after counts per folder.
"""
import os, json

SCRATCH = os.environ["SCRATCH"]
ROOT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "field_data")
EXTS = (".jpg", ".jpeg", ".png", ".bmp", ".webp")

with open(os.path.join(SCRATCH, "montage_index.json")) as f:
    index = json.load(f)
with open(os.path.join(SCRATCH, "visual_deletions.json")) as f:
    dels = json.load(f)

total_deleted = 0
summary = []
for folder, idxs in dels.items():
    files = index.get(folder, [])
    before = len([x for x in os.listdir(os.path.join(ROOT, folder)) if x.lower().endswith(EXTS)]) \
        if os.path.isdir(os.path.join(ROOT, folder)) else 0
    n = 0
    for i in idxs:
        if 0 <= i < len(files):
            p = os.path.join(ROOT, folder, files[i])
            if os.path.exists(p):
                os.remove(p); n += 1
    total_deleted += n
    after = len([x for x in os.listdir(os.path.join(ROOT, folder)) if x.lower().endswith(EXTS)]) \
        if os.path.isdir(os.path.join(ROOT, folder)) else 0
    summary.append((folder, before, after))

print(f"total deleted: {total_deleted}\n")
print(f"{'class':34s} {'before':>6} {'after':>6}")
for folder, b, a in summary:
    flag = "  <-- THIN" if a < 20 else ""
    print(f"{folder:34s} {b:6d} {a:6d}{flag}")

grand = sum(a for _, _, a in summary)
print(f"\nfield_data total now: {grand}")
