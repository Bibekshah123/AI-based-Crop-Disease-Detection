"""
Targeted re-download for thin/broken classes using disease-specific queries
(Latin pathogen names to avoid wrong-disease results). Appends into the existing
field_data/<class>/ folders without overwriting. Run clean_field_images.py +
delete_collisions.py + a visual review again afterward.

Usage: python scripts/redownload_thin.py
"""
import os, logging
from icrawler.builtin import BingImageCrawler

TARGET = 60  # raw target per class (survives to ~30-40 after cleaning/review)
ROOT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "field_data")
EXTS = (".jpg", ".jpeg", ".png", ".bmp", ".webp")

# Each class gets several specific queries; pathogen names steer away from lookalikes.
QUERIES = {
    "Apple__Black_Rot": [
        "apple frogeye leaf spot black rot Botryosphaeria",
        "apple black rot leaf lesion tree"],
    "Banana__Bract_Mosaic_Virus": [
        "banana bract mosaic virus infected leaf symptom",
        "banana bract mosaic disease plant streak"],
    "Banana__Moko": [
        "banana moko disease wilting plant field",
        "banana bacterial wilt Ralstonia yellowing leaves plant"],
    "Banana__Panama": [
        "banana panama disease fusarium wilt yellow leaves plant",
        "banana fusarium wilt skirt dead leaves field"],
    "Citrus__Greening": [
        "citrus greening HLB blotchy mottle leaf",
        "huanglongbing citrus asymmetric yellow leaf"],
    "Grape__Black_Measles": [
        "grapevine esca black measles tiger stripe leaf",
        "grape esca leaf interveinal necrosis"],
    "Mango__Bacterial_Canker": [
        "mango bacterial black spot leaf Xanthomonas",
        "mango bacterial canker leaf angular lesion"],
    "Mango__Die_Back": [
        "mango dieback leaf drying blight twig",
        "mango dieback disease leaf necrosis symptom"],
    "Potato__Early_Blight": [
        "potato early blight Alternaria target ring leaf",
        "potato early blight leaf lesion field"],
    "Rice__Bacterial_Leaf_Blight": [
        "rice bacterial leaf blight Xanthomonas leaf margin lesion field",
        "rice bacterial blight kresek yellowing leaf tip"],
    "Rice__Brown_Spot": [
        "rice brown spot Bipolaris oryzae leaf lesion",
        "rice brown spot disease oval lesion leaf"],
    "Rice__Leaf_Blast": [
        "rice leaf blast Magnaporthe spindle diamond lesion leaf",
        "rice blast disease grey center leaf lesion"],
    "Rice__Leaf_Scald": [
        "rice leaf scald Microdochium zonate lesion leaf",
        "rice leaf scald disease banded lesion tip"],
    "Rice__Leaf_smut": [
        "rice leaf smut Entyloma oryzae black angular spots leaf",
        "rice leaf smut small black sori on leaf blade"],
    "Rice__Narrow_Brown_Spot": [
        "rice narrow brown leaf spot Cercospora janseana",
        "rice narrow brown spot linear lesion leaf blade"],
    "Tomato__Bacterial_Spot": [
        "tomato bacterial spot Xanthomonas leaf lesion",
        "tomato bacterial leaf spot dark water soaked"],
    "Tomato__Early_blight": [
        "tomato early blight Alternaria target ring leaf",
        "tomato early blight leaf concentric lesion"],
}


def count(d):
    return len([f for f in os.listdir(d) if f.lower().endswith(EXTS)])


def main():
    for cls, queries in QUERIES.items():
        out_dir = os.path.join(ROOT, cls)
        os.makedirs(out_dir, exist_ok=True)
        have = count(out_dir)
        print(f"\n=== {cls} (have {have}, target {TARGET}) ===")
        for q in queries:
            if count(out_dir) >= TARGET:
                break
            need = TARGET - count(out_dir)
            print(f"  '{q}'  (need {need})")
            crawler = BingImageCrawler(
                downloader_threads=4,
                storage={"root_dir": out_dir},
                log_level=logging.ERROR,
            )
            try:
                crawler.crawl(
                    keyword=q,
                    max_num=int(need * 1.8) + 8,
                    min_size=(224, 224),
                    file_idx_offset=count(out_dir),
                )
            except Exception as e:
                print(f"    [err] {e}")
        print(f"  -> now {count(out_dir)}")
    print("\nDONE. Next: clean_field_images.py, delete_collisions.py, then re-review.")


if __name__ == "__main__":
    main()
