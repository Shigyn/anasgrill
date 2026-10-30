// ===================================================================
//  Anas Grill — les snacks et la carte (LocWeb, 2026-10-14)
//  Snacks : Google Maps, fiches Google, Eat-List (cf. projet-8-snacks/
//  CAHIER-DES-CHARGES.md). Carte : les 4 panneaux affiches en boutique,
//  releves sur Eat-List (Pont-de-Cheruy), meme carte partout.
//  Ce qui manque (prix des signatures, boissons, desserts) est marque
//  « a confirmer » : rien d'invente.
// ===================================================================

// rayonKm : rayon de livraison par defaut, a fixer avec le client.
// Horaires : donnes par Hakim le 15/10 (tous 11 h - 1 h, Vaulx jusqu'a 4 h).
const HORAIRES = Object.fromEntries(['lyon-8', 'charpennes', 'la-duchere', 'rillieux-la-pape', 'vaulx-en-velin', 'venissieux', 'bourgoin-jallieu']
  .map((id) => [id, id === 'vaulx-en-velin' ? '11 h – 4 h' : '11 h – 1 h']));
export const SNACKS = [
  { id: 'lyon-8', nom: 'Lyon 8', ville: 'Lyon 8e', adresse: '95 rue Villon, 69008 Lyon', tel: '07 53 59 38 91', lat: 45.7372664, lng: 4.8625766, note: '4,5', avis: 306 },
  { id: 'charpennes', nom: 'Charpennes', ville: 'Villeurbanne', adresse: '3 rue d’Inkermann, 69100 Villeurbanne', tel: '07 54 87 93 04', lat: 45.7704796, lng: 4.8659924, note: '4,6', avis: 161 },
  { id: 'la-duchere', nom: 'La Duchère', ville: 'Lyon 9e', adresse: '3 allée Victor Muhlstein, 69009 Lyon', tel: '06 63 29 79 47', lat: 45.7867347, lng: 4.7932779, note: '4,7', avis: 71 },
  { id: 'rillieux-la-pape', nom: 'Rillieux-la-Pape', ville: 'Rillieux-la-Pape', adresse: '3070 route de Strasbourg, 69140 Rillieux-la-Pape', tel: '06 59 26 08 96', lat: 45.8209225, lng: 4.8982348, note: '4,7', avis: 101 },
  { id: 'vaulx-en-velin', nom: 'Vaulx-en-Velin', ville: 'Vaulx-en-Velin', adresse: '18 avenue Eugène Hénaff, 69120 Vaulx-en-Velin', tel: '06 05 71 17 65', lat: 45.7742965, lng: 4.9277551, note: '4,4', avis: 24 },
  { id: 'venissieux', nom: 'Vénissieux', ville: 'Vénissieux', adresse: '61 boulevard Laurent Gérin, 69200 Vénissieux', tel: '07 53 91 82 47', lat: 45.7010038, lng: 4.8838309, note: '4,7', avis: 34 },
  // Pont-de-Cheruy retire le 16/10 : ce snack n'existe pas (Hakim).
  { id: 'bourgoin-jallieu', nom: 'Bourgoin-Jallieu', ville: 'Bourgoin-Jallieu', adresse: '49 avenue Gambetta, 38300 Bourgoin-Jallieu', tel: '07 75 43 84 16', lat: 45.5886073, lng: 5.2727873, note: '4,6', avis: 246 },
].map((s) => ({ rayonKm: 5, horaires: HORAIRES[s.id] || null, ouverture: 11, fermeture: s.id === 'vaulx-en-velin' ? 4 : 1, ...s }));

/* ---------------- les groupes d'options, partages ---------------- */
const VIANDES = ['Steak', 'Merguez', 'Escalope', 'Tandoori', 'Curry', 'Tenders', 'Cordon bleu', 'Kebab'];
const SAUCES = ['Mayo', 'Ketchup', 'Burger', 'Blanche', 'Barbecue', 'Fish', 'Algérienne', 'Curry', 'Samouraï', 'Harissa', 'Gruyère', 'Brazil', 'Tartare', 'Andalouse', 'Moutarde'];
const SUPPLEMENTS = [['Emmental', 1], ['Kiri', 1], ['Cheddar', 1], ['Boursin', 1], ['Chakchouka', 1], ['Oignons crispy', 1], ['Bacon fumé', 1]];
const GRATINAGE = [['Emmental', 2], ['Raclette', 2], ['Cheddar', 2], ['Chèvre', 2], ['Mozza', 2]];
// Roules et tacos (Hakim, 21/10) : « emmental ou raclette ou cheddar, +2 € ».
const GRATINAGE_RT = [['Emmental', 2], ['Raclette', 2], ['Cheddar', 2]];
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
  gratineRT: { id: 'gratinage', titre: 'Gratiné', min: 0, max: 1, options: o(GRATINAGE_RT) },
  menu: { id: 'menu', titre: 'En menu ?', min: 1, max: 1, options: o([['Seul', 0], ['En menu (frites + boisson)', 3], ['En menu, frites cheddar', 4]]) },
  // « Viande en plus » du panneau (+2,50 €), mais en disant laquelle (Nicolas, 2026-10-15). Prix a confirmer.
  viande2: { id: 'viande2', titre: '2e viande ?', prefixe: '+ ', min: 0, max: 1, options: o(VIANDES.map((v) => [v, 2.5])) },
  maxi: { id: 'taille', titre: 'Taille', min: 1, max: 1, options: o([['Normal (1 viande)', 0], ['Maxi (2 viandes)', 3]]) },
  // Dans le maxi, la 2e viande est comprise : obligatoire et sans supplement.
  viande2Tacos: { id: 'viande2', titre: '2e viande ?', prefixe: '+ ', min: 0, max: 1, options: o(VIANDES.map((v) => [v, 2.5])), inclusSi: { groupe: 'taille', option: 'Maxi (2 viandes)' } },
};

