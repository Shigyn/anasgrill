/* ===================================================================
   Anas Grill — la page Gerant (LocWeb, 2026-10-15)
   Un seul code, les 8 snacks : chiffre d'affaires et commandes (total et
   par snack, sur la periode choisie), remboursements, pause, offre du
   moment, fermetures exceptionnelles, etat des tablettes, export Excel.
   =================================================================== */
(function () {
  'use strict';
  var CFG = window.LOCWEB_CONFIG || {};
  var FN = CFG.supabaseUrl + '/functions/v1/ag-espace';
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var euros = function (c) { return (c / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'; };
  var jour = function (d) { return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
  var hm = function (d) { d = new Date(d); return d.getHours() + 'h' + String(d.getMinutes()).padStart(2, '0'); };
  var session = null; try { session = JSON.parse(localStorage.getItem('ag-gerant') || 'null'); } catch (e) {}
  var periode = { du: jour(new Date()), au: jour(new Date()) }, filtre = 'tous', donnees = null, alerteVue = false;

  function appel(action, extra) {
    return fetch(FN, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ action: action, jeton: session && session.jeton }, extra || {})) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) {
        if (r.status === 401 && action !== 'connexion') { session = null; try { localStorage.removeItem('ag-gerant'); } catch (e) {} ecranCode(); }
        if (!r.ok) throw new Error(j.refus || j.error || 'Erreur serveur'); return j; }); });
  }

  function ecranCode(msg) {
    document.body.className = 'cuisine-code';
    $('#app').innerHTML = '<form class="code" data-code><div class="code-logo">' + $('[data-logo]').innerHTML + '</div><h1>Gérant</h1><p>Tape ton code à 8 chiffres.</p>' +
      '<input inputmode="numeric" maxlength="8" autocomplete="off" placeholder="••••••••" data-code-champ aria-label="Code"><button class="bouton bouton-feu" type="submit">Entrer</button><p class="code-err" data-code-err>' + esc(msg || '') + '</p></form>';
    $('[data-code-champ]').focus();
    $('[data-code]').addEventListener('submit', function (e) {
      e.preventDefault(); var v = $('[data-code-champ]').value.replace(/\D/g, '');
      appel('connexion', { code: v }).then(function (j) {
        if (j.role !== 'gerant') throw new Error('Ce code est celui d’une cuisine.');
        session = { jeton: j.jeton }; try { localStorage.setItem('ag-gerant', JSON.stringify(session)); } catch (x) {} demarrer();
      }).catch(function (x) { $('[data-code-err]').textContent = x.message; });
    });
  }

  // Le menu de gauche (memes petites cartes que la cuisine) et ses ecrans.
  var ICONES = {
    resume: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    commandes: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
    snacks: '<path d="M4 10h16l-1.5-5h-13z"/><path d="M5 10v10h14V10"/><path d="M10 20v-5h4v5"/>',
    rembourse: '<path d="M4 12a8 8 0 1 0 2.3-5.7"/><path d="M4 4v5h5"/><path d="M12 8v8M9.5 10.5h4a1.5 1.5 0 0 1 0 3h-3a1.5 1.5 0 0 0 0 3h4"/>',
    offre: '<path d="M3 11l15-6v14L3 13z"/><path d="M7 13.5V18a2 2 0 0 0 4 0v-3"/>',
    fermetures: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/><path d="m10 14 4 4M14 14l-4 4"/>',
    export: '<path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 21h14"/>',
    sortir: '<path d="M15 4h4v16h-4"/><path d="M10 8l-4 4 4 4M6 12h10"/>'
  };
  var ECRANS = {
    resume: 'Vue d’ensemble', commandes: 'Commandes', snacks: 'Snacks et tablettes', rembourse: 'Remboursements',
    offre: 'Offre du moment', fermetures: 'Fermetures exceptionnelles'
  };
  var AVEC_PERIODE = { resume: 1, commandes: 1, rembourse: 1 };
  var vue = 'resume';
  function carteMenu(attr, cle, nom) {
    return '<button type="button" class="cu-carte" ' + attr + ' data-carte="' + cle + '">' +
      '<span class="cu-ico" aria-hidden="true"><svg viewBox="0 0 24 24">' + ICONES[cle] + '</svg></span>' +
      '<span class="cu-carte-txt"><b>' + nom + '</b><small data-c-sous></small></span></button>';
  }
  function sousCarte(cle, t) { var c = $('[data-carte="' + cle + '"]'); if (c) c.querySelector('[data-c-sous]').textContent = t; return c; }
  // --- L'offre du moment : formulaire, photo, apercu ---
  var SANS_DE_BASE = ['Salade', 'Tomate', 'Oignon', 'Cornichons', 'Fromage'];
  var photoOffre = '';
  function puce(v, coche) { return '<label class="ge-puce"><input type="checkbox" value="' + esc(v) + '"' + (coche ? ' checked' : '') + '><span>' + esc(v) + '</span></label>'; }
  function remplirOffre(o) {
    o = o || {};
    photoOffre = o.image || '';
    $('[data-offre-titre]').value = o.titre || '';
    $('[data-offre-texte]').value = o.texte || '';
    $('[data-offre-prix]').value = o.prix ? String(o.prix.toFixed(2)).replace('.', ',') : '';
    $('[data-offre-max]').value = o.sauces_max === 1 ? '1' : '2';
    var sauces = o.titre ? (o.sauces || []) : (window.AG_SAUCES || []);
    $('[data-offre-sauces]').innerHTML = (window.AG_SAUCES || []).map(function (n) { return puce(n, sauces.indexOf(n) >= 0); }).join('');
    var sans = o.retirer || [];
    $('[data-offre-sans]').innerHTML = SANS_DE_BASE.concat(sans.filter(function (n) { return SANS_DE_BASE.indexOf(n) < 0; })).map(function (n) { return puce(n, sans.indexOf(n) >= 0); }).join('');
    $('[data-offre-photo-etat]').textContent = photoOffre ? 'Changer la photo' : 'Choisir une photo';
    apercuOffre();
  }
  function cochees(sel) { return [].map.call(document.querySelectorAll(sel + ' input:checked'), function (x) { return x.value; }); }
  function lireOffre() {
    return { titre: $('[data-offre-titre]').value.trim(), texte: $('[data-offre-texte]').value.trim(), image: photoOffre,
      prix: parseFloat(($('[data-offre-prix]').value || '').replace(',', '.')) || 0,
      sauces: cochees('[data-offre-sauces]'), sauces_max: +$('[data-offre-max]').value, retirer: cochees('[data-offre-sans]') };
  }
  function apercuOffre() {
    var o = lireOffre();
    var details = [o.sauces.length ? (o.sauces_max === 1 ? '1 sauce au choix' : 'jusqu’à 2 sauces') : 'sans choix de sauce', o.retirer.length ? 'sans ' + o.retirer.join(', sans ').toLowerCase() + ' possible' : ''].filter(Boolean).join(' · ');
    $('[data-offre-apercu]').innerHTML = '<li class="plat plat-offre"><div class="plat-bouton">' +
      '<span class="plat-photo">' + (photoOffre ? '<img src="' + esc(photoOffre) + '" alt="">' : '') + '</span>' +
      '<span class="plat-texte"><b>' + esc(o.titre || 'Titre de l’offre') + '</b>' + (o.texte ? '<small>' + esc(o.texte) + '</small>' : '') + '</span>' +
      '<span class="plat-bas"><span class="prix">' + (o.prix ? euros(Math.round(o.prix * 100)) : '— €') + '</span><span class="plat-plus">+</span></span></div></li>' +
      '<li class="ge-apercu-info">' + esc(details) + '</li>';
  }
  // La photo est reduite ici (1000 px, webp) avant l'envoi : rapide, meme en 4G.
  function envoyerPhoto(f) {
    var etatPh = $('[data-offre-photo-etat]'); etatPh.textContent = 'Envoi de la photo…';
    var img = new Image(), url = URL.createObjectURL(f);
    img.onload = function () {
      var k = Math.min(1, 1000 / Math.max(img.width, img.height)), c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
      appel('image', { donnees: c.toDataURL('image/webp', 0.82).split(',')[1] })
        .then(function (j) { photoOffre = j.url; etatPh.textContent = 'Photo prête ✓ · changer'; apercuOffre(); })
        .catch(function (e) { etatPh.textContent = 'Choisir une photo'; alert(e.message); });
    };
    img.onerror = function () { etatPh.textContent = 'Choisir une photo'; alert('Ce fichier n’est pas une photo.'); };
    img.src = url;
  }

  // --- L'export Excel : on choisit les colonnes, puis on telecharge ---
  var COLONNES = [
    ['jour', 'Jour', function (c) { return c.jour; }],
    ['heure', 'Heure', function (c) { return hm(c.payee_le || c.heure_prevue); }],
    ['snack', 'Snack', function (c, nom) { return nom[c.etablissement_id]; }],
    ['numero', 'N°', function (c) { return c.numero; }],
    ['client', 'Client', function (c) { return c.prenom; }],
    ['tel', 'Téléphone', function (c) { return c.telephone; }],
    ['contenu', 'Contenu', function (c) { return c.lignes.map(function (x) { return x.qte + ' x ' + x.n + (x.resume ? ' (' + x.resume + ')' : ''); }).join(' | '); }],
    ['total', 'Total TTC', function (c) { return (c.total_cents / 100).toFixed(2).replace('.', ','); }],
    ['rembourse', 'Remboursé', function (c) { return (c.rembourse_cents / 100).toFixed(2).replace('.', ','); }],
    ['net', 'Net', function (c) { return ((c.total_cents - c.rembourse_cents) / 100).toFixed(2).replace('.', ','); }],
    ['etat', 'État', function (c) { return { recue: 'À préparer', prete: 'Prête', remise: 'Remise', annulee: 'Annulée' }[c.statut] || c.statut; }]
  ];
  function panneauExport() {
    var gardees; try { gardees = JSON.parse(localStorage.getItem('ag-export-colonnes') || 'null'); } catch (x) {}
    var fr = function (d) { return d.slice(8, 10) + '/' + d.slice(5, 7) + '/' + d.slice(0, 4); };
    var d = document.createElement('div'); d.className = 'ge-alerte ge-modale';
    d.innerHTML = '<div class="ge-alerte-boite" role="dialog" aria-modal="true" aria-label="Export Excel"><h2>Export Excel</h2>' +
      '<p>Période : <b>' + (periode.du === periode.au ? 'le ' + fr(periode.du) : 'du ' + fr(periode.du) + ' au ' + fr(periode.au)) + '</b> (à changer en haut de la page).</p>' +
      '<label class="ge-ligne"><span>Snack</span><select data-ex-snack><option value="tous">Les 8 snacks</option>' + donnees.snacks.map(function (s) { return '<option value="' + s.id + '"' + (filtre === s.id ? ' selected' : '') + '>' + esc(s.nom) + '</option>'; }).join('') + '</select></label>' +
      '<p><b>Ce que tu veux dans le fichier</b></p><div class="ge-puces" data-ex-cols>' + COLONNES.map(function (k) { return puce(k[1], !gardees || gardees.indexOf(k[1]) >= 0); }).join('') + '</div>' +
      '<div class="cu-actions"><button type="button" class="cu-bouton cu-feu" data-ex-go>Télécharger</button><button type="button" class="cu-bouton cu-discret" data-ex-annuler>Annuler</button></div></div>';
    document.body.appendChild(d);
    d.addEventListener('click', function (e) {
      if (e.target === d || e.target.closest('[data-ex-annuler]')) { d.remove(); return; }
      if (!e.target.closest('[data-ex-go]')) return;
      var cols = [].map.call(d.querySelectorAll('[data-ex-cols] input:checked'), function (x) { return x.value; });
      if (!cols.length) { alert('Coche au moins une colonne.'); return; }
      try { localStorage.setItem('ag-export-colonnes', JSON.stringify(cols)); } catch (x) {}
      exporter(cols, d.querySelector('[data-ex-snack]').value); d.remove();
    });
  }

  function montrer(v) {
    vue = v;
    document.querySelectorAll('[data-ecran]').forEach(function (e) { e.hidden = e.getAttribute('data-ecran') !== v; });
    document.querySelectorAll('[data-vue]').forEach(function (b) { b.classList.toggle('cu-carte-on', b.getAttribute('data-vue') === v); });
    $('[data-titre]').textContent = ECRANS[v];
    $('[data-periode-zone]').hidden = !AVEC_PERIODE[v];
    window.scrollTo(0, 0);
  }

  function demarrer() {
    document.body.className = 'gerant';
    $('#app').innerHTML =
      '<aside class="cu-menu">' +
        '<div class="cu-marque"><div class="cu-logo">' + $('[data-logo]').innerHTML + '</div>' +
          '<div><small>Espace gérant</small><h1>Les 8 snacks</h1></div></div>' +
        '<nav class="cu-cartes" aria-label="Menu du gérant">' +
          carteMenu('data-vue="resume"', 'resume', 'Vue d’ensemble') +
          carteMenu('data-vue="commandes"', 'commandes', 'Commandes') +
          carteMenu('data-vue="snacks"', 'snacks', 'Snacks et tablettes') +
          carteMenu('data-vue="rembourse"', 'rembourse', 'Remboursements') +
          carteMenu('data-vue="offre"', 'offre', 'Offre du moment') +
          carteMenu('data-vue="fermetures"', 'fermetures', 'Fermetures') +
          carteMenu('data-export', 'export', 'Export Excel') +
          carteMenu('data-sortir', 'sortir', 'Se déconnecter') +
        '</nav></aside>' +
      '<main class="ge">' +
        '<header class="ge-tete"><h2 class="ge-titre" data-titre></h2>' +
          '<div class="ge-periode" role="group" aria-label="Période" data-periode-zone>' + [['jour', 'Aujourd’hui'], ['hier', 'Hier'], ['7', '7 jours'], ['mois', 'Ce mois']].map(function (p) { return '<button type="button" class="cu-bouton cu-discret" data-per="' + p[0] + '">' + p[1] + '</button>'; }).join('') +
          '<input type="date" data-du aria-label="Du"><input type="date" data-au aria-label="Au"></div></header>' +
        '<section data-ecran="resume"><div class="ge-kpi" data-kpi></div><h3>Par snack</h3><div class="ge-table-zone"><table class="ge-table" data-par-snack></table></div></section>' +
        '<section data-ecran="commandes" hidden><div class="ge-outils"><select data-filtre aria-label="Snack"></select></div><div class="ge-table-zone"><table class="ge-table" data-cmds></table></div></section>' +
        '<section data-ecran="snacks" hidden><p class="ge-aide">La tablette est « en ligne » quand elle a donné signe de vie il y a moins de 7 minutes. Le paiement doit être « activé » pour encaisser.</p><p class="ge-test" data-mode-test hidden><b>Mode test</b> : les paiements sont simulés, aucun argent réel n’est encaissé. Les vrais comptes des sociétés seront branchés à l’ouverture.</p><div class="ge-table-zone"><table class="ge-table" data-snacks></table></div></section>' +
        '<section data-ecran="rembourse" hidden><p class="ge-aide">Pour rembourser une commande : ouvre <b>Commandes</b> et touche <b>Rembourser</b> sur la ligne. Le client est remboursé sur sa carte sous 5 à 10 jours.</p><div class="ge-table-zone"><table class="ge-table" data-rembs></table></div></section>' +
        '<section data-ecran="offre" hidden><p class="ge-aide">L’offre s’affiche <b>tout en haut de la carte</b>, comme un plat : le client la personnalise et la commande.</p>' +
          '<form class="ge-offre-form" data-offre><div class="ge-champs">' +
            '<label class="ge-champ"><span>Pour</span><select data-offre-snack></select></label>' +
            '<label class="ge-champ ge-photo"><span>Photo</span><input type="file" accept="image/*" data-offre-photo><b data-offre-photo-etat>Choisir une photo</b></label>' +
            '<label class="ge-champ"><span>Titre</span><input data-offre-titre maxlength="60" placeholder="ex. Formule du soir" required></label>' +
            '<label class="ge-champ"><span>Description</span><textarea data-offre-texte maxlength="200" rows="3" placeholder="ex. Tacos 2 viandes, frites et boisson"></textarea></label>' +
            '<label class="ge-champ"><span>Prix (€)</span><input data-offre-prix inputmode="decimal" placeholder="12,00" required></label>' +
            '<fieldset class="ge-champ"><legend>Sauces au choix</legend><div class="ge-puces" data-offre-sauces></div>' +
              '<label class="ge-ligne"><span>Le client peut en prendre</span><select data-offre-max><option value="2">jusqu’à 2</option><option value="1">une seule</option></select></label></fieldset>' +
            '<fieldset class="ge-champ"><legend>Boutons « sans … »</legend><div class="ge-puces" data-offre-sans></div>' +
              '<div class="ge-ligne"><input data-offre-ajout maxlength="30" placeholder="Autre ingrédient (ex. Poivrons)"><button type="button" class="cu-bouton" data-offre-ajouter>Ajouter</button></div></fieldset>' +
            '<div class="cu-actions"><button class="cu-bouton cu-feu">Publier l’offre</button><button type="button" class="cu-bouton cu-discret" data-offre-retirer>Retirer l’offre</button></div>' +
          '</div><div class="ge-apercu"><small>Aperçu sur le site</small><ul class="plats" data-offre-apercu></ul></div></form>' +
          '<h3>En ligne en ce moment</h3><ul class="ge-ferm" data-offre-liste></ul></section>' +
        '<section data-ecran="fermetures" hidden><p class="ge-aide">Pendant une fermeture, le site n’accepte plus de commande pour ce snack.</p><form class="ge-offre" data-ferm><select data-ferm-snack aria-label="Snack"></select><input type="datetime-local" data-ferm-du aria-label="Du"><input type="datetime-local" data-ferm-au aria-label="Au"><input data-ferm-motif maxlength="80" placeholder="Motif (ex. Congés)"><button class="cu-bouton cu-feu">Ajouter</button></form><h3>Prévues</h3><ul class="ge-ferm" data-ferm-liste></ul></section>' +
      '</main>';
    montrer(vue);
    choisirPeriode('jour');
  }

  function choisirPeriode(p) {
    var d = new Date(), du = new Date(d);
    if (p === 'hier') { du.setDate(d.getDate() - 1); d = new Date(du); }
    if (p === '7') du.setDate(d.getDate() - 6);
    if (p === 'mois') du.setDate(1);
    periode = { du: jour(du), au: jour(d) };
    $('[data-du]').value = periode.du; $('[data-au]').value = periode.au;
    document.querySelectorAll('[data-per]').forEach(function (b) { b.classList.toggle('cu-actif', b.getAttribute('data-per') === p); });
    charger();
  }
  function charger() {
    return appel('tableau', periode).then(function (j) { donnees = j; afficher(); if (!alerteVue) { alerteVue = true; alerteComptes(); } }).catch(function (e) { alert(e.message); });
  }

  function afficher() {
    var snacks = donnees.snacks, cmds = donnees.commandes;
    var net = function (c) { return c.total_cents - c.rembourse_cents; };
    var ca = cmds.reduce(function (t, c) { return t + net(c); }, 0);
    $('[data-kpi]').innerHTML = [['Chiffre d’affaires', euros(ca)], ['Commandes', cmds.length], ['Panier moyen', cmds.length ? euros(Math.round(ca / cmds.length)) : '—'], ['Remboursé', euros(cmds.reduce(function (t, c) { return t + c.rembourse_cents; }, 0))]]
      .map(function (k) { return '<div><small>' + k[0] + '</small><b>' + k[1] + '</b></div>'; }).join('');
    var vu = function (s) {
      if (!s.cuisine_vue_le) return '<span class="cu-badge cu-rouge">jamais connectée</span>';
      var min = Math.round((Date.now() - new Date(s.cuisine_vue_le)) / 60000);
      return min <= 7 ? '<span class="cu-badge cu-vert">en ligne</span>' : '<span class="cu-badge cu-jaune">vue il y a ' + (min < 120 ? min + ' min' : Math.round(min / 60) + ' h') + '</span>';
    };
    $('[data-par-snack]').innerHTML = '<thead><tr><th>Snack</th><th>Chiffre d’affaires</th><th>Commandes</th><th>Panier moyen</th></tr></thead><tbody>' +
      snacks.map(function (s) {
        var l = cmds.filter(function (c) { return c.etablissement_id === s.id; }), t = l.reduce(function (t, c) { return t + net(c); }, 0);
        return '<tr><td><b>' + esc(s.nom) + '</b></td><td>' + euros(t) + '</td><td>' + l.length + '</td><td>' + (l.length ? euros(Math.round(t / l.length)) : '—') + '</td></tr>';
      }).join('') + '</tbody>';
    $('[data-mode-test]').hidden = !donnees.test;
    $('[data-snacks]').innerHTML = '<thead><tr><th>Snack</th><th>Tablette</th><th>Paiement</th><th>Commandes en ligne</th></tr></thead><tbody>' +
      snacks.map(function (s) {
        return '<tr><td><b>' + esc(s.nom) + '</b></td><td>' + vu(s) + '</td>' +
          '<td>' + badgeCompte(s) + '</td>' +
          '<td><button type="button" class="cu-bouton ' + (s.pause ? 'cu-actif' : 'cu-discret') + '" data-pause-snack="' + s.id + '">' + (s.pause ? 'En pause · reprendre' : 'Ouvertes · mettre en pause') + '</button></td></tr>';
      }).join('') + '</tbody>';
    var opts = '<option value="tous">Tous les snacks</option>' + snacks.map(function (s) { return '<option value="' + s.id + '"' + (filtre === s.id ? ' selected' : '') + '>' + esc(s.nom) + '</option>'; }).join('');
    $('[data-filtre]').innerHTML = opts;
    ['[data-offre-snack]', '[data-ferm-snack]'].forEach(function (sel, n) { var v = $(sel).value; $(sel).innerHTML = (n === 0 ? '<option value="tous">Les 8 snacks</option>' : '') + snacks.map(function (s) { return '<option value="' + s.id + '">' + esc(s.nom) + '</option>'; }).join(''); if (v) $(sel).value = v; });
    var nom = {}; snacks.forEach(function (s) { nom[s.id] = s.nom; });
    var l = cmds.filter(function (c) { return filtre === 'tous' || c.etablissement_id === filtre; });
    $('[data-cmds]').innerHTML = '<thead><tr><th>Jour</th><th>Snack</th><th>N°</th><th>Client</th><th>Contenu</th><th>Payé</th><th>État</th><th></th></tr></thead><tbody>' +
      (l.map(function (c) {
        var reste = c.total_cents - c.rembourse_cents;
        return '<tr><td>' + c.jour.slice(8, 10) + '/' + c.jour.slice(5, 7) + ' ' + hm(c.payee_le || c.heure_prevue) + '</td><td>' + esc(nom[c.etablissement_id]) + '</td><td>' + c.numero + '</td><td>' + esc(c.prenom) + '<br><small>' + esc(c.telephone) + '</small></td>' +
          '<td><small>' + c.lignes.map(function (x) { return x.qte + ' × ' + esc(x.n); }).join(', ') + '</small></td><td>' + euros(c.total_cents) + (c.rembourse_cents ? '<br><small>remb. ' + euros(c.rembourse_cents) + '</small>' : '') + '</td>' +
          '<td>' + esc({ recue: 'À préparer', prete: 'Prête', remise: 'Remise', annulee: 'Annulée' }[c.statut] || c.statut) + '</td>' +
          '<td>' + (reste > 0 ? '<button type="button" class="cu-bouton cu-discret" data-rembourser="' + c.id + '" data-reste="' + reste + '">Rembourser</button>' : '') + '</td></tr>';
      }).join('') || '<tr><td colspan="8">Aucune commande sur cette période.</td></tr>') + '</tbody>';
    var rb = cmds.filter(function (c) { return c.rembourse_cents > 0; });
    $('[data-rembs]').innerHTML = '<thead><tr><th>Jour</th><th>Snack</th><th>N°</th><th>Client</th><th>Payé</th><th>Remboursé</th></tr></thead><tbody>' +
      (rb.map(function (c) {
        return '<tr><td>' + c.jour.slice(8, 10) + '/' + c.jour.slice(5, 7) + '</td><td>' + esc(nom[c.etablissement_id]) + '</td><td>' + c.numero + '</td><td>' + esc(c.prenom) + '</td><td>' + euros(c.total_cents) + '</td><td><b>' + euros(c.rembourse_cents) + '</b></td></tr>';
      }).join('') || '<tr><td colspan="6">Aucun remboursement sur cette période.</td></tr>') + '</tbody>';
    var ol = snacks.filter(function (s) { return s.offre_du_moment && s.offre_du_moment.titre; });
    $('[data-offre-liste]').innerHTML = ol.map(function (s) { var o = s.offre_du_moment; return '<li><b>' + esc(s.nom) + '</b> · ' + esc(o.titre) + (o.prix ? ' · ' + euros(Math.round(o.prix * 100)) : '') + ' <button type="button" class="cu-bouton cu-discret" data-offre-modifier="' + s.id + '">Modifier</button></li>'; }).join('') || '<li>Aucune offre en ligne.</li>';
    if (!$('[data-offre-sauces]').innerHTML) remplirOffre(null);
    var fl = []; snacks.forEach(function (s) { (s.fermetures || []).forEach(function (f, i) { fl.push('<li><b>' + esc(s.nom) + '</b> du ' + new Date(f.du).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) + ' au ' + new Date(f.au).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) + (f.motif ? ' · ' + esc(f.motif) : '') + ' <button type="button" class="cu-bouton cu-discret" data-ferm-suppr="' + s.id + '|' + i + '">Supprimer</button></li>'); }); });
    $('[data-ferm-liste]').innerHTML = fl.join('') || '<li>Aucune.</li>';

    // Ce que chaque carte du menu resume.
    var pb = snacks.filter(function (s) { return probleme(s); }).length, enPause = snacks.filter(function (s) { return s.pause; }).length;
    sousCarte('resume', euros(ca) + ' · ' + cmds.length + ' commande' + (cmds.length > 1 ? 's' : ''));
    sousCarte('commandes', cmds.length ? cmds.length + ' sur la période' : 'Aucune sur la période');
    var cs = sousCarte('snacks', pb ? pb + ' problème' + (pb > 1 ? 's' : '') + ' de paiement' : enPause ? enPause + ' en pause' : 'Tout est ouvert');
    if (cs) cs.classList.toggle('cu-carte-alerte', !!(pb || enPause));
    sousCarte('rembourse', rb.length ? euros(rb.reduce(function (t, c) { return t + c.rembourse_cents; }, 0)) + ' remboursés' : 'Aucun sur la période');
    sousCarte('offre', ol.length ? ol.length + ' snack' + (ol.length > 1 ? 's' : '') + ' avec une offre' : 'Aucune en ligne');
    sousCarte('fermetures', fl.length ? fl.length + ' prévue' + (fl.length > 1 ? 's' : '') : 'Aucune prévue');
    sousCarte('export', 'Commandes de la période');
    sousCarte('sortir', 'Quitter cet appareil');
  }

  /* L'etat reel du compte Stripe de chaque societe. Un compte restreint (piece
     d'identite expiree, document manquant) ne peut plus encaisser : le gerant
     doit le savoir tout de suite, d'ou la fenetre d'alerte. */
  function probleme(s) {
    var c = (donnees.comptes || {})[s.id];
    if (!s.stripe_account_id || !c) return null;
    if (c.erreur) return 'compte de paiement introuvable';
    if (!c.encaisse) return 'ne peut plus encaisser les paiements en ligne';
    if (c.bloque) return 'compte bloqué par Stripe';
    if ((c.manque || []).length) return 'Stripe demande un document' + (c.echeance ? ' avant le ' + new Date(c.echeance * 1000).toLocaleDateString('fr-FR') : '');
    if (!c.vire) return 'les virements vers la banque sont suspendus';
    return null;
  }
  function badgeCompte(s) {
    if (!s.stripe_account_id) return '<span class="cu-badge cu-jaune">à activer</span>';
    var pb = probleme(s);
    if (pb) return '<span class="cu-badge cu-rouge">problème</span>';
    return donnees.test ? '<span class="cu-badge cu-bleu" title="Compte de test : aucun vrai paiement">activé · test</span>' : '<span class="cu-badge cu-vert">activé</span>';
  }
  function alerteComptes() {
    var l = donnees.snacks.map(function (s) { var pb = probleme(s); return pb ? { nom: s.nom, pb: pb } : null; }).filter(Boolean);
    var deja = $('.ge-alerte'); if (deja) deja.remove();
    if (!l.length) return;
    var d = document.createElement('div'); d.className = 'ge-alerte';
    d.innerHTML = '<div class="ge-alerte-boite" role="alertdialog" aria-label="Problème de paiement"><h2>Paiement en ligne : à régler</h2>' +
      '<ul>' + l.map(function (x) { return '<li><b>Anas Grill ' + esc(x.nom) + '</b> : ' + esc(x.pb) + '.</li>'; }).join('') + '</ul>' +
      '<p>Connecte-toi à l’espace Stripe de la société concernée (Paramètres → Compte) pour fournir ce qui manque, ou appelle LocWeb.</p>' +
      '<button type="button" class="cu-bouton cu-feu" data-alerte-ok>J’ai compris</button></div>';
    document.body.appendChild(d);
    d.querySelector('[data-alerte-ok]').addEventListener('click', function () { d.remove(); });
  }

  function exporter(cols, snack) {
    var nom = {}; donnees.snacks.forEach(function (s) { nom[s.id] = s.nom; });
    var l = donnees.commandes.filter(function (c) { return snack === 'tous' || c.etablissement_id === snack; });
    var choisies = COLONNES.filter(function (k) { return cols.indexOf(k[1]) >= 0; });
    var lignes = [choisies.map(function (k) { return k[1]; })].concat(l.map(function (c) { return choisies.map(function (k) { return k[2](c, nom); }); }));
    var csv = String.fromCharCode(0xFEFF) + lignes.map(function (r) { return r.map(function (v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; }).join(';'); }).join(String.fromCharCode(13, 10));
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = 'anas-grill-' + snack + '-' + periode.du + '_' + periode.au + '.csv'; a.click();
  }

  document.addEventListener('click', function (e) {
    var t = e.target, per = t.closest('[data-per]');
    if (per) { choisirPeriode(per.getAttribute('data-per')); return; }
    if (t.closest('[data-export]')) { if (donnees) panneauExport(); return; }
    if (t.closest('[data-offre-ajouter]')) {
      var aj = $('[data-offre-ajout]'), v0 = aj.value.trim();
      if (v0) { $('[data-offre-sans]').insertAdjacentHTML('beforeend', puce(v0.charAt(0).toUpperCase() + v0.slice(1), true)); aj.value = ''; apercuOffre(); }
      return;
    }
    var mo = t.closest('[data-offre-modifier]');
    if (mo) { var so = donnees.snacks.filter(function (x) { return x.id === mo.getAttribute('data-offre-modifier'); })[0]; $('[data-offre-snack]').value = so.id; remplirOffre(so.offre_du_moment); window.scrollTo(0, 0); return; }
    var vv = t.closest('[data-vue]'); if (vv) { montrer(vv.getAttribute('data-vue')); return; }
    if (t.closest('[data-sortir]')) {
      if (!confirm('Se déconnecter de l’espace gérant sur cet appareil ?')) return;
      session = null; try { localStorage.removeItem('ag-gerant'); } catch (x) {} ecranCode(); return;
    }
    var ps = t.closest('[data-pause-snack]');
    if (ps) { var s = donnees.snacks.filter(function (x) { return x.id === ps.getAttribute('data-pause-snack'); })[0]; appel('pause', { snack: s.id, valeur: !s.pause }).then(charger); return; }
    var rb = t.closest('[data-rembourser]');
    if (rb) {
      var reste = +rb.getAttribute('data-reste');
      var v = prompt('Montant à rembourser (maximum ' + (reste / 100).toFixed(2).replace('.', ',') + ' €). Laisse tel quel pour tout rembourser.', (reste / 100).toFixed(2).replace('.', ','));
      if (v == null) return;
      var cents = Math.round(parseFloat(v.replace(',', '.')) * 100);
      if (!(cents > 0)) { alert('Montant invalide.'); return; }
      if (!confirm('Rembourser ' + euros(cents) + ' au client ? Le remboursement part tout de suite sur sa carte.')) return;
      appel('rembourser', { id: rb.getAttribute('data-rembourser'), montant_cents: cents }).then(function () { alert('Remboursement envoyé : le client le voit sur son compte sous 5 à 10 jours.'); charger(); }).catch(function (x) { alert(x.message); });
      return;
    }
    if (t.closest('[data-offre-retirer]')) { appel('offre', { snack: $('[data-offre-snack]').value, titre: '' }).then(function () { alert('Offre retirée.'); charger(); }); return; }
    var fs = t.closest('[data-ferm-suppr]');
    if (fs) {
      var p = fs.getAttribute('data-ferm-suppr').split('|'), sn = donnees.snacks.filter(function (x) { return x.id === p[0]; })[0];
      var l = (sn.fermetures || []).slice(); l.splice(+p[1], 1);
      appel('fermetures', { snack: sn.id, fermetures: l }).then(charger);
    }
  });
  document.addEventListener('input', function (e) { if (e.target.closest('[data-offre]')) apercuOffre(); });
  document.addEventListener('change', function (e) {
    if (e.target.matches('[data-offre-photo]') && e.target.files[0]) { envoyerPhoto(e.target.files[0]); e.target.value = ''; return; }
    if (e.target.closest('[data-offre]')) apercuOffre();
    if (e.target.matches('[data-filtre]')) { filtre = e.target.value; afficher(); }
    if (e.target.matches('[data-du], [data-au]')) { periode = { du: $('[data-du]').value, au: $('[data-au]').value }; document.querySelectorAll('[data-per]').forEach(function (b) { b.classList.remove('cu-actif'); }); charger(); }
  });
  document.addEventListener('submit', function (e) {
    if (e.target.matches('[data-offre]')) {
      e.preventDefault();
      var o = lireOffre();
      if (!(o.prix >= 0.5)) { alert('Indique le prix de l’offre.'); return; }
      appel('offre', Object.assign({ snack: $('[data-offre-snack]').value }, o)).then(function () { alert('Offre publiée en haut de la carte.'); charger(); }).catch(function (x) { alert(x.message); });
    }
    if (e.target.matches('[data-ferm]')) {
      e.preventDefault();
      var sn = donnees.snacks.filter(function (x) { return x.id === $('[data-ferm-snack]').value; })[0];
      var du = $('[data-ferm-du]').value, au = $('[data-ferm-au]').value;
      if (!du || !au) { alert('Indique le début et la fin.'); return; }
      appel('fermetures', { snack: sn.id, fermetures: (sn.fermetures || []).concat([{ du: new Date(du).toISOString(), au: new Date(au).toISOString(), motif: $('[data-ferm-motif]').value.trim() }]) }).then(charger);
    }
  });

  if (session && session.jeton) demarrer(); else ecranCode();
})();
