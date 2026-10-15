"""Les photos des options : viandes, sauces, supplements, gratine.
Nicolas (2026-10-15) : « regarde les design sur menu », « meme format et
cadrage pour chaque », « propre visuellement, qualite ».

- Viandes et sauces : decoupees dans le panneau « A composer » de la
  boutique (projet-8-snacks/_source/carte-images/menu-146.jpg), ou elles
  sont nettes et toutes photographiees pareil.
- Supplements et gratine : trop petits sur le panneau (~20 px, prix
  imprimes dessus) -> photos Unsplash, recadrees en carre centre.
Sortie : photos/opt/<cle>.webp, carre 160 px, affiche en rond dans les tuiles.
Relancer : python options_panneau.py [--planche chemin.jpg]
"""
import io, os, sys, urllib.request
from PIL import Image, ImageEnhance

ICI = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ICI, '..', '..', 'projet-8-snacks', '_source', 'carte-images', 'menu-146.jpg')
DST = os.path.join(ICI, '..', 'photos', 'opt')
ING = os.path.join(ICI, '..', 'photos')
os.makedirs(DST, exist_ok=True)
for f in os.listdir(DST): os.remove(os.path.join(DST, f))
TAILLE = 160

def finir(im, cle, net=1.0):
    im = im.convert('RGB').resize((TAILLE, TAILLE), Image.LANCZOS)
    if net != 1.0: im = ImageEnhance.Sharpness(im).enhance(net)
    im.save(os.path.join(DST, cle + '.webp'), 'WEBP', quality=84, method=6)

# --- 1. Le panneau : (cle, centre x, centre y), carre de COTE px ---
VIANDES = [('steak', 405), ('merguez', 475), ('escalope', 540), ('tandoori', 607),
           ('curry', 671), ('tenders', 730), ('cordon-bleu', 792), ('kebab', 852)]
SAUCES = [('mayo', 60), ('ketchup', 122), ('burger', 185), ('blanche', 247), ('barbecue', 308), ('fish', 370),
          ('algerienne', 432), ('sauce-curry', 494), ('samourai', 557), ('harissa', 618), ('gruyere', 680),
          ('brazil', 740), ('tartare', 802), ('andalouse', 865)]
pan = Image.open(SRC).convert('RGB')
for cle, x in VIANDES:
    c = 34; finir(pan.crop((x - c // 2, 345 - c // 2, x + c // 2, 345 + c // 2)), cle, 1.5)
for cle, x in SAUCES:
    c = 46; finir(pan.crop((x - c // 2, 424 - c // 2, x + c // 2, 424 + c // 2)), cle, 1.4)

# --- 2. Unsplash (licence libre) : meme recadrage carre centre ---
UNSPLASH = {
    'emmental': '1653150103131-25569a19958d', 'raclette': '1692311590333-11db3b128650', 'chevre': '1624806992066-5ffcf7ca186b',
    'mozza': '1596924699736-be026ddb5b0c', 'boursin': '1573810655264-8d1e50f1592d', 'chakchouka': '1575919159574-e49dc9e1228f',
    'oignons-crispy': '1639024471283-03518883512d', 'viande': '1554306297-0c86e837d24b',
}
for cle, ident in UNSPLASH.items():
    url = 'https://images.unsplash.com/photo-%s?w=%d&h=%d&fit=crop&q=85' % (ident, TAILLE * 2, TAILLE * 2)
    finir(Image.open(io.BytesIO(urllib.request.urlopen(url).read())), 'u-' + cle)
# Deja sur le site (tuiles « ingredients a retirer ») : la meme photo partout.
for cle, f in (('cheddar', 'ing-cheddar'), ('kiri', 'ing-kiri'), ('bacon', 'ing-bacon')):
    finir(Image.open(os.path.join(ING, f + '.webp')), 'u-' + cle)

if '--planche' in sys.argv:
    fs = sorted(os.listdir(DST)); p = Image.new('RGB', (10 * 168, ((len(fs) + 9) // 10) * 168), (30, 30, 30))
    for n, f in enumerate(fs): p.paste(Image.open(os.path.join(DST, f)), ((n % 10) * 168, (n // 10) * 168))
    p.save(sys.argv[-1])
print(len(os.listdir(DST)), 'photos d options')
