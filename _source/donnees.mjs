// ===================================================================
//  Anas Grill — les snacks et la carte (LocWeb, 2026-10-14)
//  Snacks : Google Maps, fiches Google, Eat-List (cf. projet-8-snacks/
//  CAHIER-DES-CHARGES.md). Carte : les 4 panneaux affiches en boutique,
//  releves sur Eat-List (Pont-de-Cheruy), meme carte partout.
//  Ce qui manque (prix des signatures, boissons, desserts) est marque
//  « a confirmer » : rien d'invente.
// ===================================================================

// rayonKm : rayon de livraison par defaut, a fixer avec le client.
export const SNACKS = [
  { id: 'lyon-8', nom: 'Lyon 8', ville: 'Lyon 8e', adresse: '95 rue Villon, 69008 Lyon', tel: '07 53 59 38 91', lat: 45.7372664, lng: 4.8625766, note: '4,5', avis: 306 },
  { id: 'charpennes', nom: 'Charpennes', ville: 'Villeurbanne', adresse: '3 rue d’Inkermann, 69100 Villeurbanne', tel: '07 54 87 93 04', lat: 45.7704796, lng: 4.8659924, note: '4,6', avis: 161 },
  { id: 'la-duchere', nom: 'La Duchère', ville: 'Lyon 9e', adresse: '3 allée Victor Muhlstein, 69009 Lyon', tel: '06 63 29 79 47', lat: 45.7867347, lng: 4.7932779, note: '4,7', avis: 71 },
  { id: 'rillieux-la-pape', nom: 'Rillieux-la-Pape', ville: 'Rillieux-la-Pape', adresse: '3070 route de Strasbourg, 69140 Rillieux-la-Pape', tel: '06 59 26 08 96', lat: 45.8209225, lng: 4.8982348, note: '4,7', avis: 101 },
  { id: 'vaulx-en-velin', nom: 'Vaulx-en-Velin', ville: 'Vaulx-en-Velin', adresse: '18 avenue Eugène Hénaff, 69120 Vaulx-en-Velin', tel: '06 05 71 17 65', lat: 45.7742965, lng: 4.9277551, note: '4,4', avis: 24 },
  { id: 'venissieux', nom: 'Vénissieux', ville: 'Vénissieux', adresse: '61 boulevard Laurent Gérin, 69200 Vénissieux', tel: '07 53 91 82 47', lat: 45.7010038, lng: 4.8838309, note: '4,7', avis: 34 },
  { id: 'pont-de-cheruy', nom: 'Pont-de-Chéruy', ville: 'Pont-de-Chéruy', adresse: '42 rue Grammont, 38230 Pont-de-Chéruy', tel: '04 87 83 02 90', lat: 45.750686, lng: 5.170642, note: null, avis: 0 },
  { id: 'bourgoin-jallieu', nom: 'Bourgoin-Jallieu', ville: 'Bourgoin-Jallieu', adresse: '49 avenue Gambetta, 38300 Bourgoin-Jallieu', tel: '07 75 43 84 16', lat: 45.5886073, lng: 5.2727873, note: '4,6', avis: 246 },
].map((s) => ({ rayonKm: 5, ...s }));

/* ---------------- les groupes d'options, partages ---------------- */
const VIANDES = ['Steak', 'Merguez', 'Escalope', 'Tandoori', 'Curry', 'Tenders', 'Cordon bleu', 'Kebab'];
const SAUCES = ['Mayo', 'Ketchup', 'Burger', 'Blanche', 'Barbecue', 'Fish', 'Algérienne', 'Curry', 'Samouraï', 'Harissa', 'Gruyère', 'Brazil', 'Tartare', 'Andalouse'];
const SUPPLEMENTS = [['Emmental', 1], ['Kiri', 1], ['Cheddar', 1], ['Boursin', 1], ['Chakchouka', 1], ['Oignons crispy', 1], ['Bacon fumé', 1]];
const GRATINAGE = [['Emmental', 2], ['Raclette', 2], ['Cheddar', 2], ['Chèvre', 2], ['Mozza', 2]];
const o = (liste) => liste.map((x) => (Array.isArray(x) ? { n: x[0], p: x[1] } : { n: x, p: 0 }));