// Chaque signature existe en 4 formats (panneau « Les signatures ») :
// burger 7 EUR, sandwich 7,50 EUR, roule 8,50 EUR, tacos 8,50 EUR (Hakim, 15/10).
const FORMAT_SIG = { id: 'format', titre: 'Ton format', min: 1, max: 1, options: o([['Burger', 0], ['Sandwich', 0.5], ['Roulé', 1.5], ['Tacos', 1.5]]) };

/* ---------------- la carte ---------------- */
// photo : vignette decoupee dans les panneaux de la boutique (_source/vignettes.py).
export const CARTE = [
  // Les formules du panneau envoye par Hakim le 16/10 (10, 11, 12 et 15 EUR).
  // Chaque formule : 2 plats (ou plus), frites OU potatoes cheddar gruyere, 1 boisson.
  {
    id: 'formules', nom: 'Formules à 10 €', intro: 'Frites ou potatoes cheddar gruyère et boisson comprises.',
    items: [
      { id: 'formule-classique', n: 'Le Classique', p: 10, photo: 'f-classique', d: 'Un sandwich à l’escalope (curry, tandoori ou paprika) et un burger brioché au steak ou au poisson, avec des frites ou potatoes cheddar gruyère et une boisson.' },
      { id: 'formule-giant', n: 'Giant and Big', p: 10, photo: 'f-giant', d: 'Un Big Max et un Giant, avec des frites ou potatoes cheddar gruyère et une boisson.' },
      { id: 'formule-rolls-burger', n: 'Rolls and Burger', p: 10, photo: 'f-rolls-burger', d: 'Une galette au steak ou à l’escalope et un burger au steak ou au chicken, avec des frites ou potatoes cheddar gruyère et une boisson.' },
      { id: 'formule-grill-wrap', n: 'Le Grill and Wrap', p: 10, photo: 'f-grill-wrap', d: 'Notre burger l’Anas Grill et un wrap au poulet, avec des frites ou potatoes cheddar gruyère et une boisson.' },
    ],
  },
  {
    id: 'formules-12', nom: 'Formules à 12 €', intro: 'Frites ou potatoes cheddar gruyère et boisson comprises.',
    items: [
      { id: 'formule-smash', n: 'Smash Grill', p: 12, photo: 'f-smash', d: 'Un smash burger double steak et un smash aux tenders, avec des frites ou potatoes cheddar gruyère et une boisson.' },
      { id: 'formule-turkish', n: 'Le Turkish', p: 12, photo: 'f-turkish', d: 'Une galette kebab avec la sauce de ton choix et un cheese, avec des frites ou potatoes cheddar gruyère et une boisson.', groupes: [{ ...G.sauces, titre: 'Sauce de la galette', max: 1, aide: '' }] },
      { id: 'formule-mielleux', n: 'Le Mielleux', p: 12, photo: 'f-mielleux', d: 'Un burger chèvre-miel aux noix de pécan et un wrap poulet-chèvre, avec des frites ou potatoes cheddar gruyère et une boisson.' },
      { id: 'formule-crocs', n: 'Formule Crocs', p: 12, photo: 'f-crocs', d: 'Deux croc’s au bacon et deux cheeseburgers, avec des frites ou potatoes cheddar gruyère et une boisson.' },
      { id: 'formule-rolls', n: 'Rolls and Croc’s', p: 12, photo: 'f-rolls', d: 'Un roulé (steak, curry, tandoori ou paprika) et un croc’s, avec des frites ou potatoes cheddar gruyère et une boisson.', groupes: [
        { id: 'roule', titre: 'Le roulé', min: 1, max: 1, options: o(['Steak', 'Curry', 'Tandoori', 'Paprika']) }] },
      { id: 'formule-forestier', n: 'Le Forestier', p: 12, photo: 'f-forestier', d: 'Un sandwich forestier, un maxi brioché et un croc’s, avec des frites ou potatoes cheddar gruyère et une boisson.' },
      { id: 'formule-mexicain', n: 'Le Mexicain', p: 12, photo: 'f-mexicain', d: 'Deux fajitas bien relevées aux jalapeños, avec des frites ou potatoes cheddar gruyère et une boisson.' },
      { id: 'formule-crousty', n: 'Crousty', p: 12, photo: 'f-crousty', d: 'Deux burgers crousty ou un tacos crousty, avec des frites ou potatoes cheddar gruyère et une boisson.' },
      { id: 'formule-double-rolls', n: 'Double Rolls', p: 12, photo: 'f-double-rolls', d: 'Un rolls au steak et un rolls à l’escalope, avec des frites ou potatoes cheddar gruyère et une boisson.' },
      { id: 'formule-rolls-dwich', n: 'Rolls and Dwich', p: 12, photo: 'f-rolls-dwich', d: 'Un rolls (escalope, curry, tandoori ou steak) et un sandwich, avec des frites ou potatoes cheddar gruyère et une boisson.' },
      { id: 'formule-algerien', n: 'L’Algérien', p: 12, photo: 'f-algerien', d: 'Deux burgers au pain matlouh à la chakchouka, l’un au steak, l’autre à l’escalope, avec des frites ou potatoes cheddar gruyère et une boisson.' },
    ],
  },
  {
    id: 'formules-15', nom: 'Formules à 15 €', intro: 'Les maxi. Frites ou potatoes cheddar gruyère et boisson comprises.',
    items: [
      { id: 'formule-maxi-tacos', n: 'Maxi Tacos', p: 15, photo: 'f-maxi-tacos', d: 'Un maxi tacos sans légumes (escalope, escalope curry, escalope tandoori ou steak) et un maxi brioché ou chicken brioché, avec des frites ou potatoes cheddar gruyère et une boisson.' },
      { id: 'formule-maxi-sandwich', n: 'Maxi Sandwich', p: 15, photo: 'f-maxi-sandwich', d: 'Un maxi sandwich (escalope, escalope curry, escalope tandoori ou steak) et un maxi brioché ou chicken brioché, avec des frites ou potatoes cheddar gruyère et une boisson.' },
      { id: 'formule-street', n: 'Street', p: 15, photo: 'f-street', d: 'Deux wraps chicken, 5 wings et 3 tenders, avec des frites ou potatoes cheddar gruyère et une boisson.' },
    ],
  },
  {
    id: 'composer', nom: 'À composer', intro: 'Choisis ta viande, tes sauces et tes suppléments. En menu avec frites et boisson : 3 € de plus, et 1 € pour passer aux frites cheddar.',
    items: [
      { id: 'sandwich', n: 'Sandwich', p: 6, photo: 'c-sandwich', d: 'Garni de la viande de ton choix, avec tes sauces préférées.', groupes: [G.viandeSandwich, G.viande2, sans('Salade', 'Tomate', 'Oignon'), G.sauces, G.supplements, G.gratinage, G.menu] },
      { id: 'tacos', n: 'Tacos', p: 7.5, photo: 'c-tacos', d: 'La viande de ton choix, du cheddar fondu et tes sauces, roulés dans une galette dorée. Sans légumes.', groupes: [G.viande, G.maxi, G.viande2Tacos, G.sauces, G.supplements, G.gratineRT, G.menu] },
      { id: 'roule', n: 'Roulé classique', p: 7.5, photo: 'c-roule', d: 'La viande de ton choix et tes sauces, roulées dans une galette.', groupes: [G.viande, G.viande2, sans('Salade', 'Tomate', 'Oignon'), G.sauces, G.supplements, G.gratineRT, G.menu] },
    ],
  },
  {
    id: 'signatures', nom: 'Les signatures', intro: 'Nos recettes maison, en burger, sandwich, roulé ou tacos.',
    items: [
      { id: 'sig-dz', n: 'Les DZ', p: 7, des: true, groupes: [FORMAT_SIG], photo: 's-dz', d: 'Steak, escalope, chakchouka et cheddar, relevés d’une sauce algérienne et d’une sauce gruyère, avec des frites.' },
      { id: 'sig-tajs', n: 'Les Tajs', p: 7, des: true, groupes: [FORMAT_SIG], photo: 's-tajs', d: 'Poulet tikka, Kiri, salade, tomate et cheddar, avec des frites, du piment pili-pili et une sauce gruyère.' },
      { id: 'sig-bollys', n: 'Les Bollys', p: 7, des: true, groupes: [FORMAT_SIG], photo: 's-bollys', d: 'Poulet au curry, Kiri et cheddar, avec des frites, une sauce curry et une sauce gruyère.' },
      { id: 'sig-forestiers', n: 'Les Forestiers', p: 7, des: true, groupes: [FORMAT_SIG], photo: 's-forestiers', d: 'Escalope à la sauce forestière et cheddar, nappés de sauce gruyère.' },
      { id: 'sig-savoyards', n: 'Les Savoyards', p: 7, des: true, groupes: [FORMAT_SIG], photo: 's-savoyards', d: 'Poulet, bacon et raclette, nappés de sauce gruyère.' },
      { id: 'sig-anas-food', n: 'Les Anas Food', p: 7, des: true, groupes: [FORMAT_SIG], photo: 's-anas-food', d: 'Steak, chakchouka et cheddar, avec la sauce de ton choix et une sauce gruyère.' },
      // 2e panneau des signatures, envoye par Hakim le 15/10.
      { id: 'sig-effiloches', n: 'Les Effilochés', p: 7, des: true, groupes: [FORMAT_SIG], photo: 's-effiloches', d: 'Effiloché de bœuf, cheddar et bacon, avec une sauce gruyère, des frites, la sauce et les légumes de ton choix.' },
      { id: 'sig-keftas', n: 'Les Keftas', p: 7, des: true, groupes: [FORMAT_SIG], photo: 's-keftas', d: 'Bœuf assaisonné et cheddar, avec une sauce gruyère, des frites, la sauce et les légumes de ton choix.' },
      { id: 'sig-bresiliens', n: 'Les Brésiliens', p: 7, des: true, groupes: [FORMAT_SIG], photo: 's-bresiliens', d: 'Steak, salade, Boursin, bacon et cheddar, avec une sauce brazil et une sauce gruyère.' },
      { id: 'sig-normands', n: 'Les Normands', p: 7, des: true, groupes: [FORMAT_SIG], photo: 's-normands', d: 'Poulet, tranche de jambon de dinde, salade, oignons crispy et frites, avec une sauce Boursin et une sauce fromagère maison.' },
    ],
  },
  // 20/10 : sandwichs et roules des photos du graphiste. PRIX A CONFIRMER par Hakim.
  {
    id: 'sandwichs', nom: 'Les sandwichs', intro: 'Garni et prêt à partir. En menu avec frites et boisson : 3 € de plus.',
    items: [
      { id: 'bavette', n: 'La Bavette', p: 7.5, seulement: ['lyon-8', 'vaulx-en-velin'], photo: 'sw-bavette', d: 'Des tranches de bavette, du cheddar, une sauce fromagère, de la salade et de la tomate.', groupes: [G.menu] },
    ],
  },
  {
    id: 'roules', nom: 'Les roulés', intro: 'Dans une grande galette. En menu avec frites et boisson : 3 € de plus.',
    items: [
      { id: 'roule-buffalo', n: 'Le Buffalo', p: 8, photo: 'r-buffalo', d: 'Du steak, des bouchées de fromage panées, du cheddar et une sauce crémeuse.', groupes: [G.gratineRT, G.menu] },
      { id: 'roule-rio', n: 'Le Rio', p: 8, photo: 'r-rio', d: 'Du poulet pané, du jambon de dinde, du fromage fondu et une sauce blanche aux herbes.', groupes: [G.gratineRT, G.menu] },
      { id: 'roule-suisse', n: 'Le Suisse', p: 8, photo: 'r-suisse', d: 'Du poulet grillé, du jambon de dinde et de la raclette fondue.', groupes: [G.gratineRT, G.menu] },
    ],
  },
  {
    id: 'a-grignoter', nom: 'À grignoter', intro: 'Pour accompagner, ou pour les petites faims.',
    items: [
      { id: 'bouchees-camembert', n: 'Bouchées camembert', p: 4.5, photo: 'g-camembert', d: '5 bouchées de camembert panées et croustillantes.' },
      { id: 'gr-tenders', n: 'Tenders', p: 3.5, photo: 'g-tenders', d: '3 tenders de poulet croustillants.' },
      { id: 'gr-nuggets', n: 'Nuggets', p: 4, photo: 'g-nuggets', d: '5 nuggets de poulet.' },
    ],
  },
  {
    id: 'menu-enfant', nom: 'Menu enfant', intro: 'Avec des frites et un Capri-Sun.',
    items: [
      { id: 'enfant-cheese', n: 'Menu enfant cheese', p: 5, photo: 'e-cheese', d: 'Un cheese, des frites et un Capri-Sun.' },
      { id: 'enfant-nuggets', n: 'Menu enfant nuggets', p: 5, photo: 'e-nuggets', d: 'Des nuggets, des frites et un Capri-Sun.' },
    ],
  },
  {
    id: 'burgers', nom: 'Les burgers', intro: 'Prix du burger seul.',
    items: [
      { id: 'cheese', n: 'Cheese', p: 2.5, photo: 'b-cheese', groupes: [sans('Oignon', 'Cornichon', 'Cheddar')] },
      { id: 'double-cheese', n: 'Double cheese', p: 4, photo: 'b-double-cheese', groupes: [sans('Oignon', 'Cornichon', 'Cheddar')] },
      { id: 'triple-cheese-bacon', n: 'Triple cheese bacon', p: 6, photo: 'b-triple-cheese', groupes: [sans('Oignon', 'Cornichon', 'Cheddar', 'Bacon')] },
      // 20/10 : produits des photos du graphiste (sa carte Uber Eats). PRIX A CONFIRMER par Hakim.
      { id: 'triple-cheese', n: 'Triple cheese', p: 5, photo: 'b-triple-cheese-nature', d: 'Trois steaks, trois tranches de cheddar, des cornichons et des oignons.' },
      { id: 'quadruple-cheese', n: 'Quadruple cheese', p: 7, photo: 'b-quadruple-cheese', d: 'Quatre steaks, quatre tranches de cheddar, des cornichons et des oignons.' },
      { id: 'big-grill', n: 'Le Big Grill', p: 6, photo: 'b-big-grill', d: 'Deux steaks, deux tranches de cheddar et des oignons dans un pain au sésame à trois étages, avec la sauce de ton choix.' },
      { id: 'boursin', n: 'Le Boursin', p: 5.5, photo: 'b-boursin', d: 'Un steak, du cheddar, des cornichons et une sauce au Boursin, dans un pain brioché.' },
      { id: 'fish', n: 'Le Fish', p: 3.5, photo: 'b-fish-classique', d: 'Un filet de poisson pané, du cheddar et une sauce tartare.' },
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
// Ce qu'il y a VRAIMENT dans chaque plat (description du panneau + visuels du
// client), et rien d'autre : pas de salade dans un croc's ni dans un tacos
// (Nicolas, 2026-10-15). « Legumes au choix » = salade, tomate, oignon.
const LEG = ['Salade', 'Tomate', 'Oignon'];
const PERSO = {
  sandwich: [...LEG], tacos: ['Cheddar'], roule: [...LEG],
  'sig-dz': ['Cheddar'], 'sig-tajs': ['Salade', 'Tomate', 'Kiri', 'Cheddar', 'Piment'], 'sig-bollys': ['Kiri', 'Cheddar'], 'sig-forestiers': ['Cheddar'],
  'sig-savoyards': ['Bacon'], 'sig-anas-food': ['Cheddar'],
  'sig-effiloches': [...LEG, 'Cheddar', 'Bacon'], 'sig-keftas': [...LEG, 'Cheddar'], 'sig-bresiliens': ['Salade', 'Bacon', 'Cheddar'], 'sig-normands': ['Salade', 'Oignons crispy'],
  'enfant-cheese': ['Oignon', 'Cornichon', 'Cheddar'],
  cheese: ['Oignon', 'Cornichon', 'Cheddar'], 'double-cheese': ['Oignon', 'Cornichon', 'Cheddar'], 'triple-cheese-bacon': ['Oignon', 'Cornichon', 'Cheddar', 'Bacon'],
  'le-240': [...LEG, 'Cornichon', 'Cheddar'], 'fish-brioche': ['Salade', 'Cheddar'], 'maxi-brioche': [...LEG, 'Cornichon', 'Cheddar'], 'chicken-brioche': [...LEG, 'Cornichon', 'Cheddar'],
  'steak-house': ['Oignons crispy', 'Cheddar', 'Bacon'], 'chicken-house': ['Oignons crispy', 'Cheddar', 'Bacon'], 'anas-grill': [...LEG, 'Cheddar', 'Bacon'],
  'triple-cheese': ['Oignon', 'Cornichon', 'Cheddar'], 'quadruple-cheese': ['Oignon', 'Cornichon', 'Cheddar'], 'big-grill': ['Oignon', 'Cheddar'],
  boursin: ['Cornichon', 'Cheddar'], fish: ['Cheddar'],
  suedois: ['Salade', 'Tomate', 'Cheddar'], veaudais: [...LEG, 'Cheddar'], bavette: ['Salade', 'Tomate', 'Cheddar'],
  'roule-buffalo': ['Cheddar'], 'roule-rio': ['Fromage'], 'roule-suisse': ['Raclette'],
  'naan-beef': ['Salade', 'Cheddar', 'Gruyère'], 'naan-chicken': ['Salade', 'Cheddar', 'Gruyère'], 'naan-curry': ['Salade', 'Kiri', 'Cheddar', 'Gruyère'], 'naan-tandoori': ['Salade', 'Kiri', 'Cheddar', 'Gruyère'],
};
// A grignoter et menus enfant : une sauce offerte, 1 EUR la sauce en plus.
const UNE_SAUCE = ['bouchees-camembert', 'gr-tenders', 'gr-nuggets', 'enfant-cheese', 'enfant-nuggets'];
const SAUCES_G = (max) => ({ id: 'sauces', type: 'sauces', titre: max === 1 ? 'Ta sauce' : 'Tes sauces', aide: max === 1 ? 'une, offerte' : 'jusqu’à 2, offertes', min: 0, max, options: o(SAUCES) });
// Une offerte, puis 1 EUR la sauce en plus (jusqu'a 3).
const SAUCES_PAYANTES = () => ({ ...SAUCES_G(3), titre: 'Tes sauces', aide: '1 offerte, 1 € la sauce en plus', offertes: 1, prixSup: 1 });
for (const c of CARTE) for (const i of c.items) {
  const autres = (i.groupes || []).filter((g) => g.type !== 'retirer' && g.id !== 'sauces');
  const saucesAvant = (i.groupes || []).find((g) => g.id === 'sauces');
  const requis = autres.filter((g) => (g.min >= 1 || g.id === 'viande2') && g.id !== 'menu');
  const reste = autres.filter((g) => !requis.includes(g));
  i.groupes = [...requis, ...((PERSO[i.id] || []).length ? [sans(...PERSO[i.id])] : []), (UNE_SAUCE.includes(i.id) ? SAUCES_PAYANTES() : SAUCES_G(saucesAvant && saucesAvant.max === 1 ? 1 : 2)), ...reste];
}

/* ---------------- les formules, element par element (Nicolas, 2026-10-15) ----------------
   « On sait pas si ca enleve du burger ou du sandwich » : chaque formule est
   decoupee en ses plats ; chacun a son bloc dans la fiche (son choix, ses
   ingredients, ses sauces) et le panier dit « Sandwich : sans oignon ». */
const P = (court, titre, ing, opts = {}) => ({ court, titre, ing, ...opts });
const choixDe = (titre, liste) => ({ titre, min: 1, max: 1, options: o(liste) });
const VIANDES_MAXI = ['Escalope', 'Escalope curry', 'Escalope tandoori', 'Steak'];
const FORMULES = {
  'formule-classique': [P('Sandwich', 'Le sandwich escalope', [...LEG], { choix: choixDe('Assaisonnement', ['Curry', 'Tandoori', 'Paprika']) }),
    P('Burger', 'Le burger brioché', [...LEG, 'Cheddar'], { choix: choixDe('Viande', ['Steak', 'Fish']) })],
  'formule-giant': [P('Big Max', 'Le Big Max', [...LEG, 'Cornichon', 'Cheddar']), P('Giant', 'Le Giant', [...LEG, 'Cheddar'])],
  'formule-rolls-burger': [P('Galette', 'La galette', [...LEG], { choix: choixDe('Viande', ['Steak', 'Escalope']) }),
    P('Burger', 'Le burger', [...LEG, 'Cheddar'], { choix: choixDe('Viande', ['Steak', 'Chicken']) })],
  'formule-smash': [P('Smash steak', 'Le smash double steak', [...LEG, 'Cornichon', 'Oignons crispy', 'Cheddar']), P('Smash tenders', 'Le smash tenders', [...LEG, 'Cheddar'])],
  'formule-crousty': [P('Crousty', 'Le crousty', ['Salade', 'Cheddar'], { choix: choixDe('Au choix', ['2 burgers crousty', '1 tacos crousty']) })],
  'formule-double-rolls': [P('Rolls steak', 'Le rolls steak', [...LEG]), P('Rolls escalope', 'Le rolls escalope', [...LEG])],
  'formule-rolls-dwich': [P('Rolls', 'Le rolls', [...LEG], { choix: choixDe('Viande', ['Escalope', 'Curry', 'Tandoori', 'Steak']) }),
    P('Sandwich', 'Le sandwich', [...LEG], { choix: choixDe('Viande', ['Escalope', 'Curry', 'Tandoori', 'Steak']) })],
  'formule-algerien': [P('Burger steak', 'Le burger matlouh steak', [...LEG]), P('Burger escalope', 'Le burger matlouh escalope', [...LEG])],
  'formule-maxi-tacos': [P('Maxi tacos', 'Le maxi tacos', ['Cheddar'], { choix: choixDe('Viande', VIANDES_MAXI) }),
    P('Burger', 'Le burger', [...LEG, 'Cornichon', 'Cheddar'], { choix: choixDe('Au choix', ['Maxi brioché', 'Chicken brioché']) })],
  'formule-maxi-sandwich': [P('Maxi sandwich', 'Le maxi sandwich', [...LEG], { choix: choixDe('Viande', VIANDES_MAXI) }),
    P('Burger', 'Le burger', [...LEG, 'Cornichon', 'Cheddar'], { choix: choixDe('Au choix', ['Maxi brioché', 'Chicken brioché']) })],
  'formule-street': [P('Wraps', 'Les deux wraps chicken', [...LEG, 'Cheddar']), P('Wings et tenders', 'Les 5 wings et 3 tenders', [])],
  // Les formules d'avant, gardees a cote des nouvelles (Nicolas, 17/10).
  'formule-grill-wrap': [P('Anas Grill', 'L’Anas Grill', [...LEG, 'Cheddar', 'Bacon']), P('Wrap', 'Le wrap poulet', [...LEG, 'Cheddar'])],
  'formule-turkish': [P('Galette', 'La galette kebab', [...LEG], { sauces: 1 }), P('Cheese', 'Le cheese', ['Salade', 'Tomate', 'Cornichon', 'Cheddar'])],
  'formule-mielleux': [P('Burger', 'Le burger chèvre-miel', [...LEG]), P('Wrap', 'Le wrap poulet-chèvre', ['Salade', 'Oignon'])],
  'formule-crocs': [P('Croc’s', 'Les deux croc’s bacon', ['Bacon'], { sauces: 0 }), P('Cheeseburgers', 'Les deux cheeseburgers', ['Salade', 'Tomate', 'Cheddar'])],
  'formule-rolls': [P('Roulé', 'Le roulé', [...LEG], { choix: choixDe('Viande', ['Steak', 'Curry', 'Tandoori', 'Paprika']) }), P('Croc’s', 'Le croc’s', [], { sauces: 0, info: 'Jambon et fromage fondu, servi tel quel.' })],
  'formule-forestier': [P('Forestier', 'Le sandwich forestier', ['Salade']), P('Maxi', 'Le maxi brioché', [...LEG, 'Cheddar']), P('Croc’s', 'Le croc’s', [], { sauces: 0, info: 'Jambon et fromage fondu, servi tel quel.' })],
  'formule-mexicain': [P('Fajitas', 'Les deux fajitas', [...LEG, 'Jalapeños', 'Cheddar'])],
};
// « 1 frite ou potatoes cheddar gruyere » dans chaque formule (panneau du 16/10).
const G_ACCOMP = { id: 'accompagnement', titre: 'Ton accompagnement', min: 1, max: 1, options: o(['Frites cheddar gruyère', 'Potatoes cheddar gruyère']) };
for (const c of CARTE) for (const i of c.items) {
  const parts = FORMULES[i.id]; if (!parts) continue;
  i.groupes = parts.flatMap((p, n) => {
    const tag = { partie: p.titre, court: p.court };
    return [
      ...(p.choix ? [{ id: 'choix-' + n, ...p.choix, ...tag }] : []),
      ...(p.ing.length ? [{ ...sans(...p.ing), id: 'retirer-' + n, ...tag }] : []),
      ...(p.info ? [{ id: 'info-' + n, type: 'info', texte: p.info, ...tag }] : []),
      // Un croc's (croque-monsieur) ne prend pas de sauce : pas de carte Sauces.
      ...(p.sauces === 0 ? [] : [{ ...SAUCES_G(p.sauces || 2), id: 'sauces-' + n, ...tag }]),
    ];
  });
}

/* ---------------- boissons et desserts (Hakim, 15/10) ----------------
   Canettes 2 EUR, eau 50 cl 1 EUR, tiramisu 4 EUR. La boisson des formules et
   des menus se choisit parmi les canettes (et l'eau). Dans « a composer »,
   on ne la demande que si le client prend « en menu ». Oasis « FF » = Fraise Framboise (existe) ;
   « PP » = Pomme Poire, deduit de la gamme Oasis : A CONFIRMER avec Hakim. */
const CANETTES = ['Dada Cola', 'Dada Cherry', 'Dada Zéro', 'Oasis Tropical', 'Oasis Pomme Cassis Framboise', 'Oasis Fraise Framboise', 'Oasis Pomme Poire',
  'Schweppes Agrumes', 'Schweppes Pomme', 'Schweppes Lemon', 'Orangina', 'Perrier', 'Ice Tea'];
const G_BOISSON = { id: 'boisson', titre: 'Ta boisson', min: 1, max: 1, options: o([...CANETTES, 'Eau 50 cl']) };
for (const c of CARTE) for (const i of c.items) {
  if (FORMULES[i.id]) i.groupes.push({ ...G_ACCOMP }, { ...G_BOISSON });
  const m = (i.groupes || []).findIndex((g) => g.id === 'menu');
  if (m >= 0) i.groupes.splice(m + 1, 0, { ...G_BOISSON, titre: 'Ta boisson (menu)', siChoix: { groupe: 'menu', sauf: 'Seul' } });
}
CARTE.push(
  { id: 'desserts', nom: 'Desserts', intro: '', items: [
    { id: 'tiramisu', n: 'Tiramisu', p: 4, photo: 'd-tiramisu', d: 'Le tiramisu maison, au café et au mascarpone.', groupes: [] },
  ] },
  { id: 'boissons', nom: 'Boissons', intro: 'Canettes 33 cl bien fraîches.', items: [
    { id: 'canette', n: 'Canette', p: 2, photo: 'bo-canette', d: 'Dada, Oasis, Schweppes, Orangina, Perrier ou Ice Tea.', groupes: [{ id: 'parfum', titre: 'Ta canette', min: 1, max: 1, options: o(CANETTES) }] },
    { id: 'eau', n: 'Eau 50 cl', p: 1, photo: 'bo-eau', d: 'Une petite bouteille d’eau.', groupes: [] },
  ] },
);

// Tacos : au moins une sauce obligatoire (Nicolas, 22/10), aussi dans la formule Maxi Tacos.
const SAUCE_OBLIGATOIRE = { tacos: 'sauces', 'formule-maxi-tacos': 'sauces-0' };
for (const c of CARTE) for (const i of c.items) {
  const g = SAUCE_OBLIGATOIRE[i.id] && (i.groupes || []).find((x) => x.id === SAUCE_OBLIGATOIRE[i.id]);
  if (g) {
    g.min = 1; g.aide = 'au moins 1 choix, jusqu’à ' + g.max + ' offertes';
    // « Sans sauce » (Hakim, 30/10) : la question reste posee, mais le client peut dire non.
    g.options = [{ n: 'Sans sauce', p: 0 }, ...g.options];
  }
}

// Les formules en DERNIERE categorie, pas en premiere (Hakim, 21/10).
{
  const formules = CARTE.filter((c) => c.id.startsWith('formules'));
  for (const f of formules) CARTE.splice(CARTE.indexOf(f), 1);
  CARTE.push(...formules);
}

/* ---------------- les allergenes (Nicolas, 2026-10-15) ----------------
   Un bouton « Allergenes » sur chaque fiche. Deduits de la composition
   connue (pain, fromages, poisson) ; les sauces apportent souvent oeufs et
   moutarde. INDICATIF : le client verifie plat par plat (cahier). */
const FROMAGES = /cheddar|gruy|kiri|raclette|chèvre|fromage|cheese|croc|mozza|emmental/i;
const PAIN_BURGER = /burger|brioch|cheese|smash|house|anas grill|240/i;
for (const c of CARTE) for (const i of c.items) {
  if (c.id === 'boissons') { i.allergenes = null; continue; }
  if (i.id === 'tiramisu') { i.allergenes = { contient: ['Gluten (biscuits)', 'Lait (mascarpone)', 'Œufs'], peut: [] }; continue; }
  const texte = [i.n, i.d || '', ...(i.groupes || []).flatMap((g) => (g.type === 'retirer' ? g.options.map((x) => x.n) : []))].join(' ');
  const contient = ['Gluten (pain, galette, panure)'];
  if (FROMAGES.test(texte) || c.id.startsWith('formules')) contient.push('Lait (fromages' + (c.id.startsWith('formules') ? ', frites cheddar gruyère' : '') + ')');
  if (/fish|poisson/i.test(texte)) contient.push('Poisson');
  const peut = ['Œufs et moutarde (selon la sauce choisie)'];
  if (PAIN_BURGER.test(texte)) peut.push('Sésame (pain à burger)');
  if (!FROMAGES.test(texte) && !c.id.startsWith('formules')) peut.push('Lait (si tu ajoutes du fromage ou une sauce gruyère)');
  i.allergenes = { contient, peut };
}

/* ---------------- les photos des options (Nicolas, 2026-10-15) ----------------
   « Regarde les design sur menu » : viandes, sauces, supplements et gratine
   en petites tuiles photo, comme sur le panneau. Photos : _source/options_panneau.py. */
const slug = (n) => n.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
// Photos du graphiste (17/10) : les pots de sauce et les canettes, en tuiles.
// La Fish n'a pas de photo du graphiste : elle garde son illustration.
const SAUCES_GRAPHISTE = new Set(['mayo', 'ketchup', 'burger', 'blanche', 'barbecue', 'algerienne', 'curry', 'samourai', 'harissa', 'gruyere', 'brazil', 'tartare', 'andalouse', 'moutarde']);
const BOISSONS_GRAPHISTE = new Set(['dada-cola', 'dada-cherry', 'oasis-tropical', 'oasis-pomme-cassis-framboise', 'schweppes-agrumes', 'schweppes-pomme', 'orangina', 'eau-50-cl',
  // + 20/10 : Perrier et Ice Tea (graphiste), et 4 canettes en photo d'internet en attendant les siennes.
  'perrier', 'ice-tea', 'dada-zero', 'oasis-fraise-framboise', 'oasis-pomme-poire', 'schweppes-lemon']);
const photoBoisson = (n) => BOISSONS_GRAPHISTE.has(slug(n)) ? 'boisson-' + slug(n) : 'boisson-autre';
const PHOTO_OPT = {
  viande: (n) => 'opt/' + slug(n),
  viande2: (n) => 'opt/' + slug(n),
  sauces: (n) => n === 'Sans sauce' ? null : SAUCES_GRAPHISTE.has(slug(n)) ? 'sauce-' + slug(n) : 'opt/' + (n === 'Curry' ? 'sauce-curry' : slug(n)),
  boisson: photoBoisson,
  parfum: photoBoisson,
  supplements: (n) => 'opt/u-' + slug(n.replace(' fumé', '')),
  gratinage: (n) => 'opt/u-' + slug(n),
};
// Une liste partagee (la boisson des formules) n'est convertie qu'une fois,
// et TOUS les groupes qui la partagent recoivent la version avec photos.
const faites = new Map();
for (const c of CARTE) for (const i of c.items) for (const g of i.groupes || []) {
  const f = PHOTO_OPT[g.type === 'sauces' ? 'sauces' : g.id];
  if (!f) continue;
  if (!faites.has(g.options)) faites.set(g.options, g.options.map((x) => { const ph = f(x.n); return ph ? { ...x, photo: ph } : { ...x }; }));
  g.options = faites.get(g.options);
}
