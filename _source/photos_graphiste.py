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
    'b-steak-house': 'burgers/seul/steak house.png',   # reexport du 20/10 (le .jpg du 1er envoi est illisible)
    'b-chicken-house': 'burgers/seul/Chicken house.jpg', 'b-anas-grill': 'burgers/seul/Anas grill.jpg',
    'c-sandwich': 'sandwichs/seul/sandwich à composer.jpg', 'c-tacos': 'Tacos/seul/tacos à composer.png',
    'c-roule': 'roulés/seul/roulé à composer.png',
    's-dz': 'roulés/seul/roulé dz.png', 's-tajs': 'sandwichs/signatures/seul/Taj.jpg',
    's-bollys': 'sandwichs/signatures/seul/bolly.jpg', 's-keftas': 'sandwichs/signatures/seul/Kefta.jpg',
    's-effiloches': 'sandwichs/seul/Éffiloché boeuf.jpg', 's-savoyards': 'burgers/seul/Savoyard.jpg',
    'f-classique': 'combos/combo 1.jpg', 'f-maxi-sandwich': 'combos/combo 3.jpg', 'f-maxi-tacos': 'combos/combo 4.jpg',
    'bo-canette': 'Boissons/dada cola.png', 'bo-eau': 'Boissons/Eau.png',
    # 2e envoi du graphiste (20/10) : naans, a grignoter, menus enfant, L'Algerien.
    'b-naan-beef': 'naans/seul/naan beef.png', 'b-naan-chicken': 'naans/seul/naan chicken.png',
    'b-naan-curry': 'naans/seul/naan curry.png', 'b-naan-tandoori': 'naans/seul/naan tandoori.png',
    'g-camembert': 'tex mex/bouchées de camembert.png', 'g-tenders': 'tex mex/tenders.png', 'g-nuggets': 'tex mex/nuggets.png',
    'e-cheese': 'menus enfant/menu cheese.png', 'e-nuggets': 'menus enfant/menu nuggets.png',
    'f-algerien': "burgers/menu/l'algérien.png",
    # Produits du graphiste ajoutes a la carte le 20/10 (prix a confirmer par Hakim).
    'b-triple-cheese-nature': 'burgers/seul/Triple Cheese.jpg', 'b-quadruple-cheese': 'burgers/seul/Quadruple Cheese.jpg',
    'b-fish-classique': 'burgers/seul/Fish.jpg', 'b-big-grill': 'burgers/seul/big grill.jpg', 'b-boursin': 'burgers/seul/Boursin.jpg',
    'sw-suedois': 'sandwichs/seul/Suédois seul.jpg', 'sw-veaudais': 'sandwichs/seul/veaudais.png', 'sw-bavette': 'sandwichs/signatures/seul/Bavette.jpg',
    'r-jala': 'roulés/seul/roulé jala.png', 'r-buffalo': 'roulés/seul/roulé buffalo.png',
    'r-rio': 'roulés/seul/roulé rio.png', 'r-suisse': 'roulés/seul/roulé suisse.png',
}
# Signatures sans photo exacte du graphiste : la plus proche (17/10, a remplacer
# si le graphiste envoie la vraie).
PLATS.update({
    's-forestiers': 'sandwichs/seul/veaudais.png', 's-anas-food': 'sandwichs/signatures/seul/Bavette.jpg',
    's-bresiliens': 'roulés/seul/roulé rio.png', 's-normands': 'roulés/seul/roulé suisse.png',
})
# Formules a deux plats sans combo du graphiste : deux de ses photos cote a cote.
DUOS = {
    # f-giant : PAS de photo du graphiste (22/10, Hakim) -> le visuel de son panneau des formules (vignettes.py).
    'f-rolls-burger': ('roulés/seul/roulé à composer.png', 'burgers/seul/Cheese.jpg'),
    'f-crousty': ('burgers/seul/Chicken brioché.jpg', 'Tacos/seul/tacos à composer.png'),
    'f-double-rolls': ('roulés/seul/roulé dz.png', 'roulés/seul/roulé suisse.png'),
    'f-rolls-dwich': ('roulés/seul/roulé jala.png', 'sandwichs/seul/sandwich à composer.jpg'),
    'f-street': ('roulés/seul/roulé rio.png', 'roulés/seul/roulé buffalo.png'),
    # 18/10 : les visuels de formules d'Hakim (titre imprime dessus) passent aussi
    # aux photos du graphiste. 20/10 : le croc's est arrive, les deux dernieres
    # formules d'Hakim y passent aussi (L'Algerien a sa photo menu, plus haut).
    'f-crocs': ("croc's/seul/croc's.png", 'burgers/seul/Cheese.jpg'),
    'f-rolls': ('roulés/seul/roulé à composer.png', "croc's/seul/croc's.png"),
    # f-smash : PAS de photo du graphiste (21/10, Hakim : « l'image n'est pas la
    # bonne ») -> son visuel d'origine, dans photos-client/f-smash.webp.
    'f-turkish': ('roulés/seul/roulé buffalo.png', 'burgers/seul/Cheese.jpg'),
    'f-mielleux': ('burgers/seul/Boursin.jpg', 'roulés/seul/roulé suisse.png'),
    'f-forestier': ('sandwichs/seul/veaudais.png', 'burgers/seul/maxi brioché.jpg'),
    'f-mexicain': ('roulés/seul/roulé jala.png', 'roulés/seul/roulé dz.png'),
    'f-grill-wrap': ('burgers/seul/Anas grill.jpg', 'roulés/seul/roulé rio.png'),
}

