// ===================================================================
//  Anas Grill — generateur du site de commande (LocWeb, 2026-10-14)
//     node build.mjs          -> apercu (noindex, paiement simule)
//     PROD=1 node build.mjs   -> mise en ligne
//  Parcours voulu par Nicolas :
//    1. « Choisis ton restaurant » (carte des snacks, le plus proche propose)
//    2. la carte du restaurant choisi
//    3. panier -> informations -> paiement (simule tant que le client n'a
//       pas repondu aux questions Stripe)
//    4. « Commande payee » : rendez-vous a telle heure / le livreur appelle.
//  Une page par snack (/lyon-8/, /venissieux/...) : chacune est indexable
//  pour sa ville. Le menu est le meme partout.
// ===================================================================
import fs from 'node:fs';
import path from 'node:path';
import { SNACKS, CARTE } from './_source/donnees.mjs';

const ICI = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Z]:)/, '$1');
const PROD = process.env.PROD === '1';
const URL_SITE = PROD ? 'https://www.anasgrill.fr/' : 'https://shigyn.github.io/anasgrill/';
const VIGNETTES = JSON.parse(fs.readFileSync(path.join(ICI, '_source', 'vignettes.json'), 'utf8'));
const V = '1';
// Delais (minutes) et capacite : a regler avec le client (cahier, question 6).
const REGLAGES = { preparation: 15, minutesParKm: 3, departLivreur: 5, pas: 5, capaciteParQuartDHeure: 8, paiement: PROD ? 'stripe' : 'simule' };

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const abs = (ch) => URL_SITE + ch;
const prix = (p) => (p == null ? 'Prix à confirmer' : (Number.isInteger(p) ? `${p}` : p.toFixed(2).replace('.', ',')) + '&nbsp;€');

/* Le logo, redessine en SVG d'apres leur logo (rond noir, flamme, ANAS
   blanc, GRILL orange) : leur fichier HD remplacera ce dessin. */
const LOGO = `<svg class="logo" viewBox="0 0 120 120" role="img" aria-label="Anas Grill"><defs><linearGradient id="fl" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#ff5a00"/><stop offset="1" stop-color="#ffb800"/></linearGradient></defs><circle cx="60" cy="60" r="58" fill="#0b0b0c"/><circle cx="60" cy="60" r="49" fill="none" stroke="#fff" stroke-width="2.4"/><path d="M60 14c3 9 13 13 11 25-1 5-4 8-4 8 1-6-2-10-5-12 1 6-3 10-6 13-3-4-7-7-6-13-4 4-6 9-4 14-5-3-8-9-6-16 3-9 15-11 20-19z" fill="url(#fl)"/><text x="60" y="73" text-anchor="middle" font-family="Anton, Impact, sans-serif" font-size="27" fill="#fff" letter-spacing="1">ANAS</text><text x="60" y="94" text-anchor="middle" font-family="Anton, Impact, sans-serif" font-size="15" fill="#ff8a00" letter-spacing="4">GRILL</text></svg>`;

const I = {
  pin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"/></svg>',
  cible: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 2h2v3.1A7 7 0 0 1 18.9 11H22v2h-3.1A7 7 0 0 1 13 18.9V22h-2v-3.1A7 7 0 0 1 5.1 13H2v-2h3.1A7 7 0 0 1 11 5.1zm1 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 3a2 2 0 1 1 0 4 2 2 0 0 1 0-4z"/></svg>',
  tel: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.6a1 1 0 0 1-.25 1z"/></svg>',
  plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z"/></svg>',
  fleche: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.2 5.3 19.9 12l-6.7 6.7-1.4-1.4 4.3-4.3H4v-2h12.1l-4.3-4.3z"/></svg>',
  etoile: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2 3 6.6 7.2.7-5.4 4.8 1.6 7.1L12 17.5l-6.4 3.7 1.6-7.1L1.8 9.3 9 8.6z"/></svg>',
  sac: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7V6a5 5 0 0 1 10 0v1h3l-1 14H5L4 7zm2 0h6V6a3 3 0 0 0-6 0z"/></svg>',
};

