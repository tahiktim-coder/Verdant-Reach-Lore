# crop a region of a rendered frame (native canvas px) and upscale it for a close look
# python tools/crop.py in.png out.png x0 y0 x1 y1 [zoom=6] [srcscale=3]
import sys
from PIL import Image
src, out = sys.argv[1], sys.argv[2]
x0, y0, x1, y1 = [int(a) for a in sys.argv[3:7]]
zoom = int(sys.argv[7]) if len(sys.argv) > 7 else 6
ss = int(sys.argv[8]) if len(sys.argv) > 8 else 3
im = Image.open(src).convert('RGB')
im = im.resize((im.width // ss, im.height // ss), Image.NEAREST)
c = im.crop((x0, y0, x1, y1)).resize(((x1 - x0) * zoom, (y1 - y0) * zoom), Image.NEAREST)
c.save(out)
print('wrote', out, c.size)
