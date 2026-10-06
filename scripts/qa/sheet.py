# Contact sheets: for each route, desktop frames in a grid (3 across) and phone frames (6 across).
import sys, glob, os, re
from PIL import Image
d = sys.argv[1]; out = sys.argv[2]; os.makedirs(out, exist_ok=True)
names = sorted({re.sub(r"^[dm]_|_\d\d\.jpg$", "", os.path.basename(f)) for f in glob.glob(d + "/*.jpg")})
for n in names:
    for tag, cols, tw in (("d", 3, 520), ("m", 6, 250)):
        fs = sorted(glob.glob(f"{d}/{tag}_{n}_[0-9][0-9].jpg"))
        if not fs: continue
        ims = [Image.open(f) for f in fs]
        th = int(ims[0].height * tw / ims[0].width)
        rows = (len(ims) + cols - 1) // cols
        sheet = Image.new("RGB", (cols * (tw + 6), rows * (th + 6)), (40, 40, 40))
        for i, im in enumerate(ims):
            sheet.paste(im.resize((tw, th), Image.LANCZOS), ((i % cols) * (tw + 6), (i // cols) * (th + 6)))
        sheet.save(f"{out}/{tag}_{n}.jpg", quality=80)
print(len(names), "routes")