// Les ingredients qu'on peut retirer (« sans oignon »...), en petites tuiles.
// Tires des compositions des panneaux ; quand le panneau dit seulement
// « legumes au choix » ou ne detaille pas (cheese), liste a CONFIRMER
// avec le client (cahier, question menu).
const sans = (...n) => ({ id: 'retirer', type: 'retirer', titre: 'Ingrédients', aide: 'touche pour retirer', min: 0, max: n.length, options: n.map((x) => ({ n: x, p: 0 })) });

const G = {
  viande: { id: 'viande', titre: 'Viande au choix', min: 1, max: 1, options: o(VIANDES) },
  // Panneau : « Sandwichs +1 € : merguez, steak, tandoori, curry ; +2 € : tenders, cordon bleu, kebab ».
  viandeSandwich: { id: 'viande', titre: 'Viande au choix', min: 1, max: 1, options: o([['Escalope', 0], ['Steak', 1], ['Merguez', 1], ['Tandoori', 1], ['Curry', 1], ['Tenders', 2], ['Cordon bleu', 2], ['Kebab', 2]]) },
  sauces: { id: 'sauces', titre: 'Sauces', aide: 'jusqu’à 2', min: 0, max: 2, options: o(SAUCES) },
  supplements: { id: 'supplements', titre: 'Suppléments', min: 0, max: 8, options: o(SUPPLEMENTS) },
  gratinage: { id: 'gratinage', titre: 'Gratiné', min: 0, max: 1, options: o(GRATINAGE) },
  menu: { id: 'menu', titre: 'En menu ?', min: 1, max: 1, options: o([['Seul', 0], ['En menu (frites + boisson)', 3], ['En menu, frites cheddar', 4]]) },
  // « Viande en plus » du panneau (+2,50 €), mais en disant laquelle (Nicolas, 2026-10-15). Prix a confirmer.
  viande2: { id: 'viande2', titre: '2e viande ?', prefixe: '+ ', min: 0, max: 1, options: o(VIANDES.map((v) => [v, 2.5])) },
  maxi: { id: 'taille', titre: 'Taille', min: 1, max: 1, options: o([['Normal', 0], ['Maxi tacos', 3]]) },
};

