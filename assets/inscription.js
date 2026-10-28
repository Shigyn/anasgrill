/* ===================================================================
   Anas Grill — la page Inscription (LocWeb, 2026-10-28)
   Le patron d'un snack ouvre ici le compte Stripe de SA societe, qui
   recevra l'argent des commandes payees en ligne. Le lien vient du
   gerant (espace Gerant > Paiement en ligne) et n'expire jamais : chaque
   clic redemande a Stripe un lien neuf. Stripe ramene ici a la fin.
   =================================================================== */
(function () {
  'use strict';
  var CFG = window.LOCWEB_CONFIG || {};
  var FN = CFG.supabaseUrl + '/functions/v1/ag-inscription';
  var $ = function (s) { return document.querySelector(s); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var q = new URLSearchParams(location.search), snack = q.get('s') || '', cle = q.get('k') || '';
  document.body.className = 'cuisine-code';

  function appel(action) {
    return fetch(FN, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: action, snack: snack, cle: cle }) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) throw new Error(j.refus || 'Le serveur ne répond pas. Réessaie dans un instant.'); return j; }); });
  }
  function ecran(titre, corps) {
    $('#app').innerHTML = '<main class="insc">' + $('[data-logo]').innerHTML + '<h1>' + titre + '</h1>' + corps + '</main>';
  }

  var TEXTES = {
    a_ouvrir: ['Recevoir les paiements en ligne', '<p>Tu ouvres le compte de ta société chez Stripe, le service qui encaisse les cartes. L’argent des commandes payées en ligne arrive ensuite directement sur ton compte bancaire.</p><ul><li>le SIREN de la société</li><li>son RIB</li><li>la pièce d’identité du président</li></ul><p>Compte 10 minutes. Tu peux t’arrêter et reprendre plus tard avec ce même lien.</p>', 'Ouvrir mon compte de paiement'],
    a_completer: ['Il manque des informations', '<p>Ton compte est ouvert, mais Stripe attend encore quelques éléments avant de pouvoir encaisser.</p>', 'Compléter mon compte'],
    verification: ['Merci, c’est envoyé', '<p>Stripe vérifie les informations : en général quelques minutes, parfois jusqu’à 2 jours. Tu n’as rien d’autre à faire. Ton gérant voit le compte passer à « Actif » dans son espace.</p>', 'Revoir mes informations'],
    actif: ['C’est actif ✓', '<p>Ta société encaisse les paiements en ligne. Les clients peuvent payer par carte sur le site.</p><p>Virements, factures et remboursements se suivent dans ton espace Stripe : <b>dashboard.stripe.com</b></p>', '']
  };

  function afficher() {
    appel('etat').then(function (j) {
      var t = TEXTES[j.etat] || TEXTES.a_ouvrir;
      ecran(esc(t[0]), '<p><b>Anas Grill ' + esc(j.nom) + '</b></p>' + t[1] +
        (t[2] ? '<button type="button" class="bouton bouton-feu" data-go>' + t[2] + '</button><p class="insc-err" data-err></p>' : ''));
      var b = $('[data-go]');
      if (b) b.addEventListener('click', function () {
        b.disabled = true; b.textContent = 'Ouverture de Stripe…';
        appel('lien').then(function (r) { location.href = r.lien; })
          .catch(function (x) { b.disabled = false; b.textContent = t[2]; $('[data-err]').textContent = x.message; });
      });
    }).catch(function (x) { ecran('Lien non valable', '<p class="insc-err">' + esc(x.message) + '</p>'); });
  }
  if (!snack || !cle) ecran('Lien incomplet', '<p class="insc-err">Demande à ton gérant le lien de ton snack.</p>'); else afficher();
})();
