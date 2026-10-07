# usage: python crop.py in.png out.png x0 y0 x1 y1 [zoom]   (coordinates in native canvas pixels; the png is saved at 3x)
import sys
from PIL import Image
src, dst, x0, y0, x1, y1 = sys.argv[1], sys.argv[2], *map(int, sys.argv[3:7])
z = int(sys.argv[7]) if len(sys.argv) > 7 else 2
im = Image.open(src)
S = 3
c = im.crop((x0 * S, y0 * S, x1 * S, y1 * S)).resize(((x1 - x0) * S * z, (y1 - y0) * S * z), Image.NEAREST)
c.save(dst)