/* ---------------- la carte ---------------- */
// photo : vignette decoupee dans les panneaux de la boutique (_source/vignettes.py).
export const CARTE = [
  {
    id: 'formules', nom: 'Formules à 10 €', intro: 'Frites cheddar gruyère et boisson comprises.',
    items: [
      { id: 'formule-classique', n: 'Le Classique', p: 10, photo: 'f-classique', d: 'Un sandwich à l’escalope (curry, tandoori ou paprika) et un burger brioché au steak ou au poisson, avec des frites cheddar gruyère et une boisson.', groupes: [
        { id: 'sandwich', titre: 'Le sandwich escalope', min: 1, max: 1, options: o(['Curry', 'Tandoori', 'Paprika']) },
        { id: 'burger', titre: 'Le burger brioché', min: 1, max: 1, options: o(['Steak', 'Fish']) }] },
      { id: 'formule-grill-wrap', n: 'Le Grill and Wrap', p: 10, photo: 'f-grill-wrap', d: 'Notre burger l’Anas Grill et un wrap au poulet, avec des frites cheddar gruyère et une boisson.' },
    ],
  },
  {
    id: 'formules-11', nom: 'Formules à 11 €', intro: 'Nos formules les plus gourmandes. Frites cheddar gruyère et boisson comprises.',
    items: [
      { id: 'formule-turkish', n: 'Le Turkish', p: 11, photo: 'f-turkish', d: 'Une galette kebab avec la sauce de ton choix et un cheese, avec des frites cheddar gruyère et une boisson.', groupes: [{ ...G.sauces, titre: 'Sauce de la galette', max: 1, aide: '' }] },
      { id: 'formule-mielleux', n: 'Le Mielleux', p: 11, photo: 'f-mielleux', d: 'Un burger chèvre-miel aux noix de pécan et un wrap poulet-chèvre, avec des frites cheddar gruyère et une boisson.' },
      { id: 'formule-crocs', n: 'Formule Crocs', p: 11, photo: 'f-crocs', d: 'Deux croc’s au bacon et deux cheeseburgers, avec des frites cheddar gruyère et une boisson.' },
      { id: 'formule-smash', n: 'Le Smash Grill', p: 11, photo: 'f-smash', d: 'Un smash burger double steak et un smash aux tenders, avec des frites cheddar gruyère et une boisson.' },
      { id: 'formule-algerien', n: 'L’Algérien', p: 11, photo: 'f-algerien', d: 'Deux burgers au pain matlouh, l’un au steak, l’autre à l’escalope, tous deux à la chakchouka. Avec des frites cheddar gruyère et une boisson.' },
      { id: 'formule-rolls', n: 'Rolls and Croc’s', p: 11, photo: 'f-rolls', d: 'Un roulé (steak, curry, tandoori ou paprika) et un croc’s, avec des frites cheddar gruyère et une boisson.', groupes: [
        { id: 'roule', titre: 'Le roulé', min: 1, max: 1, options: o(['Steak', 'Curry', 'Tandoori', 'Paprika']) }] },
      { id: 'formule-forestier', n: 'Le Forestier', p: 11, photo: 'f-forestier', d: 'Un sandwich forestier, un maxi brioché et un croc’s, avec des frites cheddar gruyère et une boisson.' },
      { id: 'formule-mexicain', n: 'Le Mexicain', p: 11, photo: 'f-mexicain', d: 'Deux fajitas bien relevées aux jalapeños, avec des frites cheddar gruyère et une boisson.' },
    ],
  },
  {
    id: 'composer', nom: 'À composer', intro: 'Choisis ta viande, tes sauces et tes suppléments. En menu avec frites et boisson : 3 € de plus, et 1 € pour passer aux frites cheddar.',
    items: [
      { id: 'sandwich', n: 'Sandwich', p: 6, photo: 'c-sandwich', d: 'Garni de la viande de ton choix, avec tes sauces préférées.', groupes: [G.viandeSandwich, G.viande2, sans('Salade', 'Tomate', 'Oignon'), G.sauces, G.supplements, G.gratinage, G.menu] },
      { id: 'tacos', n: 'Tacos', p: 7.5, photo: 'c-tacos', d: 'La viande de ton choix, du cheddar fondu et tes sauces, roulés dans une galette dorée.', groupes: [G.viande, G.viande2, G.maxi, G.sauces, G.supplements, G.menu] },
      { id: 'roule', n: 'Roulé classique', p: 7.5, photo: 'c-roule', d: 'La viande de ton choix et tes sauces, roulées dans une galette.', groupes: [G.viande, G.viande2, sans('Salade', 'Tomate', 'Oignon'), G.sauces, G.supplements, G.menu] },
    ],
  },
  {
    id: 'signatures', nom: 'Les signatures', intro: 'Nos recettes maison. Les prix arrivent bientôt.',
    items: [
      { id: 'sig-dz', n: 'Les DZ', p: null, photo: 's-dz', d: 'Steak, escalope, chakchouka et cheddar, relevés d’une sauce algérienne et d’une sauce gruyère, avec des frites.' },
      { id: 'sig-tajs', n: 'Les Tajs', p: null, photo: 's-tajs', d: 'Poulet tikka, Kiri, salade, tomate et cheddar, avec des frites, du piment pili-pili et une sauce gruyère.' },
      { id: 'sig-bollys', n: 'Les Bollys', p: null, photo: 's-bollys', d: 'Poulet au curry, Kiri et cheddar, avec des frites, une sauce curry et une sauce gruyère.' },
      { id: 'sig-forestiers', n: 'Les Forestiers', p: null, photo: 's-forestiers', d: 'Escalope à la sauce forestière et cheddar, nappés de sauce gruyère.' },
      { id: 'sig-savoyards', n: 'Les Savoyards', p: null, photo: 's-savoyards', d: 'Poulet, bacon et raclette, nappés de sauce gruyère.' },
      { id: 'sig-anas-food', n: 'Les Anas Food', p: null, photo: 's-anas-food', d: 'Steak, chakchouka et cheddar, avec la sauce de ton choix et une sauce gruyère.' },
    ],
  },
  {
    id: 'burgers', nom: 'Les burgers', intro: 'Prix du burger seul.',
    items: [
      { id: 'cheese', n: 'Cheese', p: 2.5, photo: 'b-cheese', groupes: [sans('Oignon', 'Cornichon', 'Cheddar')] },
      { id: 'double-cheese', n: 'Double cheese', p: 4, photo: 'b-double-cheese', groupes: [sans('Oignon', 'Cornichon', 'Cheddar')] },
      { id: 'triple-cheese-bacon', n: 'Triple cheese bacon', p: 6, photo: 'b-triple-cheese', groupes: [sans('Oignon', 'Cornichon', 'Cheddar', 'Bacon')] },
      { id: 'le-240', n: 'Le 240 brioché', p: 7.5, photo: 'b-240', d: 'Deux steaks et deux tranches de cheddar, avec la sauce et les légumes de ton choix.', groupes: [sans('Salade', 'Tomate', 'Oignon', 'Cornichon', 'Cheddar'), G.sauces] },
      { id: 'fish-brioche', n: 'Le Fish brioché', p: 5, photo: 'b-fish', d: 'Un filet de poisson pané, du cheddar, de la salade et une sauce au poisson, dans un pain brioché.', groupes: [sans('Salade', 'Cheddar', 'Sauce')] },
      { id: 'maxi-brioche', n: 'Le Maxi brioché', p: 5, photo: 'b-maxi', d: 'Steaks et cheddar dans un pain brioché, avec la sauce et les légumes de ton choix.', groupes: [sans('Salade', 'Tomate', 'Oignon', 'Cornichon', 'Cheddar'), G.sauces] },
      { id: 'chicken-brioche', n: 'Le Chicken brioché', p: 5, photo: 'b-chicken', d: 'Du poulet croustillant et du cheddar dans un pain brioché, avec la sauce et les légumes de ton choix.', groupes: [sans('Salade', 'Tomate', 'Oignon', 'Cornichon', 'Cheddar'), G.sauces] },
      { id: 'steak-house', n: 'Le Steak House', p: 7.5, photo: 'b-steak-house', d: 'Un steak, deux tranches de cheddar, des oignons croustillants et du bacon.', groupes: [sans('Oignon', 'Cheddar', 'Bacon')] },
      { id: 'chicken-house', n: 'Le Chicken House', p: 7.5, photo: 'b-chicken-house', d: 'Une escalope de poulet, deux tranches de cheddar, des oignons croustillants et du bacon.', groupes: [sans('Oignon', 'Cheddar', 'Bacon')] },
      { id: 'anas-grill', n: 'L’Anas Grill', p: 8, photo: 'b-anas-grill', d: 'Notre burger signature : steak, tenders, bacon et deux tranches de cheddar, avec la sauce et les légumes de ton choix.', groupes: [sans('Salade', 'Tomate', 'Oignon', 'Cheddar', 'Bacon'), G.sauces] },
      { id: 'naan-beef', n: 'Naan beef', p: 6, photo: 'b-naan-beef', d: 'Un steak, du gruyère, de la salade et du cheddar, dans un pain naan.', groupes: [sans('Salade', 'Cheddar', 'Gruyère')] },
      { id: 'naan-chicken', n: 'Naan chicken', p: 6, photo: 'b-naan-chicken', d: 'Du poulet, du gruyère, de la salade et du cheddar, dans un pain naan.', groupes: [sans('Salade', 'Cheddar', 'Gruyère')] },
      { id: 'naan-curry', n: 'Naan curry', p: 6, photo: 'b-naan-curry', d: 'Du poulet au curry, du Kiri, du gruyère, de la salade et du cheddar, dans un pain naan.', groupes: [sans('Salade', 'Cheddar', 'Gruyère', 'Kiri')] },
      { id: 'naan-tandoori', n: 'Naan tandoori', p: 6, photo: 'b-naan-tandoori', d: 'Du poulet tandoori, du Kiri, du gruyère, de la salade et du cheddar, dans un pain naan.', groupes: [sans('Salade', 'Cheddar', 'Gruyère', 'Kiri')] },
    ],
  },
];

