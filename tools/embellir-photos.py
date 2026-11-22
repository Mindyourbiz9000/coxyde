import sys, numpy as np
from PIL import Image, ImageOps, ImageEnhance, ImageFilter
src, out = sys.argv[1], sys.argv[2]
names = {"1": "garage.jpg", "2": "salle-de-douche.jpg", "3": "chambre-enfants.jpg",
         "4": "chambre-lits-jumeaux.jpg", "5": "chambre-lit-double.jpg"}
wb = {"1": 0.6, "2": 0.6, "3": 0.55, "4": 0.8, "5": 0.75}
target = {"1": 0.50, "2": 0.62, "3": 0.58, "4": 0.58, "5": 0.60}

def lum(a):
    return a[..., 0] * .2126 + a[..., 1] * .7152 + a[..., 2] * .0722

for k, n in names.items():
    im = ImageOps.exif_transpose(Image.open(f"{src}/{k}.jpg")).convert("RGB")
    im.thumbnail((1600, 1600), Image.LANCZOS)
    a = np.asarray(im).astype(np.float32) / 255
    m = a.reshape(-1, 3).mean(0)
    a = np.clip(a * (1 + (m.mean() / m - 1) * wb[k]), 0, 1)
    lo, hi = np.percentile(a, 0.5), np.percentile(a, 99.7)
    a = np.clip((a - lo) / (hi - lo), 0, 1)
    L = float(np.median(lum(a))); t = target[k]
    p = np.log(1 - t) / np.log(1 - L) if L < t else 1.0
    a = 1 - (1 - a) ** p
    im = Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8))
    im = im.filter(ImageFilter.UnsharpMask(radius=30, percent=18, threshold=0))
    im = im.filter(ImageFilter.UnsharpMask(radius=1.5, percent=60, threshold=2))
    a = np.asarray(im).astype(np.float32) / 255
    Y = lum(a)[..., None]; sat = (a.max(-1) - a.min(-1))[..., None]
    a = np.clip(Y + (a - Y) * (1 + 0.45 * (1 - sat)), 0, 1)
    a[..., 2] += 0.025 * (1 - Y[..., 0]); a[..., 0] += 0.012 * Y[..., 0]
    im = Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8))
    im = ImageEnhance.Contrast(im).enhance(1.05)
    im.save(f"{out}/{n}", "JPEG", quality=84, optimize=True, progressive=True)
    before = ImageOps.exif_transpose(Image.open(f"{src}/{k}.jpg")).convert("RGB"); before.thumbnail((700, 700))
    after = im.copy(); after.thumbnail((700, 700))
    c = Image.new("RGB", (before.width * 2 + 10, before.height), "white")
    c.paste(before, (0, 0)); c.paste(after, (before.width + 10, 0))
    c.save(f"{out}/cmp-{n}", quality=80)
    print(n, round(L, 2), "->", round(float(np.median(lum(a))), 2))

fs = ["cmp-" + names[k] for k in ["5", "4", "3", "2", "1"]]
ims = [Image.open(f"{out}/{f}") for f in fs]
for i in ims: i.thumbnail((1000, 500))
W = max(i.width for i in ims); H = sum(i.height for i in ims) + 10 * len(ims)
c = Image.new("RGB", (W, H), "white"); y = 0
for i in ims: c.paste(i, (0, y)); y += i.height + 10
c.save(f"{out}/compare.jpg", quality=80)
