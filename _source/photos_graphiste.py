# Les photos du graphiste d'Anas Grill (dossier « uber eats », recu le 17/10).
#   - plats : recadres en 3:2 (comme les autres visuels) dans _source/photos-client/,
#     puis `python _source/vignettes.py` en fait photos/<nom>.webp + la petite version ;
#   - sauces et canettes : carres 320 px, directement dans photos/ (tuiles des fiches).
# Usage : python _source/photos_graphiste.py <dossier « uber eats »>
import os, sys
from PIL import Image

SRC = sys.argv[1]
ICI = os.path.dirname(os.path.abspath(__file__))
CLIENT = os.path.join(ICI, 'photos-client')
PHOTOS = os.path.join(ICI, '..', 'photos')

# photo du site <- fichier du graphiste (version « seul » sauf exception)
PLATS = {
    'b-cheese': 'burgers/seul/Cheese.jpg', 'b-double-cheese': 'burgers/seul/double Cheese.jpg',
    'b-triple-cheese': 'burgers/seul/Triple Cheese bacon.jpg', 'b-240': 'burgers/seul/240 brioché.jpg',
    'b-fish': 'burgers/seul/Fish brioché.jpg', 'b-maxi': 'burgers/seul/maxi brioché.jpg',
    'b-chicken': 'burgers/seul/Chicken brioché.jpg',
    'b-steak-house': 'burgers/menu/steak house.jpg',   # la version « seul » du graphiste est illisible
    'b-chicken-house': 'burgers/seul/Chicken house.jpg', 'b-anas-grill': 'burgers/seul/Anas grill.jpg',
    'c-sandwich': 'sandwichs/seul/sandwich à composer.jpg', 'c-tacos': 'Tacos/seul/tacos à composer.png',
    'c-roule': 'roulés/seul/roulé à composer.png',
    's-dz': 'roulés/seul/roulé dz.png', 's-tajs': 'sandwichs/signatures/seul/Taj.jpg',
    's-bollys': 'sandwichs/signatures/seul/bolly.jpg', 's-keftas': 'sandwichs/signatures/seul/Kefta.jpg',
    's-effiloches': 'sandwichs/seul/Éffiloché boeuf.jpg', 's-savoyards': 'burgers/seul/Savoyard.jpg',
    'f-classique': 'combos/combo 1.jpg', 'f-maxi-sandwich': 'combos/combo 3.jpg', 'f-maxi-tacos': 'combos/combo 4.jpg',
    'bo-canette': 'Boissons/dada cola.png', 'bo-eau': 'Boissons/Eau.png',
}
SAUCES = {
    'Mayo': 'Mayonnaise', 'Ketchup': 'Ketchup', 'Burger': 'Burger', 'Blanche': 'Blanche', 'Barbecue': 'Bbq',
    'Algérienne': 'Algérienne', 'Curry': 'Curry', 'Samouraï': 'Samouraï', 'Harissa': 'harissa',
    'Gruyère': 'Gruyère', 'Brazil': 'Brazil', 'Tartare': 'Tartare', 'Andalouse': 'Andalouse',
}
BOISSONS = {
    'Dada Cola': 'dada cola', 'Dada Cherry': 'dada cherry', 'Oasis Tropical': 'oasis tropical',
    'Oasis Pomme Cassis Framboise': 'oasis framboise', 'Schweppes Agrumes': 'schweppes agrumes',
    'Schweppes Pomme': 'schweppes pomme', 'Orangina': 'Orangina', 'Eau 50 cl': 'Eau',
}

def slug(t):
    import unicodedata
    t = unicodedata.normalize('NFD', t.lower()); t = ''.join(c for c in t if not unicodedata.combining(c))
    return ''.join(c if c.isalnum() else '-' for c in t).strip('-')

# Les noms du zip sont en Unicode decompose (« e » + accent) : on les retrouve
# par leur forme normalisee.
import unicodedata
INDEX = {}
for racine, _, fichiers in os.walk(SRC):
    for f in fichiers:
        chemin = os.path.join(racine, f)
        INDEX[unicodedata.normalize('NFC', os.path.relpath(chemin, SRC).replace(os.sep, '/')).lower()] = chemin

def ouvrir(rel):
    chemin = INDEX.get(unicodedata.normalize('NFC', rel).lower())
    if not chemin: raise FileNotFoundError(rel)
    return Image.open(chemin).convert('RGB')

def plat(nom, rel):
    im = ouvrir(rel)                                  # 2880 x 2304 (5:4)
    w, h = im.size; nh = round(w * 2 / 3)             # 3:2 -> 1920 de haut
    y = round((h - nh) * 0.38)                        # le haut du pain ne doit jamais etre coupe
    im.crop((0, y, w, y + nh)).resize((1800, 1200), Image.LANCZOS).save(os.path.join(CLIENT, nom + '.jpg'), quality=90)

def carre(nom, rel, zoom):
    im = ouvrir(rel); w, h = im.size; c = round(h * zoom)
    x, y = (w - c) // 2, (h - c) // 2 + round(h * 0.03)
    im.crop((x, y, x + c, y + c)).resize((320, 320), Image.LANCZOS).save(os.path.join(PHOTOS, nom + '.webp'), 'WEBP', quality=82, method=6)

for nom, rel in PLATS.items(): plat(nom, rel)
for n, f in SAUCES.items(): carre('sauce-' + slug(n), 'sauces/' + f + '.png', 0.78)
for n, f in BOISSONS.items(): carre('boisson-' + slug(n), 'Boissons/' + f + '.png', 0.86)
# Les boissons sans photo du graphiste : une tuile neutre (le logo Anas Grill sur
# le bois du graphiste), jamais le rond barre qui ferait croire a une rupture.
fond = ouvrir('Boissons/Eau.png'); w, h = fond.size
fond.crop((40, 120, 40 + round(h * 0.42), 120 + round(h * 0.42))).resize((320, 320), Image.LANCZOS).save(os.path.join(PHOTOS, 'boisson-autre.webp'), 'WEBP', quality=82, method=6)
print(len(PLATS), 'plats,', len(SAUCES), 'sauces,', len(BOISSONS), 'boissons')