/* ---------------- tout est personnalisable (Nicolas, 2026-10-15) ----------------
   Comme sur KSM : chaque plat ouvre sa fiche, avec les ingredients a
   retirer (salade, tomate, oignon partout, plus ceux du plat) et une
   carte « Sauces » qui deplie les sauces offertes. Listes A CONFIRMER
   avec le client (cahier, question « ingredients retirables »). */
const STO = ['Salade', 'Tomate', 'Oignon'];
const PERSO = {
  'formule-classique': ['Cheddar'], 'formule-grill-wrap': ['Cheddar', 'Bacon'], 'formule-turkish': ['Cornichon', 'Cheddar'],
  'formule-mielleux': [], 'formule-crocs': ['Cornichon', 'Cheddar', 'Bacon'], 'formule-smash': ['Cornichon', 'Cheddar'],
  'formule-algerien': ['Cheddar'], 'formule-rolls': ['Cheddar', 'Bacon'], 'formule-forestier': ['Cheddar'], 'formule-mexicain': ['Jalapeños', 'Cheddar'],
  sandwich: [], tacos: ['Cheddar'], roule: [],
  'sig-dz': ['Cheddar'], 'sig-tajs': ['Kiri', 'Cheddar', 'Piment'], 'sig-bollys': ['Kiri', 'Cheddar'], 'sig-forestiers': ['Cheddar'],
  'sig-savoyards': ['Bacon'], 'sig-anas-food': ['Cheddar'],
  cheese: ['Cornichon', 'Cheddar'], 'double-cheese': ['Cornichon', 'Cheddar'], 'triple-cheese-bacon': ['Cornichon', 'Cheddar', 'Bacon'],
  'le-240': ['Cornichon', 'Cheddar'], 'fish-brioche': ['Cheddar'], 'maxi-brioche': ['Cornichon', 'Cheddar'], 'chicken-brioche': ['Cornichon', 'Cheddar'],
  'steak-house': ['Oignons crispy', 'Cheddar', 'Bacon'], 'chicken-house': ['Oignons crispy', 'Cheddar', 'Bacon'], 'anas-grill': ['Cheddar', 'Bacon'],
  'naan-beef': ['Cheddar', 'Gruyère'], 'naan-chicken': ['Cheddar', 'Gruyère'], 'naan-curry': ['Kiri', 'Cheddar', 'Gruyère'], 'naan-tandoori': ['Kiri', 'Cheddar', 'Gruyère'],
};
const SAUCES_G = (max) => ({ id: 'sauces', type: 'sauces', titre: max === 1 ? 'Ta sauce' : 'Tes sauces', aide: max === 1 ? 'une, offerte' : 'jusqu’à 2, offertes', min: 0, max, options: o(SAUCES) });
for (const c of CARTE) for (const i of c.items) {
  const autres = (i.groupes || []).filter((g) => g.type !== 'retirer' && g.id !== 'sauces');
  const saucesAvant = (i.groupes || []).find((g) => g.id === 'sauces');
  const requis = autres.filter((g) => (g.min >= 1 || g.id === 'viande2') && g.id !== 'menu' && g.id !== 'taille');
  const reste = autres.filter((g) => !requis.includes(g));
  i.groupes = [...requis, sans(...STO, ...(PERSO[i.id] || [])), SAUCES_G(saucesAvant && saucesAvant.max === 1 ? 1 : 2), ...reste];
}