SAUCES = {
    'Mayo': 'Mayonnaise', 'Ketchup': 'Ketchup', 'Burger': 'Burger', 'Blanche': 'Blanche', 'Barbecue': 'Bbq',
    'Algérienne': 'Algérienne', 'Curry': 'Curry', 'Samouraï': 'Samouraï', 'Harissa': 'harissa',
    'Gruyère': 'Gruyère', 'Brazil': 'Brazil', 'Tartare': 'Tartare', 'Andalouse': 'Andalouse', 'Moutarde': 'Moutarde',
}
BOISSONS = {
    'Dada Cola': 'dada cola', 'Dada Cherry': 'dada cherry', 'Oasis Tropical': 'oasis tropical',
    'Oasis Pomme Cassis Framboise': 'oasis framboise', 'Schweppes Agrumes': 'schweppes agrumes',
    'Schweppes Pomme': 'schweppes pomme', 'Orangina': 'Orangina', 'Eau 50 cl': 'Eau',
    'Perrier': 'Perrier', 'Ice Tea': 'ice tea',
}
# Canettes que le graphiste n'a pas : photos trouvees sur internet (Open Food
# Facts, _source/photos-internet/), mises TELLES QUELLES (Nicolas, 20/10 : pas
# de detourage, Hakim fournira les bonnes) : la photo entiere sur fond sombre.
INTERNET = ['dada-zero', 'oasis-fraise-framboise', 'oasis-pomme-poire', 'schweppes-lemon']

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

def duo(nom, a, b):
    # Chaque moitie montre son plat EN ENTIER (un burger est plus large qu'une
    # demi-carte) : le plat reduit, et autour la meme photo floutee et assombrie.
    from PIL import ImageFilter, ImageEnhance
    t = Image.new('RGB', (1800, 1200), (18, 16, 14))
    for k, rel in enumerate((a, b)):
        im = ouvrir(rel); w, h = im.size
        x = (w - 2300) // 2
        net = im.crop((x, 0, x + 2300, h)).resize((896, round(896 * h / 2300)), Image.LANCZOS)
        fond = im.crop(((w - round(h * 0.747)) // 2, 0, (w + round(h * 0.747)) // 2, h)).resize((896, 1200), Image.LANCZOS)
        fond = ImageEnhance.Brightness(fond.filter(ImageFilter.GaussianBlur(28))).enhance(0.55)
        fond.paste(net, (0, (1200 - net.height) // 2 + 30))
        t.paste(fond, (k * 904, 0))
    t.save(os.path.join(CLIENT, nom + '.jpg'), quality=90)

for nom, rel in PLATS.items(): plat(nom, rel)
for nom, (a, b) in DUOS.items(): duo(nom, a, b)
for n, f in SAUCES.items(): carre('sauce-' + slug(n), 'sauces/' + f + '.png', 0.78)
for n, f in BOISSONS.items(): carre('boisson-' + slug(n), 'Boissons/' + f + '.png', 0.86)
# Les boissons sans photo du graphiste : une tuile neutre (le logo Anas Grill sur
# le bois du graphiste), jamais le rond barre qui ferait croire a une rupture.
fond = ouvrir('Boissons/Eau.png'); w, h = fond.size
fond.crop((40, 120, 40 + round(h * 0.42), 120 + round(h * 0.42))).resize((320, 320), Image.LANCZOS).save(os.path.join(PHOTOS, 'boisson-autre.webp'), 'WEBP', quality=82, method=6)
for nom in INTERNET:
    im = Image.open(os.path.join(ICI, 'photos-internet', nom + '.jpg')).convert('RGB'); im.thumbnail((300, 300), Image.LANCZOS)
    t = Image.new('RGB', (320, 320), (26, 23, 20)); t.paste(im, ((320 - im.width) // 2, (320 - im.height) // 2))
    t.save(os.path.join(PHOTOS, 'boisson-' + nom + '.webp'), 'WEBP', quality=82, method=6)
print(len(PLATS), 'plats,', len(SAUCES), 'sauces,', len(BOISSONS), 'boissons')
