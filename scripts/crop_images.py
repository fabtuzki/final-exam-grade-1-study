"""
Crop relevant sub-regions from exam-samples source images.
Output goes to public/images/ so Vite serves them at /images/*.
"""
from PIL import Image
import os

SRC  = os.path.join(os.path.dirname(__file__), '..', '..', 'exam-samples')
DEST = os.path.join(os.path.dirname(__file__), '..', 'public', 'images')
os.makedirs(DEST, exist_ok=True)

def crop(src_file, out_name, box):
    """box = (left, top, right, bottom)"""
    path = os.path.join(SRC, src_file)
    img  = Image.open(path)
    out  = img.crop(box)
    out_path = os.path.join(DEST, out_name)
    out.save(out_path, quality=88, optimize=True)
    print(f"  ✓ {out_name}  ({out.size[0]}×{out.size[1]})")

print("\n── Geometry: shape counting (geometry_2.jpg  1452×2040) ──")
crop('geometry_2.jpg', 'g2_tri_left.jpg',     (20,  110, 730,  640))
crop('geometry_2.jpg', 'g2_tri_right.jpg',    (730, 110, 1440, 640))
crop('geometry_2.jpg', 'g2_rect3col.jpg',     (20,  640, 730,  1060))
crop('geometry_2.jpg', 'g2_rect_overlap.jpg', (730, 640, 1440, 1130))
crop('geometry_2.jpg', 'g2_complex.jpg',      (730,1050, 1440, 1650))

print("\n── Geometry: 3-D objects (geometry_3.jpg  1270×1932) ──")
crop('geometry_3.jpg', 'g3_3d_objects.jpg',   (20,  60,  1250, 740))

print("\n── Geometry: cube count (geometry_3.jpg) ──")
crop('geometry_3.jpg', 'g3_cube_count.jpg',   (20,  900, 1250, 1940))

print("\n── Geometry: ruler + plant heights (geometry_4.jpg  1356×2187) ──")
crop('geometry_4.jpg', 'g4_ruler_scissors.jpg', (20,  380, 1340, 700))
crop('geometry_4.jpg', 'g4_ruler_eraser.jpg',   (680, 380, 1340, 700))
crop('geometry_4.jpg', 'g4_plants.jpg',          (20,  690, 1340, 1100))

print("\n── Geometry: clock faces (geometry_5.jpg  1351×1998) ──")
crop('geometry_5.jpg', 'g5_clocks.jpg',       (20, 1150, 1340, 1810))

print("\n── Geometry: spatial blocks + dice (geometry_7.jpg  1288×1918) ──")
crop('geometry_7.jpg', 'g7_blocks.jpg',       (20,   30, 1270,  630))
crop('geometry_7.jpg', 'g7_dice.jpg',         (760,  620, 1270, 1100))

print("\n── Geometry: animal row (geometry_8.jpg  1412×2138) ──")
crop('geometry_8.jpg', 'g8_animals.jpg',      (20,   30, 1400,  540))

print("\n── Advanced math: patterns/sequences (advanced_math_1.JPG  1332×2088) ──")
crop('advanced_math_1.JPG', 'am1_circles.jpg',    (20,   80, 1310,  650))
crop('advanced_math_1.JPG', 'am1_xcross.jpg',     (20,  640, 1310, 1060))
crop('advanced_math_1.JPG', 'am1_pyramid.jpg',    (20, 1040, 1310, 1360))
crop('advanced_math_1.JPG', 'am1_row66.jpg',      (20, 1340, 1310, 1590))
crop('advanced_math_1.JPG', 'am1_row79.jpg',      (20, 1570, 1310, 1820))

print("\n── Advanced math: cross sequence + bead necklace (advanced_math_3.jpg  1903×2711) ──")
crop('advanced_math_3.jpg', 'am3_sequences.jpg',      (20,   30, 1890, 820))
crop('advanced_math_3.jpg', 'am3_cross_sequence.jpg', (20,  820, 1890, 1380))
crop('advanced_math_3.jpg', 'am3_bead_necklace.jpg',  (20, 1360, 1890, 1640))

print("\n── Advanced math: symbol substitution (advanced_math_4.JPG  1868×3264) ──")
crop('advanced_math_4.JPG', 'am4_santa.jpg',      (20,   60, 1850,  820))
crop('advanced_math_4.JPG', 'am4_vegetables.jpg', (20,  800, 1850, 1600))
crop('advanced_math_4.JPG', 'am4_fruits.jpg',     (20, 1580, 1850, 2320))

print("\n── Advanced math: shape equations + balance (advanced_math_5.JPG  1948×2868) ──")
crop('advanced_math_5.JPG', 'am5_shapes_eq.jpg',  (20,  250, 1930, 1130))
crop('advanced_math_5.JPG', 'am5_balance.jpg',    (20, 1800, 1930, 2480))

print("\n── Advanced math: planting trees / intervals (advanced_math_6.JPG  1916×3024) ──")
crop('advanced_math_6.JPG', 'am6_hallway.jpg',        (20,   30, 1900,  470))
crop('advanced_math_6.JPG', 'am6_triangle_beads.jpg', (20,  440, 1900, 1030))
crop('advanced_math_6.JPG', 'am6_staircase.jpg',      (20, 1000, 1900, 1580))
crop('advanced_math_6.JPG', 'am6_handkerchief.jpg',   (20, 1540, 1900, 2100))
crop('advanced_math_6.JPG', 'am6_clothespins.jpg',    (20, 2060, 1900, 2620))

print(f"\nDone. Images saved to {os.path.abspath(DEST)}\n")
