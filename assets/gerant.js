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
  var periode = { du: jour(new Date()), au: jour(new Date()) }, filtre = 'tous', donnees = null;

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

  function demarrer() {
    document.body.className = 'gerant';
    $('#app').innerHTML = '<header class="cu-tete"><div><small>Anas Grill</small><h1>Gérant</h1></div>' +
      '<div class="ge-periode" role="group" aria-label="Période">' + [['jour', 'Aujourd’hui'], ['hier', 'Hier'], ['7', '7 jours'], ['mois', 'Ce mois']].map(function (p) { return '<button type="button" class="cu-bouton cu-discret" data-per="' + p[0] + '">' + p[1] + '</button>'; }).join('') +
      '<input type="date" data-du aria-label="Du"><input type="date" data-au aria-label="Au"></div>' +
      '<button type="button" class="cu-bouton" data-export>Export Excel</button></header>' +
      '<main class="ge"><div class="ge-kpi" data-kpi></div><section><h2>Par snack</h2><div class="ge-table-zone"><table class="ge-table" data-snacks></table></div></section>' +
      '<section><h2>Commandes <select data-filtre aria-label="Snack"></select></h2><div class="ge-table-zone"><table class="ge-table" data-cmds></table></div></section>' +
      '<section><h2>Offre du moment</h2><form class="ge-offre" data-offre><select data-offre-snack aria-label="Snack"></select><input data-offre-titre maxlength="60" placeholder="Titre (ex. Formule du soir)"><input data-offre-texte maxlength="200" placeholder="Texte (facultatif)"><button class="cu-bouton cu-feu">Publier</button><button type="button" class="cu-bouton cu-discret" data-offre-retirer>Retirer</button></form></section>' +
      '<section><h2>Fermetures exceptionnelles</h2><form class="ge-offre" data-ferm><select data-ferm-snack aria-label="Snack"></select><input type="datetime-local" data-ferm-du aria-label="Du"><input type="datetime-local" data-ferm-au aria-label="Au"><input data-ferm-motif maxlength="80" placeholder="Motif (ex. Congés)"><button class="cu-bouton cu-feu">Ajouter</button></form><ul class="ge-ferm" data-ferm-liste></ul></section></main>';
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
    return appel('tableau', periode).then(function (j) { donnees = j; afficher(); }).catch(function (e) { alert(e.message); });
  }

  function afficher() {
    var snacks = donnees.snacks, cmds = donnees.commandes;
    var net = function (c) { return c.total_cents - c.rembourse_cents; };
    var ca = cmds.reduce(function (t, c) { return t + net(c); }, 0);
    var frais = cmds.reduce(function (t, c) { return t + c.commission_cents; }, 0);
    $('[data-kpi]').innerHTML = [['Chiffre d’affaires', euros(ca)], ['Commandes', cmds.length], ['Panier moyen', cmds.length ? euros(Math.round(ca / cmds.length)) : '—'], ['Remboursé', euros(cmds.reduce(function (t, c) { return t + c.rembourse_cents; }, 0))], ['Frais de paiement en ligne (1 %)', euros(frais)]]
      .map(function (k) { return '<div><small>' + k[0] + '</small><b>' + k[1] + '</b></div>'; }).join('');
    var vu = function (s) {
      if (!s.cuisine_vue_le) return '<span class="cu-badge cu-rouge">jamais connectée</span>';
      var min = Math.round((Date.now() - new Date(s.cuisine_vue_le)) / 60000);
      return min <= 3 ? '<span class="cu-badge cu-vert">en ligne</span>' : '<span class="cu-badge cu-jaune">vue il y a ' + (min < 120 ? min + ' min' : Math.round(min / 60) + ' h') + '</span>';
    };
    $('[data-snacks]').innerHTML = '<thead><tr><th>Snack</th><th>CA</th><th>Commandes</th><th>Tablette</th><th>Paiement</th><th>Commandes en ligne</th></tr></thead><tbody>' +
      snacks.map(function (s) {
        var l = cmds.filter(function (c) { return c.etablissement_id === s.id; });
        return '<tr><td><b>' + esc(s.nom) + '</b></td><td>' + euros(l.reduce(function (t, c) { return t + net(c); }, 0)) + '</td><td>' + l.length + '</td><td>' + vu(s) + '</td>' +
          '<td>' + (s.stripe_account_id ? '<span class="cu-badge cu-vert">activé</span>' : '<span class="cu-badge cu-jaune">à activer</span>') + '</td>' +
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
    var fl = []; snacks.forEach(function (s) { (s.fermetures || []).forEach(function (f, i) { fl.push('<li><b>' + esc(s.nom) + '</b> du ' + new Date(f.du).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) + ' au ' + new Date(f.au).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) + (f.motif ? ' · ' + esc(f.motif) : '') + ' <button type="button" class="cu-bouton cu-discret" data-ferm-suppr="' + s.id + '|' + i + '">Supprimer</button></li>'); }); });
    $('[data-ferm-liste]').innerHTML = fl.join('') || '<li>Aucune.</li>';
  }

  function exporter() {
    var nom = {}; donnees.snacks.forEach(function (s) { nom[s.id] = s.nom; });
    var l = donnees.commandes.filter(function (c) { return filtre === 'tous' || c.etablissement_id === filtre; });
    var lignes = [['Jour', 'Heure', 'Snack', 'N°', 'Client', 'Téléphone', 'Contenu', 'Total TTC', 'Remboursé', 'Net', 'Frais de paiement en ligne', 'État']].concat(l.map(function (c) {
      return [c.jour, hm(c.payee_le || c.heure_prevue), nom[c.etablissement_id], c.numero, c.prenom, c.telephone, c.lignes.map(function (x) { return x.qte + ' x ' + x.n + (x.resume ? ' (' + x.resume + ')' : ''); }).join(' | '),
        (c.total_cents / 100).toFixed(2).replace('.', ','), (c.rembourse_cents / 100).toFixed(2).replace('.', ','), ((c.total_cents - c.rembourse_cents) / 100).toFixed(2).replace('.', ','), (c.commission_cents / 100).toFixed(2).replace('.', ','), c.statut];
    }));
    var csv = '﻿' + lignes.map(function (r) { return r.map(function (v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; }).join(';'); }).join('\r\n');
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = 'anas-grill-' + (filtre === 'tous' ? 'tous' : filtre) + '-' + periode.du + '_' + periode.au + '.csv'; a.click();
  }

  document.addEventListener('click', function (e) {
    var t = e.target, per = t.closest('[data-per]');
    if (per) { choisirPeriode(per.getAttribute('data-per')); return; }
    if (t.closest('[data-export]')) { exporter(); return; }
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
  document.addEventListener('change', function (e) {
    if (e.target.matches('[data-filtre]')) { filtre = e.target.value; afficher(); }
    if (e.target.matches('[data-du], [data-au]')) { periode = { du: $('[data-du]').value, au: $('[data-au]').value }; document.querySelectorAll('[data-per]').forEach(function (b) { b.classList.remove('cu-actif'); }); charger(); }
  });
  document.addEventListener('submit', function (e) {
    if (e.target.matches('[data-offre]')) {
      e.preventDefault();
      appel('offre', { snack: $('[data-offre-snack]').value, titre: $('[data-offre-titre]').value.trim(), texte: $('[data-offre-texte]').value.trim() }).then(function () { alert('Offre publiée sur le site.'); charger(); });
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
