"""
Download ~50 real field images per class into field_data/<ClassName>/ using Bing image search.

WARNING: search results are a MIX. Some images will be lab shots, diagrams, wrong
diseases, or mislabeled. You MUST review each folder and delete junk before training.
A wrong label hurts the model more than a missing image.

Usage:
    python scripts/download_field_images.py            # all classes
    python scripts/download_field_images.py Rice__Brown_Spot Mango__Anthracnose
"""

import os
import sys
import logging
from icrawler.builtin import BingImageCrawler

TARGET_PER_CLASS = 50
OUT_ROOT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "field_data")

# Search queries tuned to surface real field/leaf photos (not lab plates or diagrams).
QUERIES = {
    "Apple__Black_Rot": "apple black rot leaf symptom",
    "Apple__Cedar_Rust": "apple cedar apple rust leaf",
    "Apple__Healthy": "healthy apple tree leaf",
    "Apple__Scab": "apple scab leaf disease",
    "Banana__Black_Sigatoka": "banana black sigatoka leaf disease",
    "Banana__Bract_Mosaic_Virus": "banana bract mosaic virus plant",
    "Banana__Healthy": "healthy banana plant leaf",
    "Banana__Insect_Pest": "banana leaf insect pest damage",
    "Banana__Moko": "banana moko bacterial wilt disease",
    "Banana__Panama": "banana panama disease fusarium wilt plant",
    "Banana__Yellow_Sigatoka": "banana yellow sigatoka leaf disease",
    "Citrus__Canker": "citrus canker leaf lesion",
    "Citrus__Greening": "citrus greening huanglongbing leaf",
    "Citrus__Healthy": "healthy citrus orange leaf tree",
    "Cucumber__Downy_Mildew": "cucumber downy mildew leaf",
    "Cucumber__Healthy": "healthy cucumber plant leaf",
    "Cucumber__Powdery_Mildew": "cucumber powdery mildew leaf",
    "Grape__Black_Measles": "grape esca black measles leaf",
    "Grape__Black_Rot": "grape black rot leaf",
    "Grape__Healthy": "healthy grape vine leaf",
    "Grape__Leaf_Blight": "grape isariopsis leaf blight",
    "Maize__Common_rust": "corn maize common rust leaf field",
    "Maize__Healthy": "healthy corn maize leaf field",
    "Maize__Northern_Leaf_Blight": "corn northern leaf blight field",
    "Mango__Anthracnose": "mango anthracnose leaf disease",
    "Mango__Bacterial_Canker": "mango bacterial canker leaf black spot",
    "Mango__Cutting_Weevil": "mango leaf cutting weevil damage",
    "Mango__Die_Back": "mango dieback disease branch leaf",
    "Mango__Gall_Midge": "mango gall midge leaf",
    "Mango__Healthy": "healthy mango tree leaf",
    "Mango__Powdery_Mildew": "mango powdery mildew leaf",
    "Mango__Sooty_Mould": "mango sooty mould leaf black",
    "Potato__Early_Blight": "potato early blight leaf field",
    "Potato__Healthy": "healthy potato plant leaf field",
    "Potato__Late_Blight": "potato late blight leaf field",
    "Rice__Bacterial_Leaf_Blight": "rice bacterial leaf blight field",
    "Rice__Brown_Spot": "rice brown spot leaf disease",
    "Rice__Leaf_Blast": "rice leaf blast disease field",
    "Rice__Leaf_Scald": "rice leaf scald disease",
    "Rice__Leaf_smut": "rice leaf smut disease",
    "Rice__Narrow_Brown_Spot": "rice narrow brown leaf spot",
    "Tomato__Bacterial_Spot": "tomato bacterial spot leaf",
    "Tomato__Early_blight": "tomato early blight leaf",
    "Tomato__Healthy": "healthy tomato plant leaf",
    "Tomato__Late_blight": "tomato late blight leaf field",
    "Tomato__Leaf_Mold": "tomato leaf mold disease",
    "Tomato__Mosaic_Virus": "tomato mosaic virus leaf",
    "Tomato__Septoria_Leaf_Spot": "tomato septoria leaf spot",
    "Tomato__Spider_Mites": "tomato spider mites leaf damage two spotted",
    "Tomato__Target_Spot": "tomato target spot leaf",
    "Tomato__Yellow_Leaf_Curl_Virus": "tomato yellow leaf curl virus leaf",
}


def download_class(cls, query):
    out_dir = os.path.join(OUT_ROOT, cls)
    os.makedirs(out_dir, exist_ok=True)
    existing = len([f for f in os.listdir(out_dir)
                    if f.lower().endswith((".jpg", ".jpeg", ".png"))])
    if existing >= TARGET_PER_CLASS:
        print(f"[skip] {cls:32s} already has {existing} images")
        return
    need = TARGET_PER_CLASS - existing
    print(f"[get ] {cls:32s} '{query}'  (need {need})")
    crawler = BingImageCrawler(
        downloader_threads=4,
        storage={"root_dir": out_dir},
        log_level=logging.ERROR,
    )
    # over-request: many results fail to download or are tiny
    crawler.crawl(
        keyword=query,
        max_num=int(need * 1.6) + 10,
        min_size=(200, 200),
        file_idx_offset=existing,
    )
    got = len([f for f in os.listdir(out_dir)
               if f.lower().endswith((".jpg", ".jpeg", ".png"))])
    print(f"       -> {got} images now in {cls}")


def main():
    which = sys.argv[1:]
    classes = which if which else list(QUERIES.keys())
    os.makedirs(OUT_ROOT, exist_ok=True)
    print(f"Downloading into: {OUT_ROOT}")
    print(f"Classes: {len(classes)}   target: {TARGET_PER_CLASS}/class\n")
    for cls in classes:
        if cls not in QUERIES:
            print(f"[warn] no query for '{cls}', skipping")
            continue
        try:
            download_class(cls, QUERIES[cls])
        except Exception as e:
            print(f"[err ] {cls}: {e}")
    print("\nDone. IMPORTANT: review every folder and delete wrong/lab/diagram images.")


if __name__ == "__main__":
    main()
