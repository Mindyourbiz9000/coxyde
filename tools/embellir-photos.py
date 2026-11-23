"""Retouche des photos de l'appartement (lumière, balance des blancs, couleurs).

Usage :
  python3 tools/embellir-photos.py SOURCE.jpg site/photos/NOM.jpg [force_balance] [luminosite_cible]

  force_balance     0 à 1, correction de la dominante jaune/orange (défaut 0.6)
  luminosite_cible  0 à 1, luminosité médiane visée (défaut 0.58)

Ajouter --large pour une image d'en-tête de 2400 px au lieu de 1600 px.
"""
import sys
import numpy as np
from PIL import Image, ImageOps, ImageEnhance, ImageFilter


def lum(a):
    return a[..., 0] * .2126 + a[..., 1] * .7152 + a[..., 2] * .0722


def embellir(src, dst, wb=0.6, target=0.58, size=1600):
    im = ImageOps.exif_transpose(Image.open(src)).convert("RGB")
    im.thumbnail((size, size), Image.LANCZOS)
    a = np.asarray(im).astype(np.float32) / 255
    m = a.reshape(-1, 3).mean(0)
    a = np.clip(a * (1 + (m.mean() / m - 1) * wb), 0, 1)
    lo, hi = np.percentile(a, 0.5), np.percentile(a, 99.7)
    a = np.clip((a - lo) / (hi - lo), 0, 1)
    L = float(np.median(lum(a)))
    p = np.log(1 - target) / np.log(1 - L) if L < target else 1.0
    a = 1 - (1 - a) ** p
    im = Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8))
    im = im.filter(ImageFilter.UnsharpMask(radius=30, percent=18, threshold=0))
    im = im.filter(ImageFilter.UnsharpMask(radius=1.5, percent=60, threshold=2))
    a = np.asarray(im).astype(np.float32) / 255
    Y = lum(a)[..., None]
    sat = (a.max(-1) - a.min(-1))[..., None]
    a = np.clip(Y + (a - Y) * (1 + 0.45 * (1 - sat)), 0, 1)
    a[..., 2] += 0.025 * (1 - Y[..., 0])
    a[..., 0] += 0.012 * Y[..., 0]
    im = Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8))
    im = ImageEnhance.Contrast(im).enhance(1.05)
    im.save(dst, "JPEG", quality=84, optimize=True, progressive=True)
    return im


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if a != "--large"]
    size = 2400 if "--large" in sys.argv else 1600
    src, dst = args[0], args[1]
    wb = float(args[2]) if len(args) > 2 else 0.6
    target = float(args[3]) if len(args) > 3 else 0.58
    embellir(src, dst, wb, target, size)
    print(dst)
