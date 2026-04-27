"""
Crop individual vocabulary cells from worksheet JPG scans.
Calibrated coordinates verified against actual crops.

Sources:
  english-exam-materials/vocabulary_1.JPG  -> 24 cells (clothing, senses, house, food)
  english-exam-materials/vocabulary_2.JPG  -> 27 cells (tch/ea/ay/oo/y/oa/er words)

Output: muoi-exam-app/public/images/en_<word>.jpg
"""

from PIL import Image
from pathlib import Path

SRC_DIR = Path(__file__).parent.parent.parent / "english-exam-materials"
OUT_DIR = Path(__file__).parent.parent / "public" / "images"
OUT_DIR.mkdir(parents=True, exist_ok=True)


def crop_and_save(img, x1, y1, x2, y2, name):
    cell = img.crop((x1, y1, x2, y2))
    out = OUT_DIR / f"en_{name}.jpg"
    cell.save(out, quality=92)
    print(f"  saved: {out.name}  ({x2-x1}x{y2-y1}px)")


# ── vocabulary_1.JPG ──────────────────────────────────────────────────────────
# Size: 1924 x 3264
# Label column: 0-212px  |  6 cells each 285px wide
# Rows identified from y-marker calibration image

print("Processing vocabulary_1.JPG ...")
img1 = Image.open(SRC_DIR / "vocabulary_1.JPG")

X1 = [212, 497, 782, 1067, 1352, 1637, 1922]   # 7 x-boundaries -> 6 cells

ROWS_V1 = [
    # (y_top, y_bottom, [word_col0, word_col1, ..., word_col5])
    (1300, 1680, ["jacket",  "skirt",   "tshirt", "pants",  "shorts",  "sandals"]),
    (1680, 2060, ["smell",   "sound",   "taste",  "feel",   "look",    "senses"]),
    (2180, 2520, ["floor",   "ceiling", "light",  "door",   "window",  "sink"]),
    (2520, 2860, ["fruit",   "rice",    "pasta",  "milk",   "meat",    "vegetables"]),
]

for y1, y2, words in ROWS_V1:
    for col, word in enumerate(words):
        crop_and_save(img1, X1[col], y1, X1[col + 1], y2, word)


# ── vocabulary_2.JPG ──────────────────────────────────────────────────────────
# Size: 1912 x 3264
# Label column: 0-266px  |  4 cells each 411px wide
# Rows identified from y-marker calibration image

print("\nProcessing vocabulary_2.JPG ...")
img2 = Image.open(SRC_DIR / "vocabulary_2.JPG")

X2 = [266, 677, 1088, 1499, 1910]   # 5 x-boundaries -> 4 cells

ROWS_V2 = [
    # tch has only 3 words; None = empty cell, skip
    ( 580,  850, ["stretch", "catch",   "kitchen", None]),
    ( 850, 1200, ["peaches", "meat_ea", "beans",   "peas"]),
    (1200, 1540, ["way",     "gray",    "play",    "say"]),
    (1540, 1860, ["school",  "pool",    "cool",    "zoo"]),
    (1860, 2180, ["dry",     "sky",     "fly",     "my"]),
    (2180, 2520, ["goat",    "foal",    "toad",    "boat"]),
    (2520, 2850, ["teacher", "singer",  "doctor",  "actor"]),
]

for y1, y2, words in ROWS_V2:
    for col, word in enumerate(words):
        if word is None:
            continue
        crop_and_save(img2, X2[col], y1, X2[col + 1], y2, word)

print(f"\nDone. All images saved to: {OUT_DIR}")
