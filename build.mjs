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
const V = '10';
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

/* ---------------- La carte (Nicolas, 2026-10-14) ----------------
   « Tu as qu'a la designer, c'est mieux qu'une API », puis « faut qu'elle
   fasse reel ». Donc : les vrais traces OpenStreetMap (Rhone, Saone,
   canaux, lacs, autoroutes, grands axes), recuperes une fois par
   _source/carte_osm.py et dessines a nos couleurs, a l'echelle reelle.
   Aucune requete a l'affichage. Donnees (c) contributeurs OpenStreetMap. */
const FOND = JSON.parse(fs.readFileSync(path.join(ICI, '_source', 'carte-fond.json'), 'utf8'));
const CA = FOND.cadre;
const proj = (lat, lng) => [Math.round((lng - CA.O) / (CA.E - CA.O) * CA.W * 10) / 10, Math.round((CA.N - lat) / (CA.N - CA.S) * CA.H * 10) / 10];
// Communes sans snack, en repere discret (les snacks portent deja leur nom).
const REPERES = [['Lyon', 45.7605, 4.832, 'grande'], ['Caluire', 45.797, 4.846], ['Bron', 45.735, 4.914], ['Décines', 45.766, 4.96], ['Meyzieu', 45.768, 5.004], ['Saint-Priest', 45.692, 4.944], ['L’Isle-d’Abeau', 45.621, 5.226], ['Saint-Fons', 45.703, 4.852]];
// Ou poser le nom de chaque snack pour qu'ils ne se chevauchent pas.
const ETIQUETTE = { 'lyon-8': 'droite', charpennes: 'haut', 'la-duchere': 'haut', 'rillieux-la-pape': 'haut', 'vaulx-en-velin': 'droite', venissieux: 'bas', 'pont-de-cheruy': 'haut', 'bourgoin-jallieu': 'haut' };
function carteSvg(r) {
  const km = CA.W / ((CA.E - CA.O) * Math.cos(((CA.S + CA.N) / 2) * Math.PI / 180) * 111.32);
  const reperes = REPERES.map(([n, la, ln, cls]) => { const [x, y] = proj(la, ln); return `<text x="${x}" y="${y}" class="ville${cls ? ' ville-' + cls : ''}" text-anchor="middle">${esc(n)}</text>`; }).join('');
  const points = SNACKS.map((s) => {
    const [x, y] = proj(s.lat, s.lng), pos = ETIQUETTE[s.id] || 'haut';
    const t = pos === 'droite' ? `<text x="20" y="-8" class="marqueur-nom">${esc(s.nom)}</text>` : pos === 'bas' ? `<text y="22" text-anchor="middle" class="marqueur-nom">${esc(s.nom)}</text>` : `<text y="-32" text-anchor="middle" class="marqueur-nom">${esc(s.nom)}</text>`;
    return `<a href="${r}${s.id}/" class="marqueur" data-snack="${s.id}" aria-label="Anas Grill ${esc(s.nom)}"><g transform="translate(${x} ${y})"><g class="taille"><circle r="24" class="halo"/><path class="feu" d="M0-24c3.6 8 13.5 11 13.5 22.5a13.5 13.5 0 0 1-27 0c0-8 7-11 7-17 3 2.6 4 6.7 4 10C1.4-12 1.8-17.5 0-24z"/>${t}</g></g></a>`;
  }).join('');
  const D = FOND.d;
  return `<svg class="carte-svg" viewBox="0 0 ${CA.W} ${CA.H}" role="img" aria-label="Carte des restaurants Anas Grill" data-cadre='${JSON.stringify(CA)}'>
  <defs><radialGradient id="lueur" cx="28%" cy="38%" r="55%"><stop offset="0" stop-color="#ff7a00" stop-opacity=".16"/><stop offset="1" stop-color="#ff7a00" stop-opacity="0"/></radialGradient></defs>
  <rect width="${CA.W}" height="${CA.H}" class="terre"/><rect width="${CA.W}" height="${CA.H}" fill="url(#lueur)"/>
  <path d="${D.axe}" class="axe"/><path d="${D.autoroute}" class="autoroute"/>
  <path d="${D.eau}" class="eau"/><path d="${D.canal}" class="canal"/><path d="${D.fleuve}" class="fleuve"/>
  <g class="villes">${reperes}</g>
  <g class="vous" data-vous hidden><circle r="16" class="vous-halo"/><circle r="8" class="vous-point"/></g>
  <g class="marqueurs">${points}</g>
  <g transform="translate(${CA.W - 40 - 5 * km} ${CA.H - 34})" class="echelle"><path d="M0 0H${(5 * km).toFixed(1)}"/><path d="M0-5V5M${(5 * km).toFixed(1)}-5V5"/><text x="${(2.5 * km).toFixed(1)}" y="-10" text-anchor="middle">5 km</text></g>
</svg>`;
}
/* ---------------- 1. Choisis ton restaurant ---------------- */
const PAGES = [];
PAGES.push(['', {
  titre: 'Anas Grill — Commande en ligne · Lyon et Isère',
  description: `Commandez chez Anas Grill en ligne : sandwichs, tacos, burgers, formules à 10 €. ${SNACKS.length} restaurants à Lyon, Villeurbanne, Vénissieux, Vaulx-en-Velin, Rillieux, Bourgoin-Jallieu et Pont-de-Chéruy.`,
  classe: 'page-choix',
  scripts: ['choix.js'],
  // Arrivee (retour de Nicolas, 2026-10-14) : la carte reduite au minimum,
  // les restaurants en cartes, rien d'autre. Chaque mini-carte est une
  // image SVG statique (photos/carte-<id>.svg) : chargee a la demande,
  // mise en cache, aucun calcul dans la page.
  corps: (r) => `
<div class="braises" aria-hidden="true">${'<i></i>'.repeat(10)}</div>
<main id="contenu" class="arrivee">
  <section class="cadre arrivee-tete">
    <div class="arrivee-texte">
      <a class="marque marque-grande" href="./">${LOGO}</a>
      <h1>Choisis <span>ton restaurant</span></h1>
      <p>Livraison ou à emporter, payé en ligne, prêt à l’heure.</p>
      <div class="choix-actions">
        <button class="bouton bouton-feu" type="button" data-localiser>${I.cible} Le plus proche de moi</button>
        <form class="adresse-form" data-adresse-form autocomplete="off">
          <label class="sr" for="adresse-recherche">Ton adresse</label>
          <input id="adresse-recherche" name="adresse" placeholder="Ou tape ton adresse…" data-adresse-champ>
          <ul class="suggestions" data-suggestions hidden></ul>
        </form>
      </div>
      <p class="choix-note" data-choix-note aria-live="polite"></p>
    </div>
    <figure class="ensemble" aria-label="Les ${SNACKS.length} restaurants sur la carte">
      <img src="${r}photos/carte-ensemble.svg" alt="" width="${CA.W}" height="${CA.H}">
      ${SNACKS.map((s) => { const [x, y] = proj(s.lat, s.lng); return `<a class="point" data-snack="${s.id}" href="${r}${s.id}/" style="left:${(x / CA.W * 100).toFixed(2)}%;top:${(y / CA.H * 100).toFixed(2)}%" aria-label="Anas Grill ${esc(s.nom)}"><span>${esc(s.nom)}</span></a>`; }).join('')}
      <span class="point-vous" data-vous hidden></span>
      <figcaption>© les contributeurs OpenStreetMap</figcaption>
    </figure>
  </section>
  <section class="cadre">
    <ul class="restos" data-snacks>
      ${SNACKS.map((s, k) => `
      <li class="snack resto" data-snack="${s.id}" style="--i:${k}">
        <a href="${r}${s.id}/">
          <span class="resto-carte"><img src="${r}photos/carte-${s.id}.svg" alt="" width="2500" height="1560" loading="lazy" decoding="async"><span class="resto-pin" aria-hidden="true"></span></span>
          <span class="resto-corps">
            <small>Anas Grill</small>
            <b>${esc(s.nom)}</b>
            <span class="resto-adresse">${esc(s.adresse)}</span>
            <span class="resto-bas">${s.note ? `<span class="snack-note">${I.etoile}${s.note}<em>(${s.avis})</em></span>` : '<span class="snack-note snack-nouveau">Nouveau</span>'}<span class="snack-distance" data-distance></span><span class="resto-go">Commander ${I.fleche}</span></span>
          </span>
        </a>
      </li>`).join('')}
    </ul>
  </section>
</main>
<script type="application/json" id="snacks-json">${JSON.stringify({ cadre: CA, snacks: SNACKS.map(({ id, nom, adresse, lat, lng }) => ({ id, nom, adresse, lat, lng })) })}</script>`,
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
      <div class="bandeau-texte">
        <p class="ruban">Anas Grill</p>
        <h1>${esc(s.nom)}</h1>
        <ul class="infos-snack">
          <li>${I.pin}<span>${esc(s.adresse)}</span></li>
          <li>${I.tel}<a href="tel:${s.tel.replace(/\s/g, '')}">${esc(s.tel)}</a></li>
          <li>${I.sac}<span>À emporter · Livraison</span></li>
        </ul>
      </div>
      <a class="bandeau-promo" href="#formules">
        <img src="../photos/f-classique.webp" alt="" width="1200" height="720">
        <span><b>Formules à 10&nbsp;€</b>frites cheddar gruyère et boisson comprises</span>
      </a>
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
