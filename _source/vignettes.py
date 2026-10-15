# Decoupe les vignettes des plats dans les 4 panneaux de la boutique
# (989 px de large, releves sur Eat-List). Boites (x, y, largeur, hauteur)
# en pixels du panneau. A remplacer par leurs vraies photos a la livraison.
# Usage : python _source/vignettes.py
import os, json
from PIL import Image, ImageEnhance

ICI = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ICI, '..', '..', 'projet-8-snacks', '_source', 'carte-images')
DST = os.path.join(ICI, '..', 'photos')
os.makedirs(DST, exist_ok=True)

DECOUPES = {
    'menu-146.jpg': {  # a composer
        'c-sandwich': (90, 140, 260, 95), 'c-tacos': (420, 150, 215, 85), 'c-roule': (620, 120, 340, 120),
    },
    'menu-19a.jpg': {  # signatures
        's-dz': (35, 145, 430, 95), 's-tajs': (505, 145, 455, 95),
        's-bollys': (25, 290, 440, 95), 's-forestiers': (505, 290, 455, 95),
        's-savoyards': (25, 430, 440, 95), 's-anas-food': (535, 430, 420, 95),
    },
    'menu-695.jpg': {  # formules
        'f-classique': (145, 75, 310, 125), 'f-grill-wrap': (630, 70, 260, 135),
        'f-turkish': (95, 330, 200, 70), 'f-mielleux': (305, 335, 200, 70), 'f-crocs': (495, 300, 220, 100), 'f-smash': (720, 320, 225, 80),
        'f-algerien': (60, 440, 215, 70), 'f-rolls': (290, 440, 215, 70), 'f-forestier': (510, 450, 215, 60), 'f-mexicain': (720, 440, 225, 70),
    },
    'menu-signatures-2.jpg': {  # 2e panneau signatures + a grignoter + menu enfant (1600 px, envoye par Hakim le 15/10)
        's-effiloches': (65, 242, 700, 130), 's-keftas': (870, 232, 700, 145),
        's-bresiliens': (40, 497, 720, 110), 's-normands': (825, 502, 750, 106),
        'g-camembert': (55, 705, 150, 110), 'g-tenders': (200, 700, 150, 115), 'g-nuggets': (340, 695, 160, 120),
        'e-cheese': (515, 704, 255, 76), 'e-nuggets': (515, 822, 255, 86),
    },
    'menu-c19.jpg': {  # burgers
        'b-cheese': (160, 150, 115, 70), 'b-double-cheese': (305, 150, 120, 70), 'b-triple-cheese': (455, 140, 110, 80),
        'b-240': (590, 140, 125, 55), 'b-fish': (740, 125, 125, 75),
        'b-maxi': (205, 265, 110, 75), 'b-chicken': (355, 265, 110, 75), 'b-steak-house': (515, 270, 115, 70), 'b-chicken-house': (670, 270, 115, 70),
        'b-anas-grill': (185, 435, 110, 70), 'b-naan-beef': (310, 435, 120, 70), 'b-naan-chicken': (440, 430, 120, 75), 'b-naan-curry': (565, 425, 125, 75), 'b-naan-tandoori': (690, 430, 125, 75),
    },
}

dims = {}
for panneau, boites in DECOUPES.items():
    im = Image.open(os.path.join(SRC, panneau)).convert('RGB')
    for nom, (x, y, l, h) in boites.items():
        c = im.crop((x, y, x + l, y + h))
        # Agrandi x2 (vignettes de 2 fois leur taille d'affichage), un peu plus de peps.
        c = c.resize((l * 2, h * 2), Image.LANCZOS)
        c = ImageEnhance.Contrast(ImageEnhance.Color(c).enhance(1.08)).enhance(1.04)
        c.save(os.path.join(DST, nom + '.webp'), 'WEBP', quality=82, method=6)
        dims[nom] = {'l': c.width, 'h': c.height}
# Les vraies photos du client (_source/photos-client/<nom>.webp) passent
# avant les decoupes des panneaux : on ne les ecrase jamais.
CLIENT = os.path.join(ICI, 'photos-client')
for f in sorted(os.listdir(CLIENT)) if os.path.isdir(CLIENT) else []:
    nom = os.path.splitext(f)[0]
    im = Image.open(os.path.join(CLIENT, f)).convert('RGB')
    if im.width > 1200: im = im.resize((1200, round(im.height * 1200 / im.width)), Image.LANCZOS)
    im.save(os.path.join(DST, nom + '.webp'), 'WEBP', quality=82, method=6)
    dims[nom] = {'l': im.width, 'h': im.height, 'client': True}
    # La carte n'affiche la photo qu'en petit (116 px sur telephone, ~300 px
    # sur ordinateur) : une version 480 px pour la liste, la grande reste
    # pour la fiche du plat. 2,4 Mo d'images par page -> environ 0,9 Mo.
    os.makedirs(os.path.join(DST, 'min'), exist_ok=True)
    pt = im.resize((480, round(im.height * 480 / im.width)), Image.LANCZOS)
    pt.save(os.path.join(DST, 'min', nom + '.webp'), 'WEBP', quality=78, method=6)
    dims[nom]['min'] = True
json.dump(dims, open(os.path.join(ICI, 'vignettes.json'), 'w'), indent=0)
print(len(dims), 'vignettes')
