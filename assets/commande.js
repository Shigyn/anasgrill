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
  var pot = function (n) { return '<i class="sauce-pot" style="--c:' + (TEINTES[n] || '#e2ae1c') + '"></i>'; };
  var PLATS = {};
  D.carte.forEach(function (c) { c.items.forEach(function (i) { PLATS[i.id] = i; }); });

  /* --- Le panier, garde dans le navigateur, un par snack --- */
  var CLE = 'anas-panier-' + SNACK.id;
  var etat = { lignes: [], infos: { mode: 'emporter' } };
  try { var lu = JSON.parse(localStorage.getItem(CLE) || 'null'); if (lu && lu.lignes) etat = lu; } catch (e) {}
  etat.infos = etat.infos || { mode: 'emporter' };
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
  function prixFiche() {
    var i = enCours.plat, p = i.p;
    (i.groupes || []).forEach(function (g) {
      (enCours.choix[g.id] || []).forEach(function (n) { var o = g.options.filter(function (x) { return x.n === n; })[0]; if (o) p += o.p; });
    });
    return p;
  }
  function ouvrirFiche(i) {
    i.groupes = i.groupes || [];
    enCours = { plat: i, choix: {}, qte: 1 };
    i.groupes.forEach(function (g) { if (g.min === 1 && g.max === 1) enCours.choix[g.id] = [g.options[0].n]; });
    // Un choix unique facultatif (le gratine) : « Sans » coche par defaut, pour pouvoir revenir en arriere.
    var optionsDe = function (g) { return g.max === 1 && g.min === 0 ? [{ n: 'Sans', p: 0 }].concat(g.options) : g.options; };
    feuille.innerHTML =
      '<div class="feuille-tete">' + (i.photo ? '<img src="../photos/' + i.photo + '.webp" alt="">' : '') +
      '<button type="button" class="feuille-fermer" data-fermer-fiche aria-label="Fermer">×</button></div>' +
      '<div class="feuille-corps"><h3 id="feuille-titre">' + esc(i.n) + '</h3>' + (i.d ? '<p class="feuille-desc">' + esc(i.d) + '</p>' : '') +
      i.groupes.map(function (g) {
        if (g.type === 'retirer') {
          return '<fieldset class="groupe groupe-retirer" data-groupe="' + g.id + '" data-retirer><legend><b>' + esc(g.titre) + '</b><small>' + esc(g.aide) + '</small></legend><div class="ings">' +
            g.options.map(function (o) {
              return '<label class="ing"><input type="checkbox" value="' + esc(o.n) + '" checked>' + iconeDe(o.n) + '<span>' + esc(o.n) + '</span><em>Sans</em></label>';
            }).join('') + '</div></fieldset>';
        }
        if (g.type === 'sauces') {
          return '<fieldset class="groupe groupe-sauces" data-groupe="' + g.id + '" data-sauces>' +
            '<button type="button" class="sauce-carte" data-sauce-ouvrir aria-expanded="false"><span class="sauce-pots" data-sauce-pots>' + pot('Mayo') + pot('Ketchup') + pot('Algérienne') + '</span>' +
            '<span class="sauce-texte"><b>' + esc(g.titre) + '</b><small data-sauce-resume>Choisir · ' + esc(g.aide) + '</small></span><span class="sauce-fleche" aria-hidden="true"></span></button>' +
            '<div class="sauces" data-sauces-liste hidden>' + g.options.map(function (o) {
              return '<label class="sauce"><input type="checkbox" value="' + esc(o.n) + '">' + pot(o.n) + '<span>' + esc(o.n) + '</span></label>';
            }).join('') + '</div></fieldset>';
        }
        var type = g.max === 1 ? 'radio' : 'checkbox';
        return '<fieldset class="groupe" data-groupe="' + g.id + '"><legend><b>' + esc(g.titre) + '</b><small>' +
          (g.min ? 'Obligatoire' : 'Facultatif') + (g.max > 1 && g.aide ? ' · ' + esc(g.aide) : '') + '</small></legend><div class="options">' +
          optionsDe(g).map(function (o) {
            var coche = (enCours.choix[g.id] || []).indexOf(o.n) >= 0 || (o.n === 'Sans' && !(enCours.choix[g.id] || []).length);
            return '<label class="option"><input type="' + type + '" name="g-' + g.id + '" value="' + esc(o.n) + '"' + (coche ? ' checked' : '') + '><span>' + esc(o.n) + '</span>' + (o.p ? '<em>+' + (Number.isInteger(o.p) ? o.p + ' €' : euros(o.p)) + '</em>' : '') + '</label>';
          }).join('') + '</div></fieldset>';
      }).join('') + '</div>' +
      '<div class="feuille-pied"><div class="qte"><button type="button" data-q="-1" aria-label="Moins">−</button><span data-q-n>1</span><button type="button" data-q="1" aria-label="Plus">+</button></div>' +
      (i.p == null ? '<button type="button" class="bouton bouton-feu" disabled>Prix bientôt</button></div>'
        : '<button type="button" class="bouton bouton-feu" data-ajouter-fiche>Ajouter · <span data-prix-fiche>' + euros(i.p) + '</span></button></div>');
    majFiche();
    montrer(feuille);
    feuille.querySelector('.feuille-corps').scrollTop = 0;
  }
  function majFiche() {
    var pf = $('[data-prix-fiche]', feuille); if (pf) pf.textContent = euros(prixFiche() * enCours.qte);
    $('[data-q-n]', feuille).textContent = enCours.qte;
    enCours.plat.groupes.forEach(function (g) {
      if (g.type === 'sauces') {
        var ch = enCours.choix[g.id] || [], f = feuille.querySelector('[data-groupe="' + g.id + '"]');
        f.querySelector('[data-sauce-resume]').textContent = ch.length ? ch.join(' + ') : 'Choisir · ' + g.aide;
        f.classList.toggle('choisie', ch.length > 0);
        f.querySelector('[data-sauce-pots]').innerHTML = (ch.length ? ch : ['Mayo', 'Ketchup', 'Algérienne']).map(pot).join('');
        if (g.max > 1) f.querySelectorAll('input').forEach(function (inp) { inp.disabled = ch.length >= g.max && !inp.checked; });
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
    var gs = enCours.plat.groupes.filter(function (g) { return g.id === f.getAttribute('data-groupe'); })[0];
    if (gs && gs.type === 'sauces' && gs.max === 1 && e.target.checked) f.querySelectorAll('input').forEach(function (x) { if (x !== e.target) x.checked = false; });
    enCours.choix[f.getAttribute('data-groupe')] = [].map.call(f.querySelectorAll('input:checked'), function (x) { return x.value; }).filter(function (v) { return v !== 'Sans'; });
    majFiche();
    if (gs && gs.type === 'sauces' && enCours.choix[gs.id].length >= gs.max) setTimeout(function () { ouvrirSauces(f, false); }, 350);
  });
  function ouvrirSauces(f, ouvert) {
    var b = f.querySelector('[data-sauce-ouvrir]'), l = f.querySelector('[data-sauces-liste]');
    b.setAttribute('aria-expanded', ouvert ? 'true' : 'false'); l.hidden = !ouvert; f.classList.toggle('ouverte', ouvert);
  }
  feuille.addEventListener('click', function (e) {
    if (e.target.closest('[data-fermer-fiche]')) { cacher(feuille); return; }
    var so = e.target.closest('[data-sauce-ouvrir]');
    if (so) { ouvrirSauces(so.closest('[data-sauces]'), so.getAttribute('aria-expanded') !== 'true'); return; }
    var q = e.target.closest('[data-q]');
    if (q) { enCours.qte = Math.max(1, Math.min(20, enCours.qte + +q.getAttribute('data-q'))); majFiche(); return; }
    if (e.target.closest('[data-ajouter-fiche]')) {
      var manque = enCours.plat.groupes.filter(function (g) { return (enCours.choix[g.id] || []).length < g.min; })[0];
      if (manque) { toast('Choisis : ' + manque.titre.toLowerCase()); return; }
      ajouter(enCours.plat, enCours.choix, enCours.qte, prixFiche()); cacher(feuille);
    }
  });

  function resume(i, choix) {
    return (i.groupes || []).map(function (g) {
      if (g.type === 'retirer') return (choix[g.id] || []).map(function (n) { return 'sans ' + n.toLowerCase(); }).join(', ');
      if (g.type === 'sauces') return (choix[g.id] || []).length ? 'sauce ' + choix[g.id].join(' + ').toLowerCase() : '';
      var c = (choix[g.id] || []).filter(function (n) { return !/^Seul$|^Normal$/.test(n); });
      return c.length ? c.join(', ') : '';
    }).filter(Boolean).join(' · ');
  }
  function ajouter(i, choix, qte, prixU) {
    var cle = i.id + '|' + JSON.stringify(choix);
    var l = etat.lignes.filter(function (x) { return x.k === cle; })[0];
    if (l) l.qte += qte; else etat.lignes.push({ k: cle, id: i.id, choix: choix, qte: qte, prix: prixU == null ? i.p : prixU, resume: resume(i, choix) });
    garder(); majBarre(true); toast(i.n + ' ajouté');
  }

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
      var p = PLATS[l.id];
      return '<li class="ligne"><div class="ligne-texte"><b>' + esc(p.n) + '</b>' + (l.resume ? '<small>' + esc(l.resume) + '</small>' : '') + '</div>' +
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
      '<div class="segment" role="radiogroup" aria-label="Mode"><label><input type="radio" name="mode" value="emporter"' + (!liv ? ' checked' : '') + '><span>À emporter</span></label><label><input type="radio" name="mode" value="livraison"' + (liv ? ' checked' : '') + '><span>En livraison</span></label></div>' +
      (liv ? '<label class="champ champ-adresse"><span>Adresse de livraison</span><input name="adresse" autocomplete="off" placeholder="Numéro et rue, ville" value="' + esc(i.adresse) + '" data-adr-champ><ul class="suggestions" data-adr-sugg hidden></ul></label>' +
        '<label class="champ"><span>Étage, code, interphone <small>(facultatif)</small></span><input name="complement" value="' + esc(i.complement) + '"></label>' +
        '<p class="info-zone" data-zone></p>' : '<p class="info-zone ok">À retirer chez Anas Grill ' + esc(SNACK.nom) + ', ' + esc(SNACK.adresse) + '.</p>') +
      '<label class="champ"><span>Prénom</span><input name="prenom" autocomplete="given-name" value="' + esc(i.prenom) + '" required></label>' +
      '<label class="champ"><span>Téléphone <small>' + (liv ? '(le livreur t’appelle à son arrivée)' : '(si la cuisine a besoin de te joindre)') + '</small></span><input name="tel" type="tel" inputmode="tel" autocomplete="tel" value="' + esc(i.tel) + '" required></label>' +
      '<label class="champ"><span>Un mot pour la cuisine <small>(facultatif)</small></span><input name="note" placeholder="Sans oignons, allergie…" value="' + esc(i.note) + '"></label>' +
      '<p class="alerte" data-alerte hidden></p></form>';
    pied.innerHTML = '<div class="total"><span>Total</span><b>' + euros(total()) + '</b></div><button type="button" class="bouton bouton-feu" data-suite>Passer au paiement</button>';
    corps.querySelectorAll('[name=mode]').forEach(function (r) { r.addEventListener('change', function () { lire(); etat.infos.mode = r.value; garder(); rendre(); }); });
    if (liv) { brancherAdresse(); majZone(); }
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
    }
    if (!err && (i.prenom || '').length < 2) err = 'Indique ton prénom.';
    if (!err && (i.tel || '').replace(/\D/g, '').length < 10) err = 'Indique un numéro de téléphone valide : on t’appelle si besoin.';
    var a = $('[data-alerte]'); a.hidden = !err; a.textContent = err;
    return !err;
  }

  /* --- L'heure estimee --- */
  function estimation() {
    var i = etat.infos, min = R.preparation || 15;
    if (i.mode === 'livraison' && i.lat != null) min += (R.departLivreur || 5) + Math.round(distanceKm(i.lat, i.lng) * (R.minutesParKm || 3));
    var pas = R.pas || 5, t = new Date(Date.now() + min * 60000);
    t.setSeconds(0, 0); t.setMinutes(Math.ceil(t.getMinutes() / pas) * pas);
    // Production : le serveur reserve ce creneau, ou le suivant s'il est plein.
    return { heure: t, minutes: Math.max(min, Math.round((t - Date.now()) / 60000)) };
  }
  var hm = function (d) { return d.getHours() + 'h' + String(d.getMinutes()).padStart(2, '0'); };

  /* --- Le paiement (simule dans l'apercu) --- */
  function rendrePaiement() {
    var i = etat.infos, e = estimation(), liv = i.mode === 'livraison';
    corps.innerHTML =
      '<div class="recap"><small>' + (liv ? 'Livraison' : 'À emporter') + '</small><b>' + (liv ? 'Chez toi vers ' : 'Prêt à ') + hm(e.heure) + '</b><span>' + esc(liv ? i.adresse + (i.complement ? ' · ' + i.complement : '') : 'Anas Grill ' + SNACK.nom + ', ' + SNACK.adresse) + '</span></div>' +
      '<div class="recap"><small>' + nb() + ' article' + (nb() > 1 ? 's' : '') + '</small>' + etat.lignes.map(function (l) { return '<div class="recap-ligne"><span>' + l.qte + ' × ' + esc(PLATS[l.id].n) + '</span><span>' + euros(l.prix * l.qte) + '</span></div>'; }).join('') + '</div>' +
      '<div class="carte-paiement"><div class="cp-tete"><b>Carte bancaire</b><span class="cp-logos">CB · Visa · Mastercard · Apple Pay</span></div>' +
      '<div class="cp-champ">•••• •••• •••• 4242</div><div class="cp-deux"><div class="cp-champ">12 / 28</div><div class="cp-champ">•••</div></div>' +
      '<p class="cp-demo">Aperçu : paiement simulé, rien n’est débité. Une fois en ligne, ce cadre est le paiement sécurisé Stripe.</p></div>';
    pied.innerHTML = '<div class="total"><span>À payer</span><b>' + euros(total()) + '</b></div><button type="button" class="bouton bouton-feu" data-payer>Payer ' + euros(total()) + '</button>';
  }

  pied.addEventListener('click', function (e) {
    if (e.target.closest('[data-fermer-tiroir]')) { cacher(tiroir); return; }
    if (e.target.closest('[data-suite]')) {
      if (etape === 'panier') { etape = 'infos'; rendre(); return; }
      if (etape === 'infos' && verifier()) { etape = 'paiement'; rendre(); }
      return;
    }
    var b = e.target.closest('[data-payer]');
    if (b) {
      b.disabled = true; b.textContent = 'Paiement en cours…';
      setTimeout(confirmer, 1300);
    }
  });
  corps.addEventListener('input', function (e) { if (e.target.closest('[data-form]') && e.target.name !== 'adresse') lire(); });

  /* ===================== 3. Commande payee ===================== */
  function confirmer() {
    var i = etat.infos, e = estimation(), liv = i.mode === 'livraison';
    var num = 'AG-' + String(Math.floor(1000 + Math.random() * 9000));
    var paye = total(), lignes = etat.lignes.slice();
    var c = $('[data-confirmation]');
    c.innerHTML = '<div class="conf-in">' +
      '<div class="conf-check" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/></svg></div>' +
      '<p class="conf-eti">Commande payée · n° ' + num + '</p>' +
      (liv
        ? '<h2>Livrée vers <span>' + hm(e.heure) + '</span></h2><p class="conf-dans">dans ' + e.minutes + ' minutes environ</p>' +
          '<p class="conf-lieu">' + esc(i.adresse) + (i.complement ? '<br>' + esc(i.complement) : '') + '</p>' +
          '<div class="conf-consigne"><b>Le livreur t’appellera une fois en bas de chez toi</b>, ou s’il y a un souci. Garde ton téléphone près de toi.</div>'
        : '<h2>Rendez-vous à <span>' + hm(e.heure) + '</span></h2><p class="conf-dans">prête dans ' + e.minutes + ' minutes environ</p>' +
          '<p class="conf-lieu">Anas Grill ' + esc(SNACK.nom) + '<br>' + esc(SNACK.adresse) + '</p>' +
          '<div class="conf-consigne"><b>Donne ton numéro ' + num + ' au comptoir.</b> <a href="https://www.google.com/maps/dir/?api=1&destination=' + SNACK.lat + ',' + SNACK.lng + '" target="_blank" rel="noopener">Itinéraire</a></div>') +
      '<div class="conf-recap">' + lignes.map(function (l) { return '<div><span>' + l.qte + ' × ' + esc(PLATS[l.id].n) + '</span><span>' + euros(l.prix * l.qte) + '</span></div>'; }).join('') + '<div class="conf-total"><span>Payé</span><span>' + euros(paye) + '</span></div></div>' +
      '<p class="conf-demo">Aperçu : paiement simulé, aucune commande n’a été envoyée.</p>' +
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
