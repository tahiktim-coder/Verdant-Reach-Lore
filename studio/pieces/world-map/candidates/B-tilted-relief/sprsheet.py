# usage: python sprsheet.py <shots dir>   (needs places.json and frame_2.00s.png in it; writes sprites.png: every place at 6x)
import json, sys
from PIL import Image
d=sys.argv[1]
P=json.load(open(d+'/places.json'))
im=Image.open(d+'/frame_2.00s.png')
keys=['castle_order','castle_1','castle_2','castle_3','castle_4','castle_5','castle_6','castle_7','castle_8','eastern_city','colossal_spires','stone_hands','windmill_n','standing_stone_1','clockwork_tower_1','clockwork_tower_2','clockwork_tower_3','cavern_of_giants','buried_machine','artifact_isles','starbloom_fields','crystal_grove_w','storm_valley_w','storm_valley_e','fire_dragon_peaks']
cell=40; Z=6; cols=5; rows=(len(keys)+cols-1)//cols
sheet=Image.new('RGB',(cols*cell*Z, rows*cell*Z),(0,0,0))
for n,k in enumerate(keys):
    r=P[k]; cx=(r['x0']+r['x1'])//2; cy=(r['y0']+r['y1'])//2
    x0=max(0,min(im.width//3-cell,cx-cell//2)); y0=max(0,min(im.height//3-cell,cy-cell//2))
    c=im.crop((x0*3,y0*3,(x0+cell)*3,(y0+cell)*3)).resize((cell*Z,cell*Z),Image.NEAREST)
    sheet.paste(c,((n%cols)*cell*Z,(n//cols)*cell*Z))
sheet.save(d+'/sprites.png')