/* ---------------- gabarit ---------------- */
function page(chemin, { titre, description, corps, schemas = [], classe = '', scripts = [], tetes = '' }) {
  const r = '../'.repeat(chemin.split('/').filter(Boolean).length);
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<script>document.documentElement.classList.add('js')</script>
<title>${esc(titre)}</title>
<meta name="description" content="${esc(description)}">
${PROD ? '' : '<meta name="robots" content="noindex,nofollow">\n'}<link rel="canonical" href="${abs(chemin)}">
<meta property="og:type" content="website">
<meta property="og:locale" content="fr_FR">
<meta property="og:site_name" content="Anas Grill">
<meta property="og:title" content="${esc(titre)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${URL_SITE}photos/f-classique.webp">
<meta name="theme-color" content="#0b0b0c">
<link rel="icon" href="data:image/svg+xml,${encodeURIComponent(LOGO.replace('class="logo" ', ''))}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Anton&family=Barlow:wght@400;500;600;700&family=Barlow+Condensed:wght@600;700&display=swap" rel="stylesheet">
${tetes}<link rel="stylesheet" href="${r}assets/style.css?v=${V}">
<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': [ORGA, ...schemas] })}</script>
</head>
<body class="${classe}">
<a class="evitement" href="#contenu">Aller au contenu</a>
${corps(r)}
<footer class="pied">
  <div class="cadre pied-in">
    <a class="pied-logo" href="${r || './'}">${LOGO}</a>
    <p>Les formules à 10 € toute l’année, dans nos ${SNACKS.length} restaurants de Lyon et d’Isère.</p>
    <nav class="pied-snacks" aria-label="Nos restaurants">${SNACKS.map((s) => `<a href="${r}${s.id}/">${esc(s.nom)}</a>`).join('')}</nav>
    <p class="pied-bas">© ${new Date().getFullYear()} Anas Grill · <a href="${r}mentions-legales/">Mentions légales</a> · <a href="${r}cgv/">Conditions de vente</a>${PROD ? ' · Site réalisé par <a href="https://locweb.fr" target="_blank" rel="noopener">LocWeb</a>' : ''}</p>
  </div>
</footer>
<script>
  window.LOCWEB_CONFIG = {
    supabaseUrl: 'https://ibqawtgnucakzdldnitj.supabase.co',
    supabaseAnonKey: 'sb_publishable_rpLrUo4Cqnfl8zSohDqO0A_Q5Vkj2Hk',
    clientId: '',
    ga4Id: ''
  };
  window.ANAS = ${JSON.stringify({ racine: r, reglages: REGLAGES })};
</script>
<script src="${r}mesure.js" defer></script>
${scripts.map((s) => `<script src="${r}assets/${s}?v=${V}" defer></script>`).join('\n')}
</body>
</html>
`;
}

const ORGA = { '@type': 'Organization', '@id': URL_SITE + '#anas-grill', name: 'Anas Grill', url: URL_SITE, description: 'Fast-food aux formules à 10 € toute l’année : sandwichs, tacos, burgers, à Lyon et en Isère.' };
const restaurantSchema = (s) => ({
  '@type': 'FastFoodRestaurant', '@id': abs(s.id + '/') + '#restaurant', name: 'Anas Grill ' + s.nom, parentOrganization: { '@id': URL_SITE + '#anas-grill' },
  url: abs(s.id + '/'), telephone: s.tel, priceRange: '1–10 €', servesCuisine: ['Fast-food', 'Burgers', 'Tacos', 'Sandwichs'],
  address: { '@type': 'PostalAddress', streetAddress: s.adresse.split(',')[0], postalCode: (s.adresse.match(/\b\d{5}\b/) || [''])[0], addressLocality: s.ville.replace(/ \d+e$/, ''), addressCountry: 'FR' },
  geo: { '@type': 'GeoCoordinates', latitude: s.lat, longitude: s.lng }, hasMenu: abs(s.id + '/#carte'),
  potentialAction: { '@type': 'OrderAction', target: abs(s.id + '/') },
});

/* ---------------- La carte dessinee (Nicolas, 2026-10-14 : « tu as qu'a
   la designer, c'est mieux qu'une API ») ----------------
   Une carte en SVG a nos couleurs, sans fond de carte ni cle. Les
   directions sont justes ; les distances sont « adoucies » (racine
   carree depuis le centre de Lyon) pour que les snacks de Lyon ne
   s'ecrasent pas les uns sur les autres a cote de Bourgoin. */
const CENTRE = { lat: 45.76, lng: 4.86 }, ECH = 108, X0 = 300, Y0 = 372, KMLNG = Math.cos(CENTRE.lat * Math.PI / 180) * 111.32;
function proj(lat, lng) {
  const dx = (lng - CENTRE.lng) * KMLNG, dy = (lat - CENTRE.lat) * 110.57, r = Math.hypot(dx, dy);
  const f = r ? Math.sqrt(r) / r : 0;
  return [Math.round((X0 + dx * f * ECH) * 10) / 10, Math.round((Y0 - dy * f * ECH) * 10) / 10];
}
// Courbe lissee (Catmull-Rom) a travers des points [lat, lng].
function trace(points) {
  const p = points.map(([la, ln]) => proj(la, ln));
  let d = `M${p[0][0]},${p[0][1]}`;
  for (let i = 0; i < p.length - 1; i++) {
    const a = p[i - 1] || p[i], b = p[i], c = p[i + 1], e = p[i + 2] || c;
    d += ` C${(b[0] + (c[0] - a[0]) / 6).toFixed(1)},${(b[1] + (c[1] - a[1]) / 6).toFixed(1)} ${(c[0] - (e[0] - b[0]) / 6).toFixed(1)},${(c[1] - (e[1] - b[1]) / 6).toFixed(1)} ${c[0]},${c[1]}`;
  }
  return d;
}
const RHONE = [[45.83, 5.12], [45.81, 5.04], [45.795, 4.97], [45.785, 4.915], [45.775, 4.865], [45.762, 4.845], [45.748, 4.835], [45.737, 4.818], [45.715, 4.815], [45.69, 4.82], [45.655, 4.81], [45.6, 4.79]];
const SAONE = [[45.9, 4.85], [45.86, 4.845], [45.82, 4.85], [45.795, 4.84], [45.778, 4.826], [45.765, 4.826], [45.752, 4.828], [45.737, 4.818]];
// Les noms des snacks disent deja les villes : on ne garde que les reperes.
const VILLES = [['Lyon', 45.757, 4.835, 'grande'], ['Villeurbanne', 45.766, 4.893]];
function carteSvg(r) {
  const anneaux = [[5, '5 km'], [15, '15 km'], [35, '35 km']].map(([km, t]) => {
    const rr = Math.sqrt(km) * ECH;
    return `<circle cx="${X0}" cy="${Y0}" r="${rr.toFixed(0)}" class="anneau"/><text x="${X0 + rr * 0.71 + 6}" y="${Y0 + rr * 0.71 + 4}" class="anneau-t">${t}</text>`;
  }).join('');
  const villes = VILLES.map(([n, la, ln, cls]) => { const [x, y] = proj(la, ln); return `<text x="${x}" y="${y + 30}" class="ville${cls ? ' ville-' + cls : ''}" text-anchor="middle">${esc(n)}</text>`; }).join('');
  const points = SNACKS.map((s) => {
    const [x, y] = proj(s.lat, s.lng);
    return `<a href="${r}${s.id}/" class="marqueur" data-snack="${s.id}" aria-label="Anas Grill ${esc(s.nom)}"><g transform="translate(${x} ${y})"><g class="taille"><circle r="26" class="halo"/><path class="feu" d="M0-26c4 9 15 12 15 25a15 15 0 0 1-30 0c0-9 8-12 8-19 3.5 3 4.5 7.5 4.5 11C1.5-13 2-19 0-26z"/><text y="-34" text-anchor="middle" class="marqueur-nom">${esc(s.nom)}</text></g></g></a>`;
  }).join('');
  return `<svg class="carte-svg" viewBox="0 0 1000 800" role="img" aria-label="Carte des restaurants Anas Grill" data-proj='${JSON.stringify({ lat: CENTRE.lat, lng: CENTRE.lng, ech: ECH, x0: X0, y0: Y0, kmlng: KMLNG })}'>
  <defs><radialGradient id="lueur" cx="${(X0 / 10).toFixed(0)}%" cy="${(Y0 / 8).toFixed(0)}%" r="60%"><stop offset="0" stop-color="#ff7a00" stop-opacity=".18"/><stop offset="1" stop-color="#ff7a00" stop-opacity="0"/></radialGradient>
  <pattern id="grille" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="#fff" stroke-opacity=".035"/></pattern></defs>
  <rect width="1000" height="800" fill="url(#grille)"/><rect width="1000" height="800" fill="url(#lueur)"/>
  <g class="anneaux">${anneaux}</g>
  <path d="${trace(RHONE)}" class="fleuve"/><path d="${trace(SAONE)}" class="fleuve fleuve-fin"/>
  ${(() => { const [x, y] = proj(45.79, 4.95); const [a, b] = proj(45.86, 4.846); return `<text x="${x}" y="${y - 10}" class="fleuve-t">Rhône</text><text x="${a + 10}" y="${b + 40}" class="fleuve-t">Saône</text>`; })()}
  <g class="villes">${villes}</g>
  <g class="vous" data-vous hidden><circle r="16" class="vous-halo"/><circle r="8" class="vous-point"/></g>
  <g class="marqueurs">${points}</g>
</svg>`;
}

/* ---------------- 1. Choisis ton restaurant ---------------- */
const PAGES = [];
PAGES.push(['', {
  titre: 'Anas Grill — Commande en ligne, formules à 10 € · Lyon et Isère',
  description: `Commandez chez Anas Grill en ligne : formules à 10 €, sandwichs, tacos, burgers. ${SNACKS.length} restaurants à Lyon, Villeurbanne, Vénissieux, Vaulx-en-Velin, Rillieux, Bourgoin-Jallieu et Pont-de-Chéruy.`,
  classe: 'page-choix',
  scripts: ['choix.js'],
  corps: (r) => `
<header class="choix-tete">
  <div class="cadre choix-tete-in">
    <a class="marque" href="./">${LOGO}</a>
    <p class="slogan"><b>Formules à 10&nbsp;€</b> toute l’année</p>
  </div>
</header>
<main id="contenu" class="choix">
  <section class="choix-panneau">
    <div class="choix-intro">
      <h1>Choisis <span>ton restaurant</span></h1>
      <p>Livraison ou à emporter, payé en ligne, prêt à l’heure.</p>
      <div class="choix-actions">
        <button class="bouton bouton-feu" type="button" data-localiser>${I.cible} Trouver le plus proche</button>
        <form class="adresse-form" data-adresse-form autocomplete="off">
          <label class="sr" for="adresse-recherche">Ton adresse</label>
          <input id="adresse-recherche" name="adresse" placeholder="Ou tape ton adresse…" data-adresse-champ>
          <ul class="suggestions" data-suggestions hidden></ul>
        </form>
      </div>
      <p class="choix-note" data-choix-note aria-live="polite"></p>
    </div>
    <ul class="snacks" data-snacks>
      ${SNACKS.map((s) => `
      <li class="snack" data-snack="${s.id}">
        <a href="${r}${s.id}/">
          <span class="snack-flamme" aria-hidden="true"></span>
          <span class="snack-texte"><b>${esc(s.nom)}</b><small>${esc(s.adresse)}</small></span>
          <span class="snack-meta">${s.note ? `<span class="snack-note">${I.etoile}${s.note}</span>` : ''}<span class="snack-distance" data-distance></span></span>
          <span class="snack-go">${I.fleche}</span>
        </a>
      </li>`).join('')}
    </ul>
  </section>
  <div class="choix-carte" id="carte-snacks">${carteSvg(r)}<p class="carte-legende">Échelle adoucie : les directions sont exactes, les distances sont resserrées.</p></div>
</main>
<script type="application/json" id="snacks-json">${JSON.stringify(SNACKS.map(({ id, nom, adresse, lat, lng, note }) => ({ id, nom, adresse, lat, lng, note })))}</script>`,
}]);

/* ---------------- 2. La carte d'un snack ---------------- */
const vignette = (i) => {
  const v = VIGNETTES[i.photo];
  return v ? `<img src="../photos/${i.photo}.webp" alt="${esc(i.n)}" width="${v.l}" height="${v.h}" loading="lazy" decoding="async">` : '';
};
const ligne = (i) => `
        <li class="plat${i.p == null ? ' plat-indispo' : ''}">
          <button type="button" class="plat-bouton" ${i.p == null ? 'disabled' : `data-plat="${i.id}"`} aria-label="${esc(i.n)}${i.p == null ? ' (prix à confirmer)' : ', ajouter'}">
            <span class="plat-photo">${vignette(i)}</span>
            <span class="plat-texte"><b>${esc(i.n)}</b>${i.d ? `<small>${esc(i.d)}</small>` : ''}</span>
            <span class="plat-bas"><span class="prix">${prix(i.p)}</span>${i.p == null ? '' : `<span class="plat-plus">${I.plus}</span>`}</span>
          </button>
        </li>`;

for (const s of SNACKS) {
  PAGES.push([s.id + '/', {
    titre: `Anas Grill ${s.nom} — Commande en ligne, formules à 10 €`,
    description: `Commandez chez Anas Grill ${s.nom} (${s.adresse}) : formules à 10 €, sandwichs, tacos, burgers. Livraison ou à emporter, paiement en ligne.`,
    classe: 'page-snack',
    schemas: [restaurantSchema(s)],
    scripts: ['commande.js'],
    corps: (r) => `
<header class="entete" data-entete>
  <div class="cadre entete-in">
    <a class="marque marque-petite" href="${r}" aria-label="Changer de restaurant">${LOGO}</a>
    <div class="entete-snack">
      <small>Ton restaurant</small>
      <b>${esc(s.nom)}</b>
    </div>
    <a class="entete-changer" href="${r}">Changer</a>
  </div>
  <nav class="onglets" aria-label="Catégories" data-onglets>
    <div class="onglets-in">${CARTE.map((c) => `<a href="#${c.id}">${esc(c.nom)}</a>`).join('')}</div>
  </nav>
</header>
<main id="contenu" class="snack-page" data-snack-id="${s.id}">
  <section class="bandeau">
    <div class="cadre bandeau-in">
      <h1>Anas Grill <span>${esc(s.nom)}</span></h1>
      <p>${I.pin} ${esc(s.adresse)} · <a href="tel:${s.tel.replace(/\s/g, '')}">${I.tel} ${esc(s.tel)}</a></p>
      <p class="bandeau-promo"><b>Formules à 10&nbsp;€</b> frites cheddar gruyère et boisson comprises</p>
    </div>
  </section>
  <div class="cadre carte" id="carte">
    ${CARTE.map((c) => `
    <section class="categorie" id="${c.id}">
      <h2>${esc(c.nom)}</h2>
      ${c.intro ? `<p class="categorie-intro">${esc(c.intro)}</p>` : ''}
      <ul class="plats">${c.items.map(ligne).join('')}
      </ul>
    </section>`).join('')}
  </div>
</main>

<button class="barre-panier" type="button" data-ouvrir-panier hidden><span class="barre-n" data-panier-n>0</span><span>Voir mon panier</span><b data-panier-total>0 €</b></button>
<div class="voile" data-voile hidden></div>
<section class="feuille" data-feuille aria-modal="true" role="dialog" aria-labelledby="feuille-titre" hidden></section>
<section class="tiroir" data-tiroir role="dialog" aria-modal="true" aria-label="Ma commande" hidden>
  <div class="tiroir-tete"><button type="button" class="tiroir-retour" data-retour aria-label="Retour" hidden>${I.fleche}</button><h2 data-tiroir-titre>Mon panier</h2><button type="button" class="tiroir-fermer" data-fermer aria-label="Fermer">×</button></div>
  <div class="etapes-barre" data-etapes><span>Panier</span><span>Infos</span><span>Paiement</span></div>
  <div class="tiroir-corps" data-tiroir-corps></div>
  <div class="tiroir-pied" data-tiroir-pied></div>
</section>
<section class="confirmation" data-confirmation hidden></section>
<p class="toast" data-toast role="status" aria-live="polite"></p>
<script type="application/json" id="anas-donnees">${JSON.stringify({ snack: s, snacks: SNACKS, carte: CARTE })}</script>`,
  }]);
}

PAGES.push(['mentions-legales/', { titre: 'Mentions légales — Anas Grill', description: 'Mentions légales du site Anas Grill.', classe: 'page-texte', corps: () => `
<main id="contenu" class="cadre etroit texte"><h1>Mentions légales</h1><p>[Raison sociale, SIRET et adresse de l’éditeur à compléter avec le client.]</p><h2>Hébergement</h2><p>[À compléter à la mise en ligne.]</p><h2>Crédits</h2><p>Visuels : Anas Grill. Réalisation : LocWeb.</p></main>` }]);
PAGES.push(['cgv/', { titre: 'Conditions générales de vente — Anas Grill', description: 'Conditions de vente des commandes en ligne Anas Grill.', classe: 'page-texte', corps: () => `
<main id="contenu" class="cadre etroit texte"><h1>Conditions générales de vente</h1><p>Projet à valider avec le client avant la mise en ligne.</p>
<h2>Paiement</h2><p>Le paiement s’effectue en ligne par carte bancaire au moment de la commande, sur une page sécurisée opérée par Stripe. La commande n’est transmise à la cuisine qu’une fois le paiement accepté.</p>
<h2>Livraison et retrait</h2><p>La livraison est assurée dans le rayon de chaque restaurant. L’heure annoncée est une estimation ; le livreur appelle le client à son arrivée.</p>
<h2>Rétractation</h2><p>Conformément à l’article L221-28 du Code de la consommation, le droit de rétractation ne s’applique pas aux denrées alimentaires susceptibles de se détériorer rapidement.</p>
<h2>Allergènes</h2><p>La liste des allergènes est disponible dans chaque restaurant et par téléphone.</p></main>` }]);

for (const [ch, o] of PAGES) {
  fs.mkdirSync(path.join(ICI, ch), { recursive: true });
  fs.writeFileSync(path.join(ICI, ch, 'index.html'), page(ch, o));
}
fs.writeFileSync(path.join(ICI, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${PAGES.filter(([c]) => !/mentions|cgv/.test(c)).map(([c]) => `  <url><loc>${abs(c)}</loc></url>`).join('\n')}\n</urlset>\n`);
fs.writeFileSync(path.join(ICI, 'robots.txt'), PROD ? `User-agent: *\nAllow: /\n\nSitemap: ${URL_SITE}sitemap.xml\n` : `# Apercu : pas d'indexation.\nUser-agent: *\nDisallow: /\n`);
fs.writeFileSync(path.join(ICI, '.nojekyll'), '');
console.log(`${PAGES.length} pages, ${SNACKS.length} snacks, ${CARTE.reduce((n, c) => n + c.items.length, 0)} plats — ${PROD ? 'PRODUCTION' : 'apercu'}`);
