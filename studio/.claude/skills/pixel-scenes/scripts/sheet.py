# Contact sheet: python3 scripts/sheet.py out.png shots/*.png  (needs Pillow)
import sys
from PIL import Image
out, files = sys.argv[1], sys.argv[2:]
ims = [Image.open(f).convert('RGB') for f in files]
cols = min(3, len(ims)); rows = (len(ims) + cols - 1) // cols
w, h = max(i.width for i in ims), max(i.height for i in ims)
sheet = Image.new('RGB', (cols * (w + 8), rows * (h + 8)), (0, 0, 0))
for k, im in enumerate(ims): sheet.paste(im, ((k % cols) * (w + 8), (k // cols) * (h + 8)))
sheet.save(out); print('wrote', out, sheet.size)
