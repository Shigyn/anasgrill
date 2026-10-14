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
const SUPPLEMENTS = [['Emmental', 1], ['Kiri', 1], ['Cheddar', 1], ['Boursin', 1], ['Chakchouka', 1], ['Oignons crispy', 1], ['Bacon fumé', 1], ['Viande en plus', 2.5]];
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
  maxi: { id: 'taille', titre: 'Taille', min: 1, max: 1, options: o([['Normal', 0], ['Maxi tacos', 3]]) },
};

/* ---------------- la carte ---------------- */
// photo : vignette decoupee dans les panneaux de la boutique (_source/vignettes.py).
export const CARTE = [
  {
    id: 'formules', nom: 'Formules à 10 €', intro: 'Frites cheddar gruyère et boisson comprises.',
    items: [
      { id: 'formule-classique', n: 'Le Classique', p: 10, photo: 'f-classique', d: 'Sandwich escalope curry, tandoori ou paprika + burger brioché steak ou fish + frites cheddar gruyère + boisson.', groupes: [
        { id: 'sandwich', titre: 'Le sandwich escalope', min: 1, max: 1, options: o(['Curry', 'Tandoori', 'Paprika']) },
        { id: 'burger', titre: 'Le burger brioché', min: 1, max: 1, options: o(['Steak', 'Fish']) }] },
      { id: 'formule-grill-wrap', n: 'Le Grill and Wrap', p: 10, photo: 'f-grill-wrap', d: '1 Anas Grill + 1 wrap chicken + frites cheddar gruyère + boisson.' },
    ],
  },
  {
    id: 'formules-11', nom: 'Formules à 11 €', intro: '10 € + 1 € : les formules gourmandes, frites cheddar gruyère et boisson comprises.',
    items: [
      { id: 'formule-turkish', n: 'Le Turkish', p: 11, photo: 'f-turkish', d: '1 galette kebab sauce au choix + 1 cheese + frites cheddar gruyère + boisson.', groupes: [{ ...G.sauces, titre: 'Sauce de la galette', max: 1, aide: '' }] },
      { id: 'formule-mielleux', n: 'Le Mielleux', p: 11, photo: 'f-mielleux', d: '1 burger chèvre miel noix de pécan + 1 wrap chicken chèvre + frites cheddar gruyère + boisson.' },
      { id: 'formule-crocs', n: 'Formule Crocs', p: 11, photo: 'f-crocs', d: '2 croc’s bacon + 2 cheeses + frites cheddar gruyère + boisson.' },
      { id: 'formule-smash', n: 'Le Smash Grill', p: 11, photo: 'f-smash', d: '1 smash double steak + 1 smash tenders + frites cheddar gruyère + boisson.' },
      { id: 'formule-algerien', n: 'L’Algérien', p: 11, photo: 'f-algerien', d: '1 burger matlouh steak chekchouka + 1 burger matlouh escalope chekchouka + frites cheddar gruyère + boisson.' },
      { id: 'formule-rolls', n: 'Rolls and Croc’s', p: 11, photo: 'f-rolls', d: '1 roulé (steak, curry, tandoori ou paprika) + 1 croc’s + frites cheddar gruyère + boisson.', groupes: [
        { id: 'roule', titre: 'Le roulé', min: 1, max: 1, options: o(['Steak', 'Curry', 'Tandoori', 'Paprika']) }] },
      { id: 'formule-forestier', n: 'Le Forestier', p: 11, photo: 'f-forestier', d: '1 sandwich forestier + 1 maxi brioché + 1 croc’s + frites cheddar gruyère + boisson.' },
      { id: 'formule-mexicain', n: 'Le Mexicain', p: 11, photo: 'f-mexicain', d: '2 hot fajitas + jalapeños + frites cheddar gruyère + boisson.' },
    ],
  },
  {
    id: 'composer', nom: 'À composer', intro: 'Choisissez la viande, les sauces, les suppléments. En menu : +3 € (frites + boisson), frites cheddar : +1 €.',
    items: [
      { id: 'sandwich', n: 'Sandwich', p: 6, photo: 'c-sandwich', d: 'Viande au choix, sauces au choix.', groupes: [G.viandeSandwich, sans('Salade', 'Tomate', 'Oignon'), G.sauces, G.supplements, G.gratinage, G.menu] },
      { id: 'tacos', n: 'Tacos', p: 7.5, photo: 'c-tacos', d: 'Viande au choix, cheddar automatique, sauces au choix.', groupes: [G.viande, G.maxi, G.sauces, G.supplements, G.menu] },
      { id: 'roule', n: 'Roulé classique', p: 7.5, photo: 'c-roule', d: 'Viande au choix, sauces au choix.', groupes: [G.viande, sans('Salade', 'Tomate', 'Oignon'), G.sauces, G.supplements, G.menu] },
    ],
  },
  {
    id: 'signatures', nom: 'Les signatures', intro: 'Nos recettes maison. Prix à confirmer avec le restaurant.',
    items: [
      { id: 'sig-dz', n: 'Les DZ', p: null, photo: 's-dz', d: 'Steak, escalope, chekchouka, cheddar, sauce algérienne, sauce gruyère, frites.' },
      { id: 'sig-tajs', n: 'Les Tajs', p: null, photo: 's-tajs', d: 'Poulet tikka, kiri, salade, tomate, frites, cheddar, pili pili, sauce gruyère.' },
      { id: 'sig-bollys', n: 'Les Bollys', p: null, photo: 's-bollys', d: 'Poulet curry, kiri, frites, cheddar, sauce curry, sauce gruyère.' },
      { id: 'sig-forestiers', n: 'Les Forestiers', p: null, photo: 's-forestiers', d: 'Escalope, sauce forestière, cheddar, sauce gruyère.' },
      { id: 'sig-savoyards', n: 'Les Savoyards', p: null, photo: 's-savoyards', d: 'Poulet, bacon, raclette, sauce gruyère.' },
      { id: 'sig-anas-food', n: 'Les Anas Food', p: null, photo: 's-anas-food', d: 'Steak, chekchouka, cheddar, sauce au choix, sauce gruyère.' },
    ],
  },
  {
    id: 'burgers', nom: 'Les burgers', intro: 'Prix du burger seul.',
    items: [
      { id: 'cheese', n: 'Cheese', p: 2.5, photo: 'b-cheese', groupes: [sans('Oignon', 'Cornichon', 'Cheddar')] },
      { id: 'double-cheese', n: 'Double cheese', p: 4, photo: 'b-double-cheese', groupes: [sans('Oignon', 'Cornichon', 'Cheddar')] },
      { id: 'triple-cheese-bacon', n: 'Triple cheese bacon', p: 6, photo: 'b-triple-cheese', groupes: [sans('Oignon', 'Cornichon', 'Cheddar', 'Bacon')] },
      { id: 'le-240', n: 'Le 240 brioché', p: 7.5, photo: 'b-240', d: '2 steaks, 2 cheddars, sauce et légumes au choix.', groupes: [sans('Salade', 'Tomate', 'Oignon', 'Cornichon', 'Cheddar'), G.sauces] },
      { id: 'fish-brioche', n: 'Le Fish brioché', p: 5, photo: 'b-fish', d: 'Filet de poisson, cheddar, salade, sauce fish.', groupes: [sans('Salade', 'Cheddar', 'Sauce')] },
      { id: 'maxi-brioche', n: 'Le Maxi brioché', p: 5, photo: 'b-maxi', d: 'Steaks, cheddar, sauce et légumes au choix.', groupes: [sans('Salade', 'Tomate', 'Oignon', 'Cornichon', 'Cheddar'), G.sauces] },
      { id: 'chicken-brioche', n: 'Le Chicken brioché', p: 5, photo: 'b-chicken', d: 'Poulet croustillant, cheddar, sauce et légumes au choix.', groupes: [sans('Salade', 'Tomate', 'Oignon', 'Cornichon', 'Cheddar'), G.sauces] },
      { id: 'steak-house', n: 'Le Steak House', p: 7.5, photo: 'b-steak-house', d: 'Steak, deux cheddar, oignons crispy, bacon.', groupes: [sans('Oignon', 'Cheddar', 'Bacon')] },
      { id: 'chicken-house', n: 'Le Chicken House', p: 7.5, photo: 'b-chicken-house', d: 'Tranche d’escalope, deux cheddar, oignons crispy, bacon.', groupes: [sans('Oignon', 'Cheddar', 'Bacon')] },
      { id: 'anas-grill', n: 'L’Anas Grill', p: 8, photo: 'b-anas-grill', d: 'Steak, tenders, bacon, 2 cheddars, sauce et légumes au choix.', groupes: [sans('Salade', 'Tomate', 'Oignon', 'Cheddar', 'Bacon'), G.sauces] },
      { id: 'naan-beef', n: 'Naan beef', p: 6, photo: 'b-naan-beef', d: 'Steak, gruyère, salade, cheddar.', groupes: [sans('Salade', 'Cheddar', 'Gruyère')] },
      { id: 'naan-chicken', n: 'Naan chicken', p: 6, photo: 'b-naan-chicken', d: 'Chicken, gruyère, salade, cheddar.', groupes: [sans('Salade', 'Cheddar', 'Gruyère')] },
      { id: 'naan-curry', n: 'Naan curry', p: 6, photo: 'b-naan-curry', d: 'Poulet jaune, kiri, gruyère, salade, cheddar.', groupes: [sans('Salade', 'Cheddar', 'Gruyère', 'Kiri')] },
      { id: 'naan-tandoori', n: 'Naan tandoori', p: 6, photo: 'b-naan-tandoori', d: 'Poulet rouge, kiri, gruyère, salade, cheddar.', groupes: [sans('Salade', 'Cheddar', 'Gruyère', 'Kiri')] },
    ],
  },
];
