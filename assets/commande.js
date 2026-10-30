/* ===================================================================
   Anas Grill — la commande (LocWeb, 2026-10-14)
   Parcours : carte -> fiche du plat (options) -> panier -> infos ->
   paiement -> « Commande payee ». Le paiement est SIMULE dans l'apercu
   (ANAS.reglages.paiement = 'simule') : rien n'est envoye ni debite.

   L'heure annoncee : preparation + (en livraison) trajet, arrondie aux
   5 minutes. En production, elle sera reservee cote serveur sur un
   creneau qui a encore de la place (capacite par quart d'heure et par
   snack) ; si le creneau est plein, on propose le suivant : le client
   n'est jamais bloque.
   =================================================================== */
(function () {
  'use strict';
  var D = JSON.parse(document.getElementById('anas-donnees').textContent);
  var SNACK = D.snack, R = (window.ANAS || {}).reglages || {};
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var euros = function (n) { return (Math.round(n * 100) / 100).toFixed(2).replace('.', ',') + ' €'; };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  // Les ingredients qu'on peut retirer : une petite photo (Unsplash) par ingredient.
  var iconeDe = function (n) {
    var k = /salade/i.test(n) ? 'salade' : /tomate/i.test(n) ? 'tomate' : /oignon/i.test(n) ? 'oignon' : /cornichon/i.test(n) ? 'cornichon'
      : /jalap/i.test(n) ? 'jalapeno' : /piment/i.test(n) ? 'piment' : /bacon/i.test(n) ? 'bacon' : /sauce/i.test(n) ? 'sauce' : /gruy/i.test(n) ? 'gruyere' : /kiri/i.test(n) ? 'kiri' : 'cheddar';
    return '<img class="ing-photo" src="../photos/ing-' + k + '.webp" alt="" width="160" height="160">';
  };
  // La teinte de chaque sauce, pour le petit pot de sa carte.
  var TEINTES = { 'Mayo': '#f1dc98', 'Ketchup': '#c3271a', 'Burger': '#e7884f', 'Blanche': '#efebe0', 'Barbecue': '#5b2914', 'Fish': '#e6dfb2',
    'Algérienne': '#df722b', 'Curry': '#e2ae1c', 'Samouraï': '#e04d1d', 'Harissa': '#9b1c11', 'Gruyère': '#efc556', 'Brazil': '#ef982a', 'Tartare': '#d9d4a4', 'Andalouse': '#ee8638' };
  // « Mayo ×2 + Ketchup » : les sauces choisies, la meme pouvant revenir deux fois.
  var fmtSauces = function (ch) {
    var n = {}, ordre = [];
    ch.forEach(function (x) { if (!n[x]) { n[x] = 0; ordre.push(x); } n[x]++; });
    return ordre.map(function (x) { return x + (n[x] > 1 ? ' ×' + n[x] : ''); }).join(' + ');
  };
  var PHOTO_SAUCE = {};
  D.carte.forEach(function (c) { c.items.forEach(function (i) { (i.groupes || []).forEach(function (g) { if (g.type === 'sauces') g.options.forEach(function (o) { if (o.photo) PHOTO_SAUCE[o.n] = o.photo; }); }); }); });
  var pot = function (n) {
    return PHOTO_SAUCE[n] ? '<i class="sauce-pot sauce-pot-photo"><img src="../photos/' + PHOTO_SAUCE[n] + '.webp" alt="" width="160" height="160"></i>'
      : '<i class="sauce-pot" style="--c:' + (TEINTES[n] || '#e2ae1c') + '"></i>';
  };
  // Le serveur (fonctions ag-* de Supabase) : etat du snack et paiement.
  var FN = ((window.LOCWEB_CONFIG || {}).supabaseUrl || '') + '/functions/v1/';
  function appel(fn, corps) {
    return fetch(FN + fn, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corps) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) throw new Error(j.refus || j.error || 'Le serveur ne répond pas. Réessaie dans un instant.'); return j; }); });
  }
  var ETAT = { pause: false, ferme: null, epuises: [], creneaux_pleins: [], offre: null };
  var STRIPE = R.paiement === 'stripe' && R.stripePk;
  var PLATS = {};
  D.carte.forEach(function (c) { c.items.forEach(function (i) { PLATS[i.id] = i; }); });

  // L'offre du moment (creee par le gerant) : un plat comme les autres, tout en
  // haut de la carte. Meme construction que platOffre() cote serveur (ag-regles.ts).
  function platOffre(o) {
    if (!o || !o.titre || !(o.prix > 0)) return null;
    var groupes = [];
    if (o.retirer && o.retirer.length) groupes.push({ id: 'retirer', type: 'retirer', titre: 'Ingrédients', aide: 'touche pour retirer', min: 0, max: o.retirer.length, options: o.retirer.map(function (n) { return { n: n, p: 0 }; }) });
    var max = o.sauces_max === 1 ? 1 : 2;
    if (o.sauces && o.sauces.length) groupes.push({ id: 'sauces', type: 'sauces', titre: max === 1 ? 'Ta sauce' : 'Tes sauces', aide: max === 1 ? 'une, offerte' : 'jusqu’à 2, offertes', min: 0, max: max, options: o.sauces.map(function (n) { return { n: n, p: 0, photo: PHOTO_SAUCE[n] }; }) });
    return { id: 'offre', n: o.titre, d: o.texte || '', p: o.prix, image: o.image || '', groupes: groupes };
  }
  function montrerOffre() {
    var plat = platOffre(ETAT.offre), vieille = $('#offre'), onglet = $('[data-onglets] a[href="#offre"]');
    if (vieille) vieille.remove(); if (onglet) onglet.remove();
    if (!plat) {
      delete PLATS.offre;
      // Offre retiree : elle sort du panier.
      var avant = etat.lignes.length; etat.lignes = etat.lignes.filter(function (l) { return l.id !== 'offre'; });
      if (etat.lignes.length !== avant) { garder(); majBarre(); }
      return;
    }
    PLATS.offre = plat;
    var plus = $('.plat-plus') ? $('.plat-plus').innerHTML : '+';
    var sec = document.createElement('section');
    sec.className = 'categorie categorie-offre'; sec.id = 'offre';
    sec.innerHTML = '<h2>Offre du moment</h2><ul class="plats"><li class="plat plat-offre">' +
      '<button type="button" class="plat-bouton" data-plat="offre" aria-label="' + esc(plat.n) + ', personnaliser et ajouter">' +
      '<span class="plat-photo">' + (plat.image ? '<img src="' + esc(plat.image) + '" alt="' + esc(plat.n) + '" loading="lazy">' : '') + '</span>' +
      '<span class="plat-texte"><b>' + esc(plat.n) + '</b>' + (plat.d ? '<small>' + esc(plat.d) + '</small>' : '') + '</span>' +
      '<span class="plat-bas"><span class="prix">' + euros(plat.p) + '</span><span class="plat-plus">' + plus + '</span></span></button></li></ul>';
    var carte = $('#carte'); if (carte) carte.insertBefore(sec, carte.firstChild);
    var ong = $('[data-onglets] .onglets-in');
    if (ong) { var a = document.createElement('a'); a.href = '#offre'; a.textContent = 'Offre'; ong.insertBefore(a, ong.firstChild); }
  }

  function appliquerEtat() {
    montrerOffre();
    document.querySelectorAll('[data-plat]').forEach(function (b) {
      var ep = ETAT.epuises.indexOf(b.getAttribute('data-plat')) >= 0;
      b.closest('.plat').classList.toggle('plat-epuise', ep);
    });
    var bandeau = document.querySelector('[data-etat-snack]');
    if (!bandeau) { bandeau = document.createElement('div'); bandeau.setAttribute('data-etat-snack', ''); bandeau.className = 'etat-snack cadre'; var m = document.querySelector('.snack-page'); if (m) m.insertBefore(bandeau, m.firstChild); }
    var msg = ETAT.ferme ? 'Fermé en ce moment (' + esc(ETAT.ferme) + ').'
      : ETAT.pause ? 'Anas Grill ' + esc(SNACK.nom) + ' ne prend plus de commandes en ligne pour le moment. Réessaie un peu plus tard.' : '';
    bandeau.innerHTML = (msg ? '<p class="etat-alerte">' + msg + '</p>' : '') +
      (ETAT.offre && !PLATS.offre ? '<p class="etat-offre"><b>' + esc(ETAT.offre.titre) + '</b>' + (ETAT.offre.texte ? ' ' + esc(ETAT.offre.texte) : '') + '</p>' : '');
    bandeau.hidden = !msg && !(ETAT.offre && !PLATS.offre);
  }
  if (FN.indexOf('http') === 0) appel('ag-commande', { action: 'etat', snack: SNACK.id }).then(function (j) { ETAT = j; appliquerEtat(); }).catch(function () {});

  /* --- Le panier, garde dans le navigateur, un par snack --- */
  var CLE = 'anas-panier-' + SNACK.id;
  var etat = { lignes: [], infos: { mode: 'emporter' } };
  try { var lu = JSON.parse(localStorage.getItem(CLE) || 'null'); if (lu && lu.lignes) etat = lu; } catch (e) {}
  etat.infos = etat.infos || { mode: 'emporter' };
  // Pas de livraison pour l'instant (Hakim, 15/10) : tout est a emporter. R.livraison la rallume.
  if (!R.livraison) etat.infos.mode = 'emporter';
  try { var a = JSON.parse(localStorage.getItem('anas-adresse') || 'null'); if (a && !etat.infos.adresse) { etat.infos.adresse = a.label; etat.infos.lat = a.lat; etat.infos.lng = a.lng; } } catch (e) {}
  var garder = function () { try { localStorage.setItem(CLE, JSON.stringify(etat)); } catch (e) {} };
  var total = function () { return etat.lignes.reduce(function (t, l) { return t + l.prix * l.qte; }, 0); };
  var nb = function () { return etat.lignes.reduce(function (t, l) { return t + l.qte; }, 0); };

  var toastEl = $('[data-toast]'), toastT;
  function toast(t) { toastEl.textContent = t; toastEl.classList.add('visible'); clearTimeout(toastT); toastT = setTimeout(function () { toastEl.classList.remove('visible'); }, 1800); }

  /* --- La barre « Voir mon panier » --- */
  var barre = $('[data-ouvrir-panier]');
  function majBarre(saut) {
    barre.hidden = nb() === 0;
    $('[data-panier-n]').textContent = nb();
    $('[data-panier-total]').textContent = euros(total());
    if (saut) { barre.classList.remove('saute'); void barre.offsetWidth; barre.classList.add('saute'); }
  }
  majBarre();

  /* --- Voile commun a la fiche et au tiroir --- */
  var voile = $('[data-voile]'), feuille = $('[data-feuille]'), tiroir = $('[data-tiroir]');
  function montrer(el) { voile.hidden = false; el.hidden = false; document.documentElement.classList.add('bloque'); requestAnimationFrame(function () { voile.classList.add('visible'); el.classList.add('ouvert'); }); }
  function cacher(el) {
    el.classList.remove('ouvert');
    if (!$('.feuille.ouvert, .tiroir.ouvert')) { voile.classList.remove('visible'); document.documentElement.classList.remove('bloque'); }
    setTimeout(function () { el.hidden = true; if (!$('.feuille.ouvert, .tiroir.ouvert')) voile.hidden = true; }, 280);
  }
  voile.addEventListener('click', function () { cacher(feuille); cacher(tiroir); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { cacher(feuille); cacher(tiroir); } });

  /* ===================== 1. La fiche d'un plat ===================== */
  var enCours = null;
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-plat]'); if (!b) return;
    ouvrirFiche(PLATS[b.getAttribute('data-plat')]);
  });
  // « Comprise dans le maxi » : la 2e viande ne coute rien et devient obligatoire.
  function inclus(g) { return !!(g.inclusSi && (enCours.choix[g.inclusSi.groupe] || [])[0] === g.inclusSi.option); }
  function visible(g) { return !g.siChoix || ((enCours.choix[g.siChoix.groupe] || [])[0] || g.siChoix.sauf) !== g.siChoix.sauf; }
  function minDe(g) { return !visible(g) ? 0 : inclus(g) ? 1 : g.min; }
  function prixFiche() {
    var i = enCours.plat, p = i.p;
    (i.groupes || []).forEach(function (g) {
      if (inclus(g) || !visible(g)) return;
      if (g.offertes != null) p += Math.max(0, (enCours.choix[g.id] || []).length - g.offertes) * (g.prixSup || 0);
      (enCours.choix[g.id] || []).forEach(function (n) { var o = g.options.filter(function (x) { return x.n === n; })[0]; if (o) p += o.p; });
    });
    return p;
  }
  function ouvrirFiche(i, n) {
    i.groupes = i.groupes || [];
    if (ETAT.epuises.indexOf(i.id) >= 0) { toast(i.n + ' est épuisé aujourd’hui'); return; }
    // n : la ligne du panier qu'on modifie (ses choix et sa quantite sont repris).
    var edit = n != null ? etat.lignes[n] : null;
    enCours = { plat: i, choix: edit ? JSON.parse(JSON.stringify(edit.choix || {})) : {}, qte: edit ? edit.qte : 1, ligne: edit ? n : null };
    if (!edit) i.groupes.forEach(function (g) { if (g.min === 1 && g.max === 1 && g.id !== 'boisson' && g.id !== 'parfum') enCours.choix[g.id] = [g.options[0].n]; });
    // Un choix unique facultatif (le gratine) : « Sans » coche par defaut, pour pouvoir revenir en arriere.
    var optionsDe = function (g) { return g.max === 1 && g.min === 0 ? [{ n: 'Sans', p: 0 }].concat(g.options) : g.options; };
    feuille.innerHTML =
      '<div class="feuille-tete">' + (i.image ? '<img src="' + esc(i.image) + '" alt="">' : i.photo ? '<img src="../photos/' + i.photo + '.webp" alt="">' : '') +
      '<button type="button" class="feuille-fermer" data-fermer-fiche aria-label="Fermer">×</button></div>' +
      '<div class="feuille-corps"><div class="feuille-titre-ligne"><h3 id="feuille-titre">' + esc(i.n) +
        // Le « ? » qui precise ce que le plat n'a pas (Hakim, 30/10) : au survol, ou au toucher sur telephone.
        (i.bulle ? ' <span class="bulle" tabindex="0" role="note" aria-label="' + esc(i.bulle) + '" data-bulle="' + esc(i.bulle) + '">?</span>' : '') + '</h3>' +
      (i.allergenes ? '<button type="button" class="allerg-btn" data-allergenes aria-haspopup="dialog">Allergènes</button>' : '') + '</div>' + (i.d ? '<p class="feuille-desc">' + esc(i.d) + '</p>' : '') +
      parties(i.groupes, function (g) {
        if (g.type === 'info') return '<p class="partie-info">' + esc(g.texte) + '</p>';
        if (g.type === 'retirer') {
          return '<fieldset class="groupe groupe-retirer" data-groupe="' + g.id + '" data-retirer><legend><b>' + esc(g.titre) + '</b><small>' + esc(g.aide) + '</small></legend><div class="ings">' +
            g.options.map(function (o) {
              return '<label class="ing"><input type="checkbox" value="' + esc(o.n) + '"' + ((enCours.choix[g.id] || []).indexOf(o.n) >= 0 ? '' : ' checked') + '>' + iconeDe(o.n) + '<span>' + esc(o.n) + '</span><em>Sans</em></label>';
            }).join('') + '</div></fieldset>';
        }
        if (g.type === 'sauces') {
          return '<fieldset class="groupe groupe-sauces" data-groupe="' + g.id + '" data-sauces>' +
            '<button type="button" class="sauce-carte" data-sauce-ouvrir aria-expanded="false"><span class="sauce-pots" data-sauce-pots>' + pot('Mayo') + pot('Ketchup') + pot('Algérienne') + '</span>' +
            '<span class="sauce-texte"><b>' + esc(g.titre) + '</b><small data-sauce-resume>Choisir · ' + esc(g.aide) + '</small></span><span class="sauce-fleche" aria-hidden="true"></span></button>' +
            '<div class="sauces-boite" data-sauces-liste hidden>' + (g.max > 1 ? '<p class="sauces-aide">Touche deux fois une sauce pour la prendre en double.</p>' : '') +
            '<div class="sauces">' + g.options.map(function (o) {
              return '<button type="button" class="sauce" data-sauce="' + esc(o.n) + '" aria-pressed="false">' + pot(o.n) + '<span>' + esc(o.n) + '</span><em data-sauce-n></em></button>';
            }).join('') + '</div></div></fieldset>';
        }
        var type = g.max === 1 ? 'radio' : 'checkbox', tuiles = g.options.some(function (o) { return o.photo; });
        return '<fieldset class="groupe" data-groupe="' + g.id + '"><legend><b>' + esc(g.titre) + '</b><small>' +
          (g.min ? 'Obligatoire' : 'Facultatif') + (g.max > 1 && g.aide ? ' · ' + esc(g.aide) : '') + '</small></legend><div class="options' + (tuiles ? ' tuiles' : '') + '">' +
          optionsDe(g).map(function (o) {
            var coche = (enCours.choix[g.id] || []).indexOf(o.n) >= 0 || (o.n === 'Sans' && !(enCours.choix[g.id] || []).length);
            var visuel = !tuiles ? '' : o.photo ? '<img class="tuile-photo" src="../photos/' + o.photo + '.webp" alt="" width="160" height="160">' : '<i class="tuile-sans" aria-hidden="true"></i>';
            return '<label class="option' + (tuiles ? ' tuile' : '') + '"><input type="' + type + '" name="g-' + g.id + '" value="' + esc(o.n) + '"' + (coche ? ' checked' : '') + '>' + visuel + '<span>' + esc(o.n) + '</span>' + (o.p ? '<em>+' + (Number.isInteger(o.p) ? o.p + ' €' : euros(o.p)) + '</em>' : '') + '</label>';
          }).join('') + '</div></fieldset>';
      }) + '</div>' +
      '<div class="feuille-pied"><div class="qte"><button type="button" data-q="-1" aria-label="Moins">−</button><span data-q-n>1</span><button type="button" data-q="1" aria-label="Plus">+</button></div>' +
      (i.p == null ? '<button type="button" class="bouton bouton-feu" disabled>Prix bientôt</button></div>'
        : '<button type="button" class="bouton bouton-feu" data-ajouter-fiche>' + (edit ? 'Modifier' : 'Ajouter') + ' · <span data-prix-fiche>' + euros(i.p) + '</span></button></div>');
    majFiche();
    montrer(feuille);
    feuille.querySelector('.feuille-corps').scrollTop = 0;
  }
  // Les groupes d'une formule portent « partie » : on les range sous le titre de leur plat.
  function parties(groupes, rendu) {
    var html = '', ouverte = null;
    groupes.forEach(function (g) {
      if ((g.partie || null) !== ouverte) {
        if (ouverte) html += '</section>';
        ouverte = g.partie || null;
        if (ouverte) html += '<section class="partie"><h4 class="partie-titre">' + esc(ouverte) + '</h4>';
      }
      html += rendu(g);
    });
    return html + (ouverte ? '</section>' : '');
  }
  function majFiche() {
    var pf = $('[data-prix-fiche]', feuille); if (pf) pf.textContent = euros(prixFiche() * enCours.qte);
    $('[data-q-n]', feuille).textContent = enCours.qte;
    enCours.plat.groupes.forEach(function (g) {
      if (g.siChoix) {
        var fs = feuille.querySelector('[data-groupe="' + g.id + '"]'), vu = visible(g);
        fs.hidden = !vu;
        if (!vu && (enCours.choix[g.id] || []).length) { enCours.choix[g.id] = []; fs.querySelectorAll('input').forEach(function (x) { x.checked = false; }); }
      }
      if (g.inclusSi) {
        var fi = feuille.querySelector('[data-groupe="' + g.id + '"]'), inc = inclus(g);
        fi.querySelector('legend small').textContent = inc ? 'Comprise dans le maxi · obligatoire' : 'Facultatif';
        fi.querySelector('legend b').textContent = inc ? '2e viande' : g.titre;
        fi.querySelectorAll('.option').forEach(function (l) {
          var em = l.querySelector('em'); if (em) em.textContent = inc ? 'incluse' : '+2,50 €';
          if (l.querySelector('input').value === 'Sans') l.hidden = inc;
        });
        var sans = fi.querySelector('input[value="Sans"]'); if (sans && !(enCours.choix[g.id] || []).length) sans.checked = !inc;
      }
      if (g.type === 'sauces') {
        var ch = enCours.choix[g.id] || [], f = feuille.querySelector('[data-groupe="' + g.id + '"]');
        f.querySelector('[data-sauce-resume]').textContent = ch.length ? fmtSauces(ch) : 'Choisir · ' + g.aide;
        f.classList.toggle('choisie', ch.length > 0);
        f.querySelector('[data-sauce-pots]').innerHTML = (ch.length ? ch : ['Mayo', 'Ketchup', 'Algérienne']).map(pot).join('');
        f.querySelectorAll('[data-sauce]').forEach(function (b) {
          var n = ch.filter(function (x) { return x === b.getAttribute('data-sauce'); }).length;
          b.classList.toggle('prise', n > 0); b.setAttribute('aria-pressed', n > 0 ? 'true' : 'false');
          b.classList.toggle('grisee', ch.length >= g.max && !n);
          b.querySelector('[data-sauce-n]').textContent = n > 1 ? '×' + n : '';
        });
      } else if (g.max > 1 && g.type !== 'retirer') {
        var plein = (enCours.choix[g.id] || []).length >= g.max;
        feuille.querySelectorAll('[data-groupe="' + g.id + '"] input').forEach(function (inp) { inp.disabled = plein && !inp.checked; });
      }
    });
  }
  feuille.addEventListener('change', function (e) {
    var f = e.target.closest('[data-groupe]'); if (!f) return;
    if (f.hasAttribute('data-retirer')) {
      enCours.choix[f.getAttribute('data-groupe')] = [].map.call(f.querySelectorAll('input:not(:checked)'), function (x) { return x.value; });
      majFiche(); return;
    }
    enCours.choix[f.getAttribute('data-groupe')] = [].map.call(f.querySelectorAll('input:checked'), function (x) { return x.value; }).filter(function (v) { return v !== 'Sans'; });
    majFiche();
  });
  function ouvrirSauces(f, ouvert) {
    var b = f.querySelector('[data-sauce-ouvrir]'), l = f.querySelector('[data-sauces-liste]');
    b.setAttribute('aria-expanded', ouvert ? 'true' : 'false'); l.hidden = !ouvert; f.classList.toggle('ouverte', ouvert);
  }
  feuille.addEventListener('click', function (e) {
    if (e.target.closest('[data-fermer-fiche]')) { cacher(feuille); if (enCours && enCours.ligne != null) rouvrirPanier(); return; }
    if (e.target.closest('[data-allergenes]')) { allergenes(enCours.plat); return; }
    if (e.target.closest('[data-allerg-fermer]') || e.target.classList.contains('allerg-pop')) { var ap = feuille.querySelector('.allerg-pop'); if (ap) ap.remove(); return; }
    var so = e.target.closest('[data-sauce-ouvrir]');
    if (so) { ouvrirSauces(so.closest('[data-sauces]'), so.getAttribute('aria-expanded') !== 'true'); return; }
    var sb = e.target.closest('[data-sauce]');
    if (sb) {
      var f = sb.closest('[data-sauces]'), id = f.getAttribute('data-groupe'), nom = sb.getAttribute('data-sauce');
      var g = enCours.plat.groupes.filter(function (x) { return x.id === id; })[0], ch = (enCours.choix[id] || []).slice();
      var deja = ch.indexOf(nom) >= 0;
      if (g.max === 1) ch = deja ? [] : [nom];
      else if (ch.length < g.max) ch.push(nom);           // x1, puis x2
      else if (deja) ch = ch.filter(function (x) { return x !== nom; }); // plein : on la retire
      else { toast(g.max + ' sauces maximum : touche une sauce choisie pour la retirer'); return; }
      enCours.choix[id] = ch; majFiche();
      // Complet : on replie, la carte affiche le choix (« Mayo ×2 »).
      if (ch.length >= g.max) setTimeout(function () { ouvrirSauces(f, false); }, 450);
      return;
    }
    var q = e.target.closest('[data-q]');
    if (q) { enCours.qte = Math.max(1, Math.min(20, enCours.qte + +q.getAttribute('data-q'))); majFiche(); return; }
    if (e.target.closest('[data-ajouter-fiche]')) {
      var manque = enCours.plat.groupes.filter(function (g) { return (enCours.choix[g.id] || []).length < minDe(g); })[0];
      if (manque) { toast('Choisis : ' + manque.titre.replace(/\s*\?$/, '').toLowerCase()); return; }
      if (enCours.ligne != null) { remplacer(enCours.ligne, enCours.plat, enCours.choix, enCours.qte, prixFiche()); cacher(feuille); rouvrirPanier(); return; }
      ajouter(enCours.plat, enCours.choix, enCours.qte, prixFiche()); cacher(feuille);
    }
  });

  function allergenes(i) {
    var a = i.allergenes, li = function (l) { return '<ul>' + l.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>'; };
    var d = document.createElement('div'); d.className = 'allerg-pop';
    d.innerHTML = '<div class="allerg-boite" role="dialog" aria-modal="true" aria-label="Allergènes"><button type="button" class="feuille-fermer" data-allerg-fermer aria-label="Fermer">×</button>' +
      '<h4>Allergènes · ' + esc(i.n) + '</h4><b>Contient</b>' + li(a.contient) + (a.peut.length ? '<b>Peut contenir</b>' + li(a.peut) : '') +
      '<p>Une allergie ? Appelle le restaurant avant de commander : <a href="tel:' + SNACK.tel.replace(/\s/g, '') + '">' + esc(SNACK.tel) + '</a>.</p></div>';
    feuille.appendChild(d); d.querySelector('[data-allerg-fermer]').focus();
  }
  function resume(i, choix) {
    var bouts = {}, ordre = [];
    (i.groupes || []).forEach(function (g) {
      var t = resumeGroupe(g, choix); if (!t) return;
      var k = g.court || ''; if (!bouts[k]) { bouts[k] = []; ordre.push(k); } bouts[k].push(t);
    });
    return ordre.map(function (k) { return (k ? k + ' : ' : '') + bouts[k].join(', '); }).join(' · ');
  }
  function resumeGroupe(g, choix) {
    if (g.siChoix && ((choix[g.siChoix.groupe] || [])[0] || g.siChoix.sauf) === g.siChoix.sauf) return '';
    return [g].map(function (g) {
      if (g.type === 'retirer') return (choix[g.id] || []).map(function (n) { return 'sans ' + n.toLowerCase(); }).join(', ');
      if (g.type === 'sauces') return (choix[g.id] || []).length ? 'sauce ' + fmtSauces(choix[g.id]).toLowerCase() : '';
      if (g.prefixe) return (choix[g.id] || []).length ? g.prefixe + choix[g.id].join(', ').toLowerCase() : '';
      var c = (choix[g.id] || []).filter(function (n) { return !/^Seul$|^Normal/.test(n); });
      return c.length ? c.join(', ') : '';
    }).filter(Boolean).join(' · ');
  }
  function ajouter(i, choix, qte, prixU) {
    var cle = i.id + '|' + JSON.stringify(choix);
    var l = etat.lignes.filter(function (x) { return x.k === cle; })[0];
    if (l) l.qte += qte; else etat.lignes.push({ k: cle, id: i.id, n: i.n, choix: choix, qte: qte, prix: prixU == null ? i.p : prixU, resume: resume(i, choix) });
    garder(); majBarre(true); toast(i.n + ' ajouté');
  }

  // La ligne modifiee garde sa place ; si elle devient identique a une autre, elles fusionnent.
  function remplacer(n, i, choix, qte, prixU) {
    var cle = i.id + '|' + JSON.stringify(choix);
    etat.lignes.splice(n, 1);
    var l = etat.lignes.filter(function (x) { return x.k === cle; })[0];
    if (l) l.qte += qte;
    else etat.lignes.splice(n, 0, { k: cle, id: i.id, n: i.n, choix: choix, qte: qte, prix: prixU == null ? i.p : prixU, resume: resume(i, choix) });
    garder(); majBarre(); toast(i.n + ' modifié');
  }
  function rouvrirPanier() { etape = 'panier'; rendre(); montrer(tiroir); }

  /* ===================== 2. Le tiroir : panier, infos, paiement ===================== */
  var etape = 'panier', corps = $('[data-tiroir-corps]'), pied = $('[data-tiroir-pied]');
  barre.addEventListener('click', function () { etape = 'panier'; rendre(); montrer(tiroir); });
  $('[data-fermer]', tiroir).addEventListener('click', function () { cacher(tiroir); });
  $('[data-retour]', tiroir).addEventListener('click', function () { etape = etape === 'paiement' ? 'infos' : 'panier'; rendre(); });

  function rendre() {
    var titres = { panier: 'Mon panier', infos: 'Mes infos', paiement: 'Paiement' };
    $('[data-tiroir-titre]').textContent = titres[etape];
    $('[data-retour]', tiroir).hidden = etape === 'panier';
    var ordre = ['panier', 'infos', 'paiement'];
    $('[data-etapes]').querySelectorAll('span').forEach(function (s, i) { s.classList.toggle('faite', i <= ordre.indexOf(etape)); });
    if (!etat.lignes.length) etape = 'panier';
    ({ panier: rendrePanier, infos: rendreInfos, paiement: rendrePaiement })[etape]();
    corps.scrollTop = 0;
  }

  function rendrePanier() {
    if (!etat.lignes.length) {
      corps.innerHTML = '<div class="vide"><b>Ton panier est vide</b>Ajoute un plat depuis la carte.</div>';
      pied.innerHTML = '<button type="button" class="bouton bouton-ligne" data-fermer-tiroir>Voir la carte</button>';
      return;
    }
    corps.innerHTML = '<ul class="lignes">' + etat.lignes.map(function (l, n) {
      var p = PLATS[l.id] || l;
      return '<li class="ligne"><button type="button" class="ligne-texte" data-modifier="' + n + '" aria-label="Modifier ' + esc(p.n) + '"><b>' + esc(p.n) + '</b>' + (l.resume ? '<small>' + esc(l.resume) + '</small>' : '') + '<span class="ligne-modifier">Modifier</span></button>' +
        '<div class="qte qte-petite"><button type="button" data-moins="' + n + '" aria-label="Retirer">−</button><span>' + l.qte + '</span><button type="button" data-plus="' + n + '" aria-label="Ajouter">+</button></div>' +
        '<span class="prix">' + euros(l.prix * l.qte) + '</span></li>';
    }).join('') + '</ul><p class="tiroir-snack">' + 'Commande chez <b>Anas Grill ' + esc(SNACK.nom) + '</b></p>';
    pied.innerHTML = '<div class="total"><span>Total</span><b>' + euros(total()) + '</b></div><button type="button" class="bouton bouton-feu" data-suite>Continuer</button>';
  }
  corps.addEventListener('click', function (e) {
    var m = e.target.closest('[data-moins]'), p = e.target.closest('[data-plus]');
    if (m || p) {
      var l = etat.lignes[+(m || p).getAttribute(m ? 'data-moins' : 'data-plus')];
      l.qte += m ? -1 : 1; if (l.qte <= 0) etat.lignes.splice(etat.lignes.indexOf(l), 1);
      garder(); majBarre(); rendre(); return;
    }
    var md = e.target.closest('[data-modifier]');
    if (md) {
      var n0 = +md.getAttribute('data-modifier'), l0 = etat.lignes[n0];
      var plat = l0 && (l0.id === 'offre' ? (ETAT.offre ? platOffre(ETAT.offre) : null) : PLATS[l0.id]);
      if (!plat) { toast('Ce plat n’est plus à la carte : retire-le du panier.'); return; }
      cacher(tiroir); ouvrirFiche(plat, n0); return;
    }
    var s = e.target.closest('[data-adr]');
    if (s) { choisirAdresse(+s.getAttribute('data-lat'), +s.getAttribute('data-lng'), s.textContent); }
  });

  /* --- Les infos : a emporter ou en livraison --- */
  function distanceKm(lat, lng, s) {
    s = s || SNACK; var r = Math.PI / 180, dLat = (lat - s.lat) * r, dLng = (lng - s.lng) * r;
    var x = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(s.lat * r) * Math.cos(lat * r) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * 6371 * Math.asin(Math.sqrt(x)) * 1.3; // x1,3 : la route n'est pas une ligne droite
  }
  function rendreInfos() {
    var i = etat.infos, liv = i.mode === 'livraison';
    corps.innerHTML = '<form class="form" data-form novalidate>' +
      (!R.livraison ? '' : '<div class="segment" role="radiogroup" aria-label="Mode"><label><input type="radio" name="mode" value="emporter"' + (!liv ? ' checked' : '') + '><span>À emporter</span></label><label><input type="radio" name="mode" value="livraison"' + (liv ? ' checked' : '') + '><span>En livraison</span></label></div>') +
      (liv ? '<label class="champ champ-adresse"><span>Adresse de livraison</span><input name="adresse" autocomplete="off" placeholder="Numéro et rue, ville" value="' + esc(i.adresse) + '" data-adr-champ><ul class="suggestions" data-adr-sugg hidden></ul></label>' +
        '<label class="champ"><span>Étage, code, interphone <small>(facultatif)</small></span><input name="complement" value="' + esc(i.complement) + '"></label>' +
        '<p class="info-zone" data-zone></p>' + (total() < (R.minimumLivraison || 0) ? '<p class="info-zone attention">Livraison à partir de ' + euros(R.minimumLivraison) + ' : il te manque ' + euros(R.minimumLivraison - total()) + '.</p>' : '') : '<p class="info-zone ok">À retirer chez Anas Grill ' + esc(SNACK.nom) + ', ' + esc(SNACK.adresse) + '.</p>') +
      blocQuand() +
      '<label class="champ"><span>Prénom</span><input name="prenom" autocomplete="given-name" value="' + esc(i.prenom) + '" required></label>' +
      '<label class="champ"><span>Téléphone <small>' + (liv ? '(le livreur t’appelle à son arrivée)' : '(si la cuisine a besoin de te joindre)') + '</small></span><input name="tel" type="tel" inputmode="tel" autocomplete="tel" value="' + esc(i.tel) + '" required></label>' +
      '<label class="champ"><span>Un mot pour la cuisine <small>(facultatif)</small></span><input name="note" placeholder="Sans oignons, allergie…" value="' + esc(i.note) + '"></label>' +
      '<p class="alerte" data-alerte hidden></p></form>';
    pied.innerHTML = '<div class="total"><span>Total</span><b>' + euros(total()) + '</b></div><button type="button" class="bouton bouton-feu" data-suite>Passer au paiement</button>';
    corps.querySelectorAll('[name=mode]').forEach(function (r) { r.addEventListener('change', function () { lire(); etat.infos.mode = r.value; garder(); rendre(); }); });
    corps.querySelectorAll('[name=quand]').forEach(function (r) { r.addEventListener('change', function () { lire(); etat.infos.quand = r.value; garder(); rendre(); }); });
    var cr = $('[data-creneau]'); if (cr) cr.addEventListener('change', function () { etat.infos.creneau = cr.value || null; garder(); });
    if (liv) { brancherAdresse(); majZone(); }
  }
  function blocQuand() {
    var i = etat.infos, f = fenetre();
    if (!f) return '<p class="info-zone attention">Les commandes en ligne ouvrent à ' + (R.debutCommandes || 8) + ' h, pour un service à partir de ' + SNACK.ouverture + ' h.</p>';
    var ouvert = Date.now() >= f.ouv.getTime(), l = creneaux(f);
    if (!ouvert) i.quand = 'plus-tard';
    if (i.quand !== 'plus-tard' || !l.length) i.quand = 'vite';
    var choix = ouvert && l.length > 0; // plus aucun creneau avant la fermeture : seulement « au plus vite »
    if (i.creneau && !l.some(function (t) { return t.toISOString() === i.creneau; })) i.creneau = null;
    return '<div class="quand"><span class="quand-titre">Quand ?</span>' +
      (f.apercu ? '<p class="quand-note">Aperçu : on te laisse tester même si le snack est fermé en ce moment.</p>' : '') +
      (choix ? '<div class="segment" role="radiogroup" aria-label="Quand"><label><input type="radio" name="quand" value="vite"' + (i.quand === 'vite' ? ' checked' : '') + '><span>Au plus vite</span></label><label><input type="radio" name="quand" value="plus-tard"' + (i.quand === 'plus-tard' ? ' checked' : '') + '><span>Programmer</span></label></div>'
        : ouvert ? '<p class="quand-note">Au plus vite : c’est bientôt la fermeture.</p>' : '<p class="quand-note">On ouvre à ' + SNACK.ouverture + ' h : choisis l’heure de ta commande.</p>') +
      (i.quand === 'plus-tard' ? '<label class="champ"><span>Heure souhaitée</span><select name="creneau" data-creneau><option value="">Choisis un créneau</option>' +
        l.map(function (t) { var v = t.toISOString(), plein = ETAT.creneaux_pleins.indexOf(v) >= 0; return '<option value="' + v + '"' + (plein ? ' disabled' : i.creneau === v ? ' selected' : '') + '>' + hm(t) + (plein ? ' · complet' : '') + '</option>'; }).join('') + '</select></label>' : '') +
      '</div>';
  }
  function lire() {
    var f = $('[data-form]'); if (!f) return;
    ['adresse', 'complement', 'prenom', 'tel', 'note'].forEach(function (n) { if (f[n]) etat.infos[n] = f[n].value.trim(); });
    garder();
  }
  var minut = null;
  function brancherAdresse() {
    var champ = $('[data-adr-champ]'), sugg = $('[data-adr-sugg]');
    champ.addEventListener('input', function () {
      etat.infos.lat = etat.infos.lng = null; majZone();
      clearTimeout(minut); var q = champ.value.trim();
      if (q.length < 4) { sugg.hidden = true; return; }
      minut = setTimeout(function () {
        fetch('https://api-adresse.data.gouv.fr/search/?limit=5&autocomplete=1&lat=' + SNACK.lat + '&lon=' + SNACK.lng + '&q=' + encodeURIComponent(q))
          .then(function (r) { return r.json(); }).then(function (j) {
            sugg.innerHTML = (j.features || []).map(function (f) { return '<li><button type="button" data-adr data-lat="' + f.geometry.coordinates[1] + '" data-lng="' + f.geometry.coordinates[0] + '">' + esc(f.properties.label) + '</button></li>'; }).join('');
            sugg.hidden = !sugg.children.length;
          }).catch(function () { sugg.hidden = true; });
      }, 250);
    });
  }
  function choisirAdresse(lat, lng, label) {
    etat.infos.adresse = label; etat.infos.lat = lat; etat.infos.lng = lng; garder();
    $('[data-adr-champ]').value = label; $('[data-adr-sugg]').hidden = true; majZone();
  }
  function majZone() {
    var z = $('[data-zone]'); if (!z) return;
    var i = etat.infos;
    if (i.lat == null) { z.className = 'info-zone'; z.textContent = 'Choisis ton adresse dans la liste pour vérifier qu’on te livre.'; return; }
    var d = distanceKm(i.lat, i.lng);
    if (d <= SNACK.rayonKm) { z.className = 'info-zone ok'; z.textContent = 'On te livre ! Environ ' + d.toFixed(1).replace('.', ',') + ' km depuis Anas Grill ' + SNACK.nom + '.'; return; }
    // Hors zone : on propose le snack qui couvre l'adresse.
    var autre = D.snacks.map(function (s) { return { s: s, d: distanceKm(i.lat, i.lng, s) }; }).filter(function (x) { return x.s.id !== SNACK.id && x.d <= x.s.rayonKm; }).sort(function (a, b) { return a.d - b.d; })[0];
    z.className = 'info-zone hors';
    z.innerHTML = 'Cette adresse est trop loin d’Anas Grill ' + esc(SNACK.nom) + '. ' + (autre
      ? '<a href="' + ANAS.racine + autre.s.id + '/">Anas Grill ' + esc(autre.s.nom) + '</a> te livre (' + autre.d.toFixed(1).replace('.', ',') + ' km) : ta commande y sera reprise.'
      : 'Tu peux la prendre à emporter.');
    if (autre) try { localStorage.setItem('anas-panier-' + autre.s.id, JSON.stringify(etat)); } catch (e) {}
  }
  function verifier() {
    lire(); var i = etat.infos, err = '';
    if (i.mode === 'livraison') {
      if (i.lat == null) err = 'Choisis ton adresse dans la liste proposée.';
      else if (distanceKm(i.lat, i.lng) > SNACK.rayonKm) err = 'Cette adresse est hors de la zone de livraison de ce restaurant.';
      else if (total() < (R.minimumLivraison || 0)) err = 'La livraison, c’est à partir de ' + euros(R.minimumLivraison) + ' de commande : il te manque ' + euros(R.minimumLivraison - total()) + '. Ajoute un plat, ou passe à emporter.';
    }
    if (!err && !fenetre()) err = 'Les commandes en ligne ouvrent à ' + (R.debutCommandes || 8) + ' h.';
    if (!err && (ETAT.pause || ETAT.ferme)) err = 'Ce restaurant ne prend plus de commandes en ligne pour le moment.';
    if (!err && i.quand === 'plus-tard' && !i.creneau) err = 'Choisis l’heure de ta commande.';
    if (!err && (i.prenom || '').length < 2) err = 'Indique ton prénom.';
    if (!err && (i.tel || '').replace(/\D/g, '').length < 10) err = 'Indique un numéro de téléphone valide : on t’appelle si besoin.';
    var a = $('[data-alerte]'); a.hidden = !err; a.textContent = err;
    return !err;
  }

  /* --- Les horaires (Nicolas, 15/10) ---
     Commandes en ligne des 8 h ; service de l'ouverture (11 h) a la fermeture
     (1 h, Vaulx 4 h) ; derniere commande 15 min avant. Avant 11 h, on ne peut
     que programmer un creneau de 15 min. Production : le serveur n'accepte que
     2 commandes a l'avance par creneau et masque les creneaux pleins.
     Apercu : si le snack est ferme, on laisse tester comme s'il etait ouvert. */
  // Un touriste avec son telephone a l'heure anglaise doit voir les creneaux de Paris.
  var PARIS = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  function partiesParis(t) { var o = {}; PARIS.formatToParts(new Date(t)).forEach(function (x) { if (x.type !== 'literal') o[x.type] = +x.value; }); return o; }
  // (annee, mois 1-12, jour, heure) a l'heure de Paris -> instant reel (ms).
  function depuisParis(a, m, j, h) {
    // Deux passes : la nuit du changement d'heure, le decalage lu a « essai » n'est pas celui du resultat.
    var essai = Date.UTC(a, m - 1, j, h, 0), r = essai;
    for (var n = 0; n < 2; n++) { var q = partiesParis(r); r = essai - (Date.UTC(q.year, q.month - 1, q.day, q.hour, q.minute) - r); }
    return r;
  }
  function fenetre() {
    var now = Date.now(), p = partiesParis(now);
    for (var k = -1; k <= 0; k++) {
      var d = new Date(Date.UTC(p.year, p.month - 1, p.day + k)), a = d.getUTCFullYear(), m = d.getUTCMonth() + 1, jj = d.getUTCDate();
      var debut = depuisParis(a, m, jj, R.debutCommandes || 8), ouv = depuisParis(a, m, jj, SNACK.ouverture || 11);
      var l = new Date(Date.UTC(a, m - 1, jj + (SNACK.fermeture <= SNACK.ouverture ? 1 : 0)));
      var fin = depuisParis(l.getUTCFullYear(), l.getUTCMonth() + 1, l.getUTCDate(), SNACK.fermeture) - (R.arretAvantFermeture || 15) * 60000;
      if (now >= debut && now < fin) return { ouv: new Date(ouv), fin: new Date(fin) };
    }
    if (R.apercuToujoursOuvert) return { ouv: new Date(now - 60000), fin: new Date(now + 4 * 3600000), apercu: true };
    return null;
  }
  function creneaux(f) {
    var pas = (R.pasCreneau || 15) * 60000, l = [];
    var t = new Date(Math.ceil(Math.max(f.ouv.getTime(), Date.now() + dureeMin() * 60000) / pas) * pas);
    pas = pas / 60000;
    for (; t <= f.fin && l.length < 96; t = new Date(t.getTime() + pas * 60000)) l.push(t);
    return l;
  }

  /* --- L'heure estimee --- */
  function dureeMin() {
    var i = etat.infos, min = R.preparation || 15;
    if (i.mode === 'livraison' && i.lat != null) min += (R.departLivreur || 5) + Math.round(distanceKm(i.lat, i.lng) * (R.minutesParKm || 3));
    return min;
  }
  function estimation() {
    var i = etat.infos, min = dureeMin();
    if (i.quand === 'plus-tard' && i.creneau) { var h = new Date(i.creneau); return { heure: h, minutes: Math.max(0, Math.round((h - Date.now()) / 60000)), programme: true }; }
    var pas = (R.pas || 5) * 60000, t = new Date(Math.ceil((Date.now() + min * 60000) / pas) * pas);
    // Production : le serveur reserve ce creneau, ou le suivant s'il est plein.
    return { heure: t, minutes: Math.max(min, Math.round((t - Date.now()) / 60000)) };
  }
  var hm = function (d) { var q = partiesParis(d.getTime()); return q.hour + 'h' + String(q.minute).padStart(2, '0'); };

  /* --- Le paiement (simule dans l'apercu) --- */
  function rendrePaiement() {
    var i = etat.infos, e = estimation(), liv = i.mode === 'livraison';
    // Tant que la societe du snack n'encaisse pas (compte Stripe pas encore
    // valide), seul le paiement sur place est propose.
    var horsLigne = STRIPE && ETAT.en_ligne === false && R.payerSurPlace;
    var surPlace = R.payerSurPlace && (horsLigne || i.reglement === 'sur_place');
    var choix = horsLigne ? '<p class="info-zone">Dans ce restaurant, le paiement se fait au comptoir pour l’instant. Le paiement en ligne arrive très bientôt.</p>'
      : R.payerSurPlace ? '<div class="reglements" role="radiogroup" aria-label="Paiement">' +
      '<button type="button" class="reglement' + (surPlace ? '' : ' actif') + '" data-reglement="ligne" role="radio" aria-checked="' + !surPlace + '"><b>Payer en ligne</b><small>Carte, Apple Pay, Google Pay</small></button>' +
      '<button type="button" class="reglement' + (surPlace ? ' actif' : '') + '" data-reglement="sur_place" role="radio" aria-checked="' + surPlace + '"><b>Payer sur place</b><small>Au comptoir, en récupérant ta commande</small></button></div>' : '';
    corps.innerHTML = choix +
      '<div class="recap"><small>' + (liv ? 'Livraison' : 'À emporter') + '</small><b>' + (liv ? 'Chez toi vers ' : 'Prêt à ') + hm(e.heure) + '</b><span>' + esc(liv ? i.adresse + (i.complement ? ' · ' + i.complement : '') : 'Anas Grill ' + SNACK.nom + ', ' + SNACK.adresse) + '</span></div>' +
      '<div class="recap"><small>' + nb() + ' article' + (nb() > 1 ? 's' : '') + '</small>' + etat.lignes.map(function (l) { return '<div class="recap-ligne"><span>' + l.qte + ' × ' + esc((PLATS[l.id] || l).n) + '</span><span>' + euros(l.prix * l.qte) + '</span></div>'; }).join('') + '</div>' +
      (surPlace
        ? '<div class="carte-paiement sur-place"><b>Tu paies au comptoir</b><p>En espèces ou par carte, quand tu récupères ta commande. Elle part en cuisine dès que tu valides.</p></div><p class="alerte" data-alerte-paiement hidden></p>'
        : STRIPE
        ? '<div class="carte-paiement"><div class="cp-tete"><b>Paiement sécurisé</b><span class="cp-logos">Carte · Apple Pay · Google Pay</span></div><div class="paiement-stripe" data-ps><p class="ps-attente">Préparation du paiement sécurisé…</p></div></div><p class="alerte" data-alerte-paiement hidden></p>'
        : '<div class="carte-paiement"><div class="cp-tete"><b>Carte bancaire</b><span class="cp-logos">CB · Visa · Mastercard · Apple Pay</span></div>' +
          '<div class="cp-champ">•••• •••• •••• 4242</div><div class="cp-deux"><div class="cp-champ">12 / 28</div><div class="cp-champ">•••</div></div>' +
          '<p class="cp-demo">Aperçu : paiement simulé, rien n’est débité. Une fois en ligne, ce cadre est le paiement sécurisé Stripe.</p></div>');
    pied.innerHTML = '<div class="total"><span>' + (surPlace ? 'À payer au comptoir' : 'À payer') + '</span><b data-a-payer>' + euros(total()) + '</b></div>' +
      (surPlace ? '<button type="button" class="bouton bouton-feu" data-sur-place>Valider ma commande</button>'
        : '<button type="button" class="bouton bouton-feu" data-payer' + (STRIPE ? ' disabled' : '') + '>Payer ' + euros(total()) + '</button>');
    if (STRIPE && !surPlace) preparerPaiement();
  }

  /* Le paiement : le serveur verifie tout et recalcule le prix (ag-commande),
     puis le module Stripe s'affiche dans la page (carte, Apple Pay, Google
     Pay...). Une meme commande n'est preparee qu'une fois tant que le panier
     et les infos ne changent pas. */
  var PAIEMENT = null, stripeJs = null;
  function chargerStripe() {
    if (window.Stripe) return Promise.resolve();
    if (!stripeJs) stripeJs = new Promise(function (ok, ko) {
      var sc = document.createElement('script'); sc.src = 'https://js.stripe.com/v3/'; sc.onload = ok;
      sc.onerror = function () { stripeJs = null; ko(new Error('Le module de paiement n’a pas pu se charger. Vérifie ta connexion.')); };
      document.head.appendChild(sc);
    });
    return stripeJs;
  }
  function alertePaiement(t) { var a = $('[data-alerte-paiement]'); if (a) { a.hidden = !t; a.textContent = t || ''; } }
  // Un identifiant au hasard pour cet appareil : la limite anti-spam du serveur.
  function appareil() {
    var a; try { a = localStorage.getItem('anas-appareil'); } catch (x) {}
    if (!a) { a = 'a' + Math.random().toString(36).slice(2) + Date.now().toString(36); try { localStorage.setItem('anas-appareil', a); } catch (x) {} }
    return a;
  }
  function validerSurPlace(b) {
    var i = etat.infos;
    b.disabled = true; b.textContent = 'Envoi au restaurant…'; alertePaiement('');
    if (!STRIPE) { setTimeout(function () { confirmer(null, true); }, 900); return; } // apercu
    appel('ag-commande', { action: 'payer', mode_paiement: 'sur_place', snack: SNACK.id, appareil: appareil(), prenom: i.prenom, telephone: i.tel, note: i.note || '',
      creneau: i.quand === 'plus-tard' ? i.creneau : null,
      lignes: etat.lignes.map(function (l) { return { id: l.id, choix: l.choix, qte: l.qte }; }) })
      .then(function (rep) {
        try { localStorage.setItem('anas-commande', JSON.stringify({ id: rep.commande.id, heure: rep.commande.heure_prevue })); } catch (x) {}
        PAIEMENT = null; confirmer(rep.commande, true);
      })
      .catch(function (e) { b.disabled = false; b.textContent = 'Valider ma commande'; alertePaiement(e.message); });
  }
  function preparerPaiement() {
    var i = etat.infos;
    var demande = { action: 'payer', snack: SNACK.id, appareil: appareil(), prenom: i.prenom, telephone: i.tel, note: i.note || '',
      creneau: i.quand === 'plus-tard' ? i.creneau : null,
      lignes: etat.lignes.map(function (l) { return { id: l.id, choix: l.choix, qte: l.qte }; }) };
    var cle = JSON.stringify(demande);
    var suite = PAIEMENT && PAIEMENT.cle === cle ? Promise.resolve(PAIEMENT.rep) : appel('ag-commande', demande).then(function (rep) {
      PAIEMENT = { cle: cle, rep: rep };
      // Pour retrouver sa commande s'il ferme son telephone en plein paiement.
      try { localStorage.setItem('anas-commande', JSON.stringify({ id: rep.commande.id, heure: rep.commande.heure_prevue })); } catch (x) {}
      return rep;
    });
    suite.then(function (rep) { return chargerStripe().then(function () { monter(rep); }); })
      .catch(function (e) { var z = $('[data-ps]'); if (z) z.innerHTML = ''; alertePaiement(e.message); });
  }
  function monter(rep) {
    var zone = $('[data-ps]'); if (!zone) return;
    var montant = euros(rep.commande.total_cents / 100);
    $('[data-a-payer]').textContent = montant;
    var st = window.Stripe(R.stripePk, rep.stripe_account ? { stripeAccount: rep.stripe_account } : {});
    var el = st.elements({
      clientSecret: rep.client_secret, locale: 'fr',
      fonts: [{ cssSrc: 'https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600&display=swap' }],
      appearance: { theme: 'night', variables: { colorPrimary: '#ff8a00', colorBackground: '#141210', colorText: '#f4efe8', colorDanger: '#ff5a4e', fontFamily: 'Barlow, sans-serif', borderRadius: '12px', spacingUnit: '4px' } },
    });
    var pe = el.create('payment', { layout: { type: 'tabs' }, wallets: { applePay: 'auto', googlePay: 'auto' } });
    zone.innerHTML = ''; pe.mount(zone);
    PAIEMENT.stripe = st; PAIEMENT.elements = el;
    var b = $('[data-payer]'); b.textContent = 'Payer ' + montant;
    pe.on('ready', function () { b.disabled = false; });
  }
  function payerStripe(b) {
    var rep = PAIEMENT && PAIEMENT.rep; if (!rep || !PAIEMENT.stripe) return;
    b.disabled = true; b.textContent = 'Paiement en cours…'; alertePaiement('');
    // Certains moyens de paiement repartent vers leur banque puis reviennent ici.
    try { sessionStorage.setItem('anas-paiement', JSON.stringify({ snack: SNACK.id, compte: rep.stripe_account, secret: rep.client_secret, commande: rep.commande, lignes: etat.lignes })); } catch (x) {}
    PAIEMENT.stripe.confirmPayment({ elements: PAIEMENT.elements, redirect: 'if_required', confirmParams: { return_url: location.origin + location.pathname + '?paiement=retour' } })
      .then(function (r) {
        if (r.error) { b.disabled = false; b.textContent = 'Payer ' + euros(rep.commande.total_cents / 100); alertePaiement(r.error.message || 'Le paiement n’est pas passé.'); return; }
        if (['succeeded', 'processing', 'requires_capture'].indexOf(r.paymentIntent.status) >= 0) { PAIEMENT = null; confirmer(rep.commande); }
        else { b.disabled = false; b.textContent = 'Payer ' + euros(rep.commande.total_cents / 100); alertePaiement('Le paiement n’est pas terminé. Réessaie.'); }
      });
  }
  // Retour d'une banque (3D Secure ou moyen de paiement avec redirection).
  (function retourBanque() {
    var q = new URLSearchParams(location.search); if (q.get('paiement') !== 'retour' || !STRIPE) return;
    var s0; try { s0 = JSON.parse(sessionStorage.getItem('anas-paiement') || 'null'); } catch (x) {}
    history.replaceState(null, '', location.pathname);
    if (!s0 || s0.snack !== SNACK.id) return;
    chargerStripe().then(function () {
      var st = window.Stripe(R.stripePk, s0.compte ? { stripeAccount: s0.compte } : {});
      return st.retrievePaymentIntent(q.get('payment_intent_client_secret') || s0.secret);
    }).then(function (r) {
      if (r.paymentIntent && ['succeeded', 'processing'].indexOf(r.paymentIntent.status) >= 0) { etat.lignes = s0.lignes; confirmer(s0.commande); }
      else toast('Le paiement n’est pas passé : ton panier t’attend.');
    }).catch(function () {});
  })();

  pied.addEventListener('click', function (e) {
    if (e.target.closest('[data-fermer-tiroir]')) { cacher(tiroir); return; }
    if (e.target.closest('[data-suite]')) {
      if (etape === 'panier') { etape = 'infos'; rendre(); return; }
      if (etape === 'infos' && verifier()) { etape = 'paiement'; rendre(); }
      return;
    }
    var sp = e.target.closest('[data-sur-place]');
    if (sp && !sp.disabled) { validerSurPlace(sp); return; }
    var b = e.target.closest('[data-payer]');
    if (b && !b.disabled) {
      if (STRIPE) { payerStripe(b); return; }
      b.disabled = true; b.textContent = 'Paiement en cours…';
      setTimeout(confirmer, 1300);
    }
  });
  corps.addEventListener('click', function (e) {
    var r = e.target.closest('[data-reglement]'); if (!r) return;
    etat.infos.reglement = r.getAttribute('data-reglement'); garder(); rendre();
  });
  corps.addEventListener('input', function (e) { if (e.target.closest('[data-form]') && e.target.name !== 'adresse') lire(); });

  /* ===================== 3. Commande payee ===================== */
  function confirmer(srv, surPlace) {
    // Le client vient de la voir en grand : pas de fenetre « VOTRE COMMANDE » s'il recharge tout de suite.
    try { if (srv && srv.id) sessionStorage.setItem('anas-commande-vue', srv.id); } catch (x) {}
    var i = etat.infos, liv = i.mode === 'livraison';
    var e = srv ? { heure: new Date(srv.heure_prevue), minutes: Math.max(0, Math.round((new Date(srv.heure_prevue) - Date.now()) / 60000)), programme: !!srv.creneau } : estimation();
    var num = srv ? String(srv.numero) : 'AG-' + String(Math.floor(1000 + Math.random() * 9000));
    var paye = srv ? srv.total_cents / 100 : total(), lignes = etat.lignes.slice();
    var c = $('[data-confirmation]');
    c.innerHTML = '<div class="conf-in">' +
      '<div class="conf-check" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/></svg></div>' +
      '<p class="conf-eti">' + (surPlace ? 'Commande envoyée' : 'Commande payée') + ' · n° ' + num + '</p>' +
      (liv
        ? '<h2>Livrée vers <span>' + hm(e.heure) + '</span></h2><p class="conf-dans">' + (e.programme ? 'commande programmée' : 'dans ' + e.minutes + ' minutes environ') + '</p>' +
          '<p class="conf-lieu">' + esc(i.adresse) + (i.complement ? '<br>' + esc(i.complement) : '') + '</p>' +
          '<div class="conf-consigne"><b>Le livreur t’appellera une fois en bas de chez toi</b>, ou s’il y a un souci. Garde ton téléphone près de toi.</div>'
        : '<h2>Rendez-vous à <span>' + hm(e.heure) + '</span></h2><p class="conf-dans">' + (e.programme ? 'commande programmée' : 'prête dans ' + e.minutes + ' minutes environ') + '</p>' +
          '<p class="conf-lieu">Anas Grill ' + esc(SNACK.nom) + '<br>' + esc(SNACK.adresse) + '</p>' +
          '<div class="conf-consigne"><b>Donne ton numéro ' + num + ' au comptoir.</b> <a href="https://www.google.com/maps/dir/?api=1&destination=' + SNACK.lat + ',' + SNACK.lng + '" target="_blank" rel="noopener">Itinéraire</a></div>') +
      '<div class="conf-recap">' + lignes.map(function (l) { return '<div><span>' + l.qte + ' × ' + esc((PLATS[l.id] || l).n) + '</span><span>' + euros(l.prix * l.qte) + '</span></div>'; }).join('') + '<div class="conf-total"><span>' + (surPlace ? 'À payer au comptoir' : 'Payé') + '</span><span>' + euros(paye) + '</span></div></div>' +
      (srv ? '' : '<p class="conf-demo">Aperçu : ' + (surPlace ? 'commande simulée' : 'paiement simulé') + ', aucune commande n’a été envoyée.</p>') +
      '<a class="bouton bouton-ligne" href="./">Nouvelle commande</a></div>';
    etat.lignes = []; garder(); majBarre();
    cacher(tiroir); c.hidden = false; requestAnimationFrame(function () { c.classList.add('visible'); });
    window.scrollTo(0, 0);
  }

  /* --- Les onglets suivent la lecture de la carte --- */
  var onglets = $('[data-onglets]');
  if (onglets && 'IntersectionObserver' in window) {
    var liens = {}, actif = null, bande = onglets.querySelector('.onglets-in');
    onglets.querySelectorAll('a').forEach(function (a) { liens[a.getAttribute('href').slice(1)] = a; });
    var obs = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        if (!en.isIntersecting) return;
        var a = liens[en.target.id]; if (!a || a === actif) return;
        if (actif) actif.classList.remove('actif');
        actif = a; a.classList.add('actif');
        bande.scrollTo({ left: a.offsetLeft - bande.clientWidth / 2 + a.clientWidth / 2, behavior: 'smooth' });
      });
    }, { rootMargin: '-30% 0px -65% 0px' });
    document.querySelectorAll('.categorie').forEach(function (sec) { obs.observe(sec); });
  }
})();