/* ---------------- les formules, element par element (Nicolas, 2026-10-15) ----------------
   « On sait pas si ca enleve du burger ou du sandwich » : chaque formule est
   decoupee en ses plats ; chacun a son bloc dans la fiche (son choix, ses
   ingredients, ses sauces) et le panier dit « Sandwich : sans oignon ». */
const P = (court, titre, ing, opts = {}) => ({ court, titre, ing, ...opts });
const choixDe = (titre, liste) => ({ titre, min: 1, max: 1, options: o(liste) });
const FORMULES = {
  'formule-classique': [P('Sandwich', 'Le sandwich escalope', [], { choix: choixDe('Assaisonnement', ['Curry', 'Tandoori', 'Paprika']) }),
    P('Burger', 'Le burger brioché', ['Cornichon', 'Cheddar'], { choix: choixDe('Viande', ['Steak', 'Fish']) })],
  'formule-grill-wrap': [P('Anas Grill', 'L’Anas Grill', ['Cheddar', 'Bacon']), P('Wrap', 'Le wrap poulet', ['Cheddar'])],
  'formule-turkish': [P('Galette', 'La galette kebab', [], { sauces: 1 }), P('Cheese', 'Le cheese', ['Cornichon', 'Cheddar'])],
  'formule-mielleux': [P('Burger', 'Le burger chèvre-miel', []), P('Wrap', 'Le wrap poulet-chèvre', [])],
  'formule-crocs': [P('Croc’s', 'Les deux croc’s bacon', ['Cheddar', 'Bacon']), P('Cheeseburgers', 'Les deux cheeseburgers', ['Cornichon', 'Cheddar'])],
  'formule-smash': [P('Smash steak', 'Le smash double steak', ['Cornichon', 'Cheddar']), P('Smash tenders', 'Le smash tenders', ['Cheddar'])],
  'formule-algerien': [P('Burger steak', 'Le burger matlouh steak', ['Cheddar']), P('Burger escalope', 'Le burger matlouh escalope', ['Cheddar'])],
  'formule-rolls': [P('Roulé', 'Le roulé', [], { choix: choixDe('Viande', ['Steak', 'Curry', 'Tandoori', 'Paprika']) }), P('Croc’s', 'Le croc’s', ['Cheddar', 'Bacon'])],
  'formule-forestier': [P('Forestier', 'Le sandwich forestier', ['Cheddar']), P('Maxi', 'Le maxi brioché', ['Cornichon', 'Cheddar']), P('Croc’s', 'Le croc’s', ['Cheddar', 'Bacon'])],
  'formule-mexicain': [P('Fajitas', 'Les deux fajitas', ['Jalapeños', 'Cheddar'])],
};
for (const c of CARTE) for (const i of c.items) {
  const parts = FORMULES[i.id]; if (!parts) continue;
  i.groupes = parts.flatMap((p, n) => {
    const tag = { partie: p.titre, court: p.court };
    return [
      ...(p.choix ? [{ id: 'choix-' + n, ...p.choix, ...tag }] : []),
      { ...sans(...STO, ...p.ing), id: 'retirer-' + n, ...tag },
      { ...SAUCES_G(p.sauces || 2), id: 'sauces-' + n, ...tag },
    ];
  });
}
