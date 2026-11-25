# Contact sheets for zoomframes.mjs and dayframes.mjs, each frame labelled with its time from the tap or the back.
#   python scripts/qa/zoomsheet.py <out folder>   -> <out>/sheet-*.jpg
import json, os, sys
from PIL import Image, ImageDraw

d = sys.argv[1]
report = json.load(open(os.path.join(d, "frames.json"), encoding="utf-8"))

def sheet(items, cols, tw, name):
    ims = [(Image.open(os.path.join(d, f)).convert("RGB"), label) for f, label in items if os.path.exists(os.path.join(d, f))]
    if not ims:
        return None
    th = int(ims[0][0].height * tw / ims[0][0].width)
    rows = (len(ims) + cols - 1) // cols
    s = Image.new("RGB", (8 + cols * (tw + 8), 8 + rows * (th + 26)), (20, 20, 26))
    dr = ImageDraw.Draw(s)
    for i, (im, label) in enumerate(ims):
        x, y = 8 + (i % cols) * (tw + 8), 8 + (i // cols) * (th + 26)
        dr.text((x + 2, y + 3), label, fill=(235, 235, 235))
        s.paste(im.resize((tw, th), Image.LANCZOS), (x, y + 18))
    s.save(os.path.join(d, name), quality=86)
    return name

made = []
# zoomframes.mjs: a dive and a back for each view
for view, r in report.get("views", {}).items():
    if "dive" not in r:
        continue
    cols, tw = (6, 196) if view == "phone" else (3, 480)
    dive = [(f"{view}-before.jpg", "before the tap")] + [(x["f"], f"dive +{x['t']} ms") for x in r["dive"]] + [(f"{view}-arrived.jpg", "arrived, at rest")]
    back = [(x["f"], f"back +{x['t']} ms") for x in r["back"]] + [(f"{view}-rest.jpg", "back, at rest")]
    made += [sheet(dive, cols, tw, f"sheet-{view}-dive.jpg"), sheet(back, cols, tw, f"sheet-{view}-back.jpg")]
# dayframes.mjs: one day opening and closing
f = report.get("frames")
if f:
    items = [("dz-before.jpg", "before")] + [(x["f"], f"open +{x['t']} ms") for x in f["open"]] + [("dz-opened.jpg", "open, at rest")] \
          + [(x["f"], f"close +{x['t']} ms") for x in f["close"]] + [("dz-closed.jpg", "closed, at rest")]
    made.append(sheet(items, 6, 196, "sheet-day.jpg"))
print(" ".join(m for m in made if m))
