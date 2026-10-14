# Les mini-cartes des restaurants (LocWeb, 2026-10-14).
# Pour chaque snack, une petite carte SVG STATIQUE de son quartier (rues,
# fleuves, autoroutes OpenStreetMap), servie comme une image : chargee a
# la demande, mise en cache, aucun calcul dans la page. 8 snacks, des
# milliers de clients : ca doit rester fluide (Nicolas).
# + carte-ensemble.svg : le petit encart de vue d'ensemble.
# Usage : python _source/cartes_quartiers.py <osm.json global> <dossier des quartiers>
# Donnees (c) les contributeurs OpenStreetMap, licence ODbL.
import json, math, os, re, subprocess, sys

ICI = os.path.dirname(os.path.abspath(__file__))
DST = os.path.join(ICI, '..', 'photos')
GLOBAL, QUARTIERS = sys.argv[1], sys.argv[2]
snacks = json.loads(subprocess.check_output(['node', '-e', "import('./_source/donnees.mjs').then(m=>console.log(JSON.stringify(m.SNACKS)))"], cwd=os.path.join(ICI, '..')))

DEMI_L, DEMI_H = 1250, 780          # cadre de la vignette : 2,5 km x 1,56 km (16:10)
STYLE = ('<style>.t{fill:#141312}.e{fill:#22465f}.f{fill:none;stroke:#2a5d82;stroke-width:26;stroke-linecap:round;stroke-linejoin:round}'
         '.a{fill:none;stroke:#5a4128;stroke-width:22;stroke-linecap:round;stroke-linejoin:round}'
         '.r1{fill:none;stroke:#4a4038;stroke-width:16;stroke-linecap:round;stroke-linejoin:round}'
         '.r2{fill:none;stroke:#363029;stroke-width:10;stroke-linecap:round;stroke-linejoin:round}'
         '.r3{fill:none;stroke:#29251f;stroke-width:7;stroke-linecap:round;stroke-linejoin:round}</style>')

def dp(pts, tol):
    if len(pts) < 3: return pts
    (x1, y1), (x2, y2) = pts[0], pts[-1]
    dx, dy = x2 - x1, y2 - y1; L = math.hypot(dx, dy) or 1e-9
    imax, dmax = 0, 0
    for i in range(1, len(pts) - 1):
        d = abs(dy * pts[i][0] - dx * pts[i][1] + x2 * y1 - y2 * x1) / L
        if d > dmax: imax, dmax = i, d
    if dmax <= tol: return [pts[0], pts[-1]]
    return dp(pts[:imax + 1], tol)[:-1] + dp(pts[imax:], tol)

def classe(t):
    h = t.get('highway', ''); w = t.get('waterway', '')
    if t.get('natural') == 'water': return 'e'
    if w in ('river', 'canal'): return 'f'
    if h in ('motorway', 'trunk'): return 'a'
    if h in ('primary', 'secondary'): return 'r1'
    if h in ('tertiary', 'unclassified'): return 'r2'
    if h: return 'r3'
    return None

glob = json.load(open(GLOBAL, encoding='utf-8'))['elements']
for s in snacks:
    kx = math.cos(math.radians(s['lat'])) * 111320; ky = 110570
    def p(lat, lng): return ((lng - s['lng']) * kx, (s['lat'] - lat) * ky)
    def dedans(pt, marge=200): return abs(pt[0]) < DEMI_L + marge and abs(pt[1]) < DEMI_H + marge
    traits = {k: [] for k in ('e', 'f', 'a', 'r1', 'r2', 'r3')}
    vus = set()
    try: locaux = json.load(open(os.path.join(QUARTIERS, s['id'] + '.json'), encoding='utf-8'))['elements']
    except Exception: locaux = []
    for el in glob + locaux:
        g = el.get('geometry'); c = classe(el.get('tags', {}))
        if not g or not c or (el['id'], c) in vus: continue
        vus.add((el['id'], c))
        pts = [p(q['lat'], q['lon']) for q in g]
        if not any(dedans(q) for q in pts): continue
        # On ne garde que les morceaux proches du cadre (le reste est hors champ).
        morceaux, cur = [], []
        for q in pts:
            if dedans(q, 900): cur.append(q)
            elif cur: morceaux.append(cur); cur = []
        if cur: morceaux.append(cur)
        for m in morceaux:
            if len(m) < 2: continue
            m = dp(m, 4)
            d = 'M' + ' '.join(f'{x:.0f},{y:.0f}' for x, y in m) + ('Z' if c == 'e' else '')
            traits[c].append(d)
    # Ordre de dessin : petites rues, grandes rues, autoroutes, puis l'eau et les fleuves.
    corps = ''.join(f'<path class="{k}" d="{" ".join(traits[k])}"/>' for k in ('r3', 'r2', 'r1', 'a', 'e', 'f') if traits[k])
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{-DEMI_L} {-DEMI_H} {2 * DEMI_L} {2 * DEMI_H}">{STYLE}'
           f'<rect class="t" x="{-DEMI_L}" y="{-DEMI_H}" width="{2 * DEMI_L}" height="{2 * DEMI_H}"/>{corps}</svg>')
    chemin = os.path.join(DST, f'carte-{s["id"]}.svg')
    open(chemin, 'w', encoding='utf-8').write(svg)
    print(f'{s["id"]:18s} {os.path.getsize(chemin) // 1024:4d} Ko', {k: len(v) for k, v in traits.items()})

# La vue d'ensemble : le fond deja projete (carte-fond.json), sans texte.
F = json.load(open(os.path.join(ICI, 'carte-fond.json'), encoding='utf-8'))
C, D = F['cadre'], F['d']
ens = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {C["W"]} {C["H"]}"><style>'
       '.t{fill:#141312}.x{fill:none;stroke:#2a2724;stroke-width:1.1;stroke-linecap:round}.a{fill:none;stroke:#5a4128;stroke-width:2.2;stroke-linecap:round}'
       '.e{fill:#22465f}.f{fill:none;stroke:#2a5d82;stroke-width:4;stroke-linecap:round;stroke-linejoin:round}.c{fill:none;stroke:#2a5d82;stroke-width:2.2}</style>'
       f'<rect class="t" width="{C["W"]}" height="{C["H"]}"/><path class="x" d="{D["axe"]}"/><path class="a" d="{D["autoroute"]}"/>'
       f'<path class="e" d="{D["eau"]}"/><path class="c" d="{D["canal"]}"/><path class="f" d="{D["fleuve"]}"/></svg>')
open(os.path.join(DST, 'carte-ensemble.svg'), 'w', encoding='utf-8').write(ens)
print('ensemble', os.path.getsize(os.path.join(DST, 'carte-ensemble.svg')) // 1024, 'Ko')
