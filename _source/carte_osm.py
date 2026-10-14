# Fabrique le fond de la carte des snacks a partir d'OpenStreetMap
# (LocWeb, 2026-10-14). Lance UNE fois, a la construction : le site
# n'interroge aucun service de cartes a l'affichage (choix de Nicolas).
#   Entree : export Overpass (fleuves, canaux, plans d'eau, autoroutes,
#            voies rapides, grands axes de Lyon) ; Sortie : carte-fond.json
# Echelle REELLE (equirectangulaire locale), cadrage sur les 8 snacks.
# Donnees (c) les contributeurs OpenStreetMap, licence ODbL.
import json, math, os, sys

ICI = os.path.dirname(os.path.abspath(__file__))
SRC = sys.argv[1]
# Cadre : un peu plus large que les 8 snacks.
O, E, S, N = 4.735, 5.335, 45.555, 45.855
W = 1000
KX = math.cos(math.radians((S + N) / 2))
H = round(W * (N - S) / ((E - O) * KX))

def proj(lat, lng):
    return ((lng - O) / (E - O) * W, (N - lat) / (N - S) * H)

def dp(pts, tol):
    """Douglas-Peucker : on garde la forme, on jette les points inutiles."""
    if len(pts) < 3: return pts
    (x1, y1), (x2, y2) = pts[0], pts[-1]
    dx, dy = x2 - x1, y2 - y1; L = math.hypot(dx, dy) or 1e-9
    imax, dmax = 0, 0
    for i in range(1, len(pts) - 1):
        d = abs(dy * pts[i][0] - dx * pts[i][1] + x2 * y1 - y2 * x1) / L
        if d > dmax: imax, dmax = i, d
    if dmax <= tol: return [pts[0], pts[-1]]
    return dp(pts[:imax + 1], tol)[:-1] + dp(pts[imax:], tol)

def chemin(pts, ferme=False):
    return 'M' + ' '.join(f'{x:.1f},{y:.1f}' for x, y in pts) + ('Z' if ferme else '')

data = json.load(open(SRC, encoding='utf-8'))
classes = {'eau': [], 'fleuve': [], 'canal': [], 'autoroute': [], 'axe': []}
for el in data['elements']:
    g = el.get('geometry'); t = el.get('tags', {})
    if not g: continue
    pts = [proj(p['lat'], p['lon']) for p in g]
    if t.get('natural') == 'water':
        if len(pts) < 4: continue
        xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
        if (max(xs) - min(xs)) * (max(ys) - min(ys)) < 4: continue  # mares minuscules
        classes['eau'].append(chemin(dp(pts, .5), True))
    elif t.get('waterway') == 'river':
        classes['fleuve'].append(chemin(dp(pts, .5)))
    elif t.get('waterway') == 'canal':
        classes['canal'].append(chemin(dp(pts, .6)))
    elif t.get('highway') in ('motorway', 'trunk'):
        classes['autoroute'].append(chemin(dp(pts, .7)))
    elif t.get('highway') == 'primary':
        classes['axe'].append(chemin(dp(pts, .8)))

# Une seule « d » par classe : moins d'elements, un SVG plus leger.
sortie = {'cadre': {'O': O, 'E': E, 'S': S, 'N': N, 'W': W, 'H': H}, 'd': {k: ' '.join(v) for k, v in classes.items()}}
json.dump(sortie, open(os.path.join(ICI, 'carte-fond.json'), 'w', encoding='utf-8'))
print('viewBox', W, H, {k: len(v) for k, v in classes.items()}, os.path.getsize(os.path.join(ICI, 'carte-fond.json')) // 1024, 'Ko')
