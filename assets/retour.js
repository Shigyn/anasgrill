/* Anas Grill — le client revient sur le site avant d'avoir recupere sa commande
   (telephone ferme en plein paiement, onglet perdu) : une grande fenetre
   « VOTRE COMMANDE » lui redonne son numero, l'heure de retrait et le snack.
   Rien de personnel ne transite : seulement l'identifiant (impossible a deviner)
   garde dans CE telephone. */
(function () {
  var CLE = 'anas-commande', VUE = 'anas-commande-vue';
  var lu; try { lu = JSON.parse(localStorage.getItem(CLE) || 'null'); } catch (x) { return; }
  if (!lu || !lu.id) return;
  function oublier() { try { localStorage.removeItem(CLE); } catch (x) {} }
  // Deux heures apres l'heure de retrait, on n'en parle plus.
  if (lu.heure && Date.now() > new Date(lu.heure).getTime() + 2 * 3600000) { oublier(); return; }
  // Retour de la banque, ou deja fermee pendant cette visite : la page s'en occupe.
  if (/[?&]paiement=retour/.test(location.search)) return;
  try { if (sessionStorage.getItem(VUE) === lu.id) return; } catch (x) {}

  var FN = ((window.LOCWEB_CONFIG || {}).supabaseUrl || '') + '/functions/v1/ag-commande';
  fetch(FN, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'statut', id: lu.id }) })
    .then(function (r) { return r.ok ? r.json() : r.status === 409 ? { perdue: true } : null; })
    .then(function (c) {
      if (!c) return; // serveur injoignable : on reessaiera a la prochaine visite
      if (c.perdue || c.statut === 'remise' || c.statut === 'annulee' || c.paiement === 'echouee' || c.paiement === 'remboursee') { oublier(); return; }
      if (c.paiement !== 'payee' && c.paiement !== 'remboursee_partiel') return; // paiement pas encore confirme
      if (Date.now() > new Date(c.heure_prevue).getTime() + 2 * 3600000) { oublier(); return; }
      afficher(c);
    }).catch(function () {});

  var PARIS = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: 'numeric', minute: '2-digit' });
  function hm(d) { return PARIS.format(new Date(d)).replace(':', 'h'); }
  function euros(n) { return n.toFixed(2).replace('.', ',').replace(',00', '') + ' €'; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (x) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[x]; }); }

  function afficher(c) {
    var s = c.snack || {}, prete = c.statut === 'prete';
    var d = document.createElement('div');
    d.className = 'confirmation retour visible';
    d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true'); d.setAttribute('aria-label', 'Votre commande');
    d.innerHTML = '<div class="conf-in">' +
      '<p class="retour-titre">Votre commande</p>' +
      '<p class="conf-eti">N° ' + esc(c.numero) + ' · ' + (prete ? 'prête, tu peux venir' : 'en préparation') + '</p>' +
      '<h2>Retrait à <span>' + hm(c.heure_prevue) + '</span></h2>' +
      '<p class="conf-lieu">Anas Grill ' + esc(s.nom) + '<br>' + esc(s.adresse) + '</p>' +
      '<div class="conf-consigne"><b>Donne ton numéro ' + esc(c.numero) + ' au comptoir.</b>' +
        (s.lat != null ? ' <a href="https://www.google.com/maps/dir/?api=1&destination=' + s.lat + ',' + s.lng + '" target="_blank" rel="noopener">Itinéraire</a>' : '') + '</div>' +
      '<div class="conf-recap">' + (c.lignes || []).map(function (l) {
        return '<div><span>' + l.qte + ' × ' + esc(l.n) + (l.resume ? '<small>' + esc(l.resume) + '</small>' : '') + '</span></div>';
      }).join('') + '<div class="conf-total"><span>Payé</span><span>' + euros(c.total_cents / 100) + '</span></div></div>' +
      '<button type="button" class="bouton bouton-ligne" data-retour-fermer>Fermer</button></div>';
    document.body.appendChild(d);
    document.documentElement.style.overflow = 'hidden';
    var b = d.querySelector('[data-retour-fermer]'); b.focus();
    b.addEventListener('click', function () {
      try { sessionStorage.setItem(VUE, lu.id); } catch (x) {}
      document.documentElement.style.overflow = ''; d.remove();
    });
  }
})();
