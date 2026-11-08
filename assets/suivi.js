/* Anas Grill — suivi de commande en direct (Riad, 08/11).
   /suivi/?c=<id> : l'identifiant (impossible a deviner) suffit, rien de personnel
   ne transite. La page se recharge sans rien perdre, et se met a jour seule :
   nouvelle heure choisie par la cuisine, « prete », « remise ».
   Interroge le serveur toutes les 20 s, seulement quand la page est a l'ecran,
   et s'arrete une fois la commande remise ou annulee (cout Supabase). */
(function () {
  var zone = document.querySelector('[data-suivi]'); if (!zone) return;
  var FN = ((window.LOCWEB_CONFIG || {}).supabaseUrl || '') + '/functions/v1/ag-commande';
  var racine = (window.ANAS || {}).racine || '../';
  var SNACKS = []; try { SNACKS = JSON.parse(document.getElementById('anas-snacks').textContent); } catch (x) {}

  var q = new URLSearchParams(location.search);
  var lu; try { lu = JSON.parse(localStorage.getItem('anas-commande') || 'null'); } catch (x) {}
  var id = q.get('c') || (lu && lu.id) || '';
  if (!/^[0-9a-f-]{36}$/.test(id)) return vide();
  if (!q.get('c')) history.replaceState(null, '', '?c=' + id);

  // L'heure annoncee au moment de la commande : si la cuisine la repousse, on le dit.
  var h0 = null;
  try {
    var s0 = JSON.parse(localStorage.getItem('anas-suivi') || 'null');
    if (s0 && s0.id === id) h0 = s0.h0;
    else if (lu && lu.id === id && lu.heure) { h0 = lu.heure; localStorage.setItem('anas-suivi', JSON.stringify({ id: id, h0: h0 })); }
  } catch (x) {}

  var PARIS = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: 'numeric', minute: '2-digit' });
  function hm(d) { return PARIS.format(new Date(d)).replace(':', 'h'); }
  function euros(n) { return n.toFixed(2).replace('.', ',').replace(',00', '') + ' €'; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (x) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[x]; }); }

  var c = null, minuteur = null, erreurs = 0, titre0 = document.title;

  function charger() {
    fetch(FN, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'statut', id: id }) })
      .then(function (r) { return r.ok ? r.json() : r.status === 409 ? { perdue: true } : Promise.reject(); })
      .then(function (n) {
        erreurs = 0;
        if (n.perdue) { c = null; return introuvable(); }
        if (h0 == null) { h0 = n.heure_prevue; try { localStorage.setItem('anas-suivi', JSON.stringify({ id: id, h0: h0 })); } catch (x) {} }
        var avant = c; c = n;
        if (avant && avant.statut !== 'prete' && n.statut === 'prete') alerter();
        afficher();
        planifier();
      })
      .catch(function () { erreurs++; if (!c) zone.innerHTML = cadre('<p class="conf-dans">Connexion impossible pour l’instant. On réessaie…</p>'); planifier(); });
  }
  function fini() { return c && (c.statut === 'remise' || c.statut === 'annulee' || c.paiement === 'echouee' || c.paiement === 'remboursee'); }
  function planifier() {
    clearTimeout(minuteur);
    if (fini() || document.hidden) return;
    var attente = !c || ['payee', 'remboursee_partiel', 'sur_place'].indexOf(c.paiement) < 0 ? 5000 : 20000;
    minuteur = setTimeout(charger, Math.min(attente * (1 + erreurs), 60000));
  }
  document.addEventListener('visibilitychange', function () { if (!document.hidden && !fini()) charger(); else clearTimeout(minuteur); });
  // Le « dans 12 min » avance meme sans nouvelle du serveur.
  setInterval(function () { if (c && !document.hidden) afficher(); }, 30000);

  function alerter() {
    try { if (navigator.vibrate) navigator.vibrate([250, 120, 250, 120, 400]); } catch (x) {}
  }

  function cadre(html) { return '<div class="conf-in">' + html + '</div>'; }
  function vide() {
    zone.innerHTML = cadre('<p class="retour-titre">Ma commande</p><p class="conf-dans">Aucune commande en cours sur ce téléphone.</p>' +
      '<a class="bouton" href="' + racine + '">Commander</a>');
  }
  function introuvable() {
    document.title = titre0;
    zone.innerHTML = cadre('<p class="retour-titre">Ma commande</p><p class="conf-dans">Cette commande est introuvable. Si tu viens de payer, appelle le restaurant.</p>' +
      '<a class="bouton bouton-ligne" href="' + racine + '">Retour au site</a>');
  }

  function etapes(n) {
    var noms = ['En préparation', 'Prête', 'Remise'];
    return '<ol class="suivi-etapes" aria-label="Avancement">' + noms.map(function (nom, i) {
      return '<li class="' + (i < n ? 'faite' : i === n ? 'en-cours' : '') + '"' + (i === n ? ' aria-current="step"' : '') + '><i aria-hidden="true"></i><span>' + nom + '</span></li>';
    }).join('') + '</ol>';
  }

  function afficher() {
    var s = c.snack || {}, info = SNACKS.filter(function (x) { return x.id === s.id; })[0] || {};
    var tel = info.tel ? '<a class="bouton bouton-ligne suivi-tel" href="tel:' + info.tel.replace(/\s/g, '') + '">Appeler le restaurant</a>' : '';
    var lieu = '<p class="conf-lieu">Anas Grill ' + esc(s.nom) + '<br>' + esc(s.adresse) + '</p>';
    var itin = s.lat != null ? ' <a href="https://www.google.com/maps/dir/?api=1&destination=' + s.lat + ',' + s.lng + '" target="_blank" rel="noopener">Itinéraire</a>' : '';
    var recap = '<div class="conf-recap">' + (c.lignes || []).map(function (l) {
      return '<div><span>' + l.qte + ' × ' + esc(l.n) + (l.resume ? '<small>' + esc(l.resume) + '</small>' : '') + '</span></div>';
    }).join('') + '<div class="conf-total"><span>' + (c.paiement === 'sur_place' ? 'À payer au comptoir' : 'Payé') + '</span><span>' + euros(c.total_cents / 100) + '</span></div></div>';
    var num = '<p class="conf-eti">N° ' + esc(c.numero) + '</p>';
    var html;

    if (c.paiement === 'echouee') {
      document.title = titre0;
      html = '<p class="retour-titre">Paiement refusé</p>' + num + '<p class="conf-dans">Le paiement n’est pas passé : la commande n’a pas été envoyée en cuisine.</p>' +
        '<a class="bouton" href="' + racine + (s.id ? s.id + '/' : '') + '">Recommander</a>';
    } else if (c.statut === 'annulee' || c.paiement === 'remboursee') {
      document.title = titre0;
      html = '<p class="retour-titre">Commande annulée</p>' + num + '<p class="conf-dans">' + (c.paiement === 'remboursee' ? 'Elle t’a été remboursée.' : 'Une question ? Appelle le restaurant.') + '</p>' + lieu + tel;
    } else if (['payee', 'remboursee_partiel', 'sur_place'].indexOf(c.paiement) < 0) {
      html = '<p class="retour-titre">Ma commande</p>' + num + '<p class="conf-dans">Paiement en cours de vérification…</p>' + lieu;
    } else if (c.statut === 'remise') {
      document.title = 'Commande remise · Anas Grill';
      html = '<div class="conf-check" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/></svg></div>' + num +
        etapes(3) + '<h2>Bon appétit !</h2><p class="conf-dans">Ta commande t’a été remise. Merci et à bientôt chez Anas Grill.</p>' + recap +
        '<a class="bouton bouton-ligne" href="' + racine + (s.id ? s.id + '/' : '') + '">Nouvelle commande</a>';
    } else if (c.statut === 'prete') {
      document.title = '✅ Prête · N° ' + c.numero + ' · Anas Grill';
      html = '<div class="conf-check" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/></svg></div>' + num +
        etapes(1) + '<h2>Ta commande <span>est prête</span></h2><p class="conf-dans">Tu peux venir la chercher.</p>' + lieu +
        '<div class="conf-consigne"><b>Donne ton numéro ' + esc(c.numero) + ' au comptoir.</b>' + itin + '</div>' + recap + tel;
    } else {
      var t = new Date(c.heure_prevue), min = Math.max(0, Math.round((t - Date.now()) / 60000));
      var retard = h0 && !c.creneau && Date.parse(c.heure_prevue) - Date.parse(h0) >= 60000;
      document.title = 'En préparation · ' + hm(t) + ' · Anas Grill';
      html = num + etapes(0) +
        (retard ? '<div class="suivi-retard" role="status"><b>Petit retard</b> : ta commande sera prête vers ' + hm(t) + ' au lieu de ' + hm(h0) + '. Désolé pour l’attente !</div>' : '') +
        '<h2>' + (c.creneau ? 'Programmée pour' : 'Prête vers') + ' <span>' + hm(t) + '</span></h2>' +
        '<p class="conf-dans">' + (min > 0 ? 'dans ' + min + ' minute' + (min > 1 ? 's' : '') + ' environ' : 'd’une minute à l’autre') + '</p>' + lieu +
        '<div class="conf-consigne"><b>Donne ton numéro ' + esc(c.numero) + ' au comptoir.</b>' + itin + '</div>' +
        '<p class="suivi-direct"><i aria-hidden="true"></i>Cette page se met à jour toute seule : garde-la ouverte.</p>' + recap + tel;
    }
    zone.innerHTML = cadre(html);
  }

  zone.innerHTML = cadre('<p class="conf-dans">Chargement de ta commande…</p>');
  charger();
})();
