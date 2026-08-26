"""
Stage 1 cleaner for field_data/ — removes only OBJECTIVE junk (no label judgment):
  - corrupt / unreadable images
  - too-small images (min side < 224 px)  -> too low-res to help
  - duplicates within a folder (average-hash near-match) -> keep one, delete rest
Also REPORTS (does not delete) the same image appearing in two different class
folders, since at least one of those is mislabeled and needs a human to decide.

Deletes are logged to scripts/clean_field_report.txt so you can see exactly what went.
Usage: python scripts/clean_field_images.py
"""

import os
import collections
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "field_data")
MIN_SIDE = 224          # model input is 224; smaller than that is upscaled junk
HASH_SIZE = 8
DUP_DIST = 4            # hamming distance <= this => treat as duplicate
EXTS = (".jpg", ".jpeg", ".png", ".bmp", ".webp")


def ahash(path):
    """8x8 average hash as a 64-bit int; None if unreadable."""
    try:
        im = Image.open(path).convert("L").resize((HASH_SIZE, HASH_SIZE), Image.BILINEAR)
    except Exception:
        return None, None
    px = list(im.getdata())
    avg = sum(px) / len(px)
    bits = 0
    for i, p in enumerate(px):
        if p >= avg:
            bits |= (1 << i)
    return bits, im


def hamming(a, b):
    return bin(a ^ b).count("1")


def main():
    if not os.path.isdir(ROOT):
        print("no field_data/ found"); return

    report = []
    removed_corrupt = removed_small = removed_dup = 0
    global_hashes = collections.defaultdict(list)   # hash -> [(folder, file)]

    folders = sorted(d for d in os.listdir(ROOT) if os.path.isdir(os.path.join(ROOT, d)))
    for folder in folders:
        fdir = os.path.join(ROOT, folder)
        files = sorted(f for f in os.listdir(fdir) if f.lower().endswith(EXTS))
        kept_hashes = []   # (hash, file) kept so far in THIS folder
        start = len(files)

        for f in files:
            path = os.path.join(fdir, f)

            # 1) corrupt?
            try:
                with Image.open(path) as im:
                    im.verify()
            except Exception:
                os.remove(path); removed_corrupt += 1
                report.append(f"CORRUPT  {folder}/{f}")
                continue

            # 2) too small?
            try:
                with Image.open(path) as im:
                    w, h = im.size
            except Exception:
                os.remove(path); removed_corrupt += 1
                report.append(f"CORRUPT  {folder}/{f}")
                continue
            if min(w, h) < MIN_SIDE:
                os.remove(path); removed_small += 1
                report.append(f"SMALL    {folder}/{f}  ({w}x{h})")
                continue

            # 3) duplicate within folder?
            hv, _ = ahash(path)
            if hv is None:
                os.remove(path); removed_corrupt += 1
                report.append(f"CORRUPT  {folder}/{f}")
                continue
            dup_of = next((kf for kh, kf in kept_hashes if hamming(hv, kh) <= DUP_DIST), None)
            if dup_of is not None:
                os.remove(path); removed_dup += 1
                report.append(f"DUP      {folder}/{f}  (~= {dup_of})")
                continue

            kept_hashes.append((hv, f))
            global_hashes[hv].append((folder, f))

        end = len([x for x in os.listdir(fdir) if x.lower().endswith(EXTS)])
        print(f"{folder:34s} {start:3d} -> {end:3d}")

    # cross-folder collisions (mislabel signal) — report only
    cross = []
    seen = list(global_hashes.items())
    for i in range(len(seen)):
        h1, locs1 = seen[i]
        folders_here = {loc[0] for loc in locs1}
        if len(folders_here) > 1:
            cross.append((h1, locs1))
    if cross:
        report.append("\n=== SAME IMAGE IN DIFFERENT CLASS FOLDERS (review by hand) ===")
        for _, locs in cross:
            report.append("  " + "  |  ".join(f"{fo}/{fi}" for fo, fi in locs))

    report_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "clean_field_report.txt")
    with open(report_path, "w") as fh:
        fh.write("\n".join(report) + "\n")

    print("\n" + "=" * 46)
    print(f"corrupt removed : {removed_corrupt}")
    print(f"too-small removed: {removed_small}")
    print(f"dup removed     : {removed_dup}")
    print(f"cross-folder collisions flagged: {len(cross)} (NOT deleted)")
    print(f"remaining total : {sum(len([x for x in os.listdir(os.path.join(ROOT,d)) if x.lower().endswith(EXTS)]) for d in folders)}")
    print(f"full log -> {report_path}")


if __name__ == "__main__":
    main()
