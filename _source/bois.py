# Le fond « planches de bois brule » du site, comme sur les panneaux de
# la boutique Anas Grill (LocWeb, 2026-10-14). Genere, pas une photo :
# aucune licence, aucun poids inutile. Usage : python _source/bois.py
import os
import numpy as np
from PIL import Image, ImageFilter

ICI = os.path.dirname(os.path.abspath(__file__))
rng = np.random.default_rng(12)
W, H, PL = 1600, 1000, 6          # 6 planches verticales

def bruit(w, h, echelle):
    """Bruit lisse : une petite grille aleatoire agrandie."""
    g = rng.random((max(2, h // echelle), max(2, w // echelle)))
    return np.asarray(Image.fromarray((g * 255).astype(np.uint8)).resize((w, h), Image.BICUBIC), dtype=np.float32) / 255

x = np.arange(W)[None, :].repeat(H, 0).astype(np.float32)
y = np.arange(H)[:, None].repeat(W, 1).astype(np.float32)
largeur = W / PL
img = np.zeros((H, W), np.float32)

def fibres_verticales(w, h, pas_x, pas_y):
    """Des fibres longues dans le sens de la planche (bruit etire en hauteur)."""
    g = rng.random((max(2, h // pas_y), max(2, w // pas_x)))
    return np.asarray(Image.fromarray((g * 255).astype(np.uint8)).resize((w, h), Image.BICUBIC), dtype=np.float32) / 255

for k in range(PL):
    m = (x >= k * largeur) & (x < (k + 1) * largeur)
    ondule = fibres_verticales(W, H, 400, 260) * 14            # la veine derive lentement
    veines = np.sin((x + ondule + k * 53) * (2 * np.pi / rng.uniform(26, 44))) * .5 + .5
    fines = fibres_verticales(W, H, 2, 120) * .6 + fibres_verticales(W, H, 5, 300) * .4
    noeuds = fibres_verticales(W, H, 220, 220)                 # zones plus sombres ou plus claires
    teinte = .5 + rng.uniform(-.07, .07) + (noeuds - .5) * .22
    img = np.where(m, teinte * (.78 + .10 * veines + .22 * fines), img)
    j = np.abs(x - k * largeur) < 2.0                          # le joint entre deux planches
    img = np.where(j, img * .3, img)
    j2 = np.abs(x - k * largeur - 3) < 1.2                     # son petit reflet
    img = np.where(j2, img * 1.12, img)
img = np.clip(img, 0, 1)
# Couleur : bois brule, presque noir, une pointe de brun chaud.
r = img * 46 + 8; g = img * 33 + 6; b = img * 24 + 5
rgb = np.stack([r, g, b], -1).clip(0, 255).astype(np.uint8)
im = Image.fromarray(rgb).filter(ImageFilter.GaussianBlur(.6))
im.save(os.path.join(ICI, '..', 'photos', 'bois.webp'), 'WEBP', quality=72, method=6)
print('bois', im.size, os.path.getsize(os.path.join(ICI, '..', 'photos', 'bois.webp')) // 1024, 'Ko')
