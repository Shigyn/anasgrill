# OBSOLETE depuis le 20/10 : les vrais naans du graphiste sont dans photos_graphiste.py. Ne plus lancer.
# Les 4 naans (17/10) : pas de photo du graphiste. Decoupes SERREES dans le
# panneau des burgers (sans le titre au-dessus ni le texte en dessous), posees
# sur le meme fond floute pour faire un 3:2 propre. A remplacer par des photos HD.
# Usage : python _source/naans.py
import os
from PIL import Image, ImageFilter, ImageEnhance

ICI = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ICI, '..', '..', 'projet-8-snacks', '_source', 'carte-images', 'menu-c19.jpg')
DST = os.path.join(ICI, 'photos-client')
BOITES = {  # (x0, y0, x1, y1) dans le panneau 989 x 565
    'b-naan-beef': (311, 443, 412, 498), 'b-naan-chicken': (443, 437, 539, 496),
    'b-naan-curry': (568, 431, 665, 489), 'b-naan-tandoori': (691, 444, 790, 499),
}
pan = Image.open(SRC).convert('RGB')
for nom, (x0, y0, x1, y1) in BOITES.items():
    net = pan.crop((x0, y0, x1, y1))
    l = 1200; h = round(l * net.height / net.width * 0.86)
    net = net.resize((round(l * 0.86), h), Image.LANCZOS)
    cx, cy = (x0 + x1) // 2, (y0 + y1) // 2
    fond = pan.crop((cx - 75, cy - 50, cx + 75, cy + 50)).resize((1200, 800), Image.LANCZOS)
    fond = ImageEnhance.Brightness(fond.filter(ImageFilter.GaussianBlur(30))).enhance(0.6)
    # Bords fondus (60 px) : pas de rectangle visible entre le plat et le fond.
    from PIL import ImageDraw
    m = Image.new('L', net.size, 0); ImageDraw.Draw(m).rectangle((50, 40, net.width - 50, net.height - 40), fill=255)
    fond.paste(net, ((1200 - net.width) // 2, (800 - net.height) // 2 + 20), m.filter(ImageFilter.GaussianBlur(28)))
    fond.save(os.path.join(DST, nom + '.jpg'), quality=90)
print('ok', len(BOITES))
