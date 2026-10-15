/* ===================================================================
   Anas Grill — la tablette de cuisine (LocWeb, 2026-10-15)
   Ouverte toute la journee a cote de la caisse. Code du snack (8
   chiffres) tape une seule fois. Les commandes PAYEES arrivent en direct
   (canal Realtime du snack), sonnent, et s'impriment toutes seules :
     - « Appli » (l'appli Android LocWeb de la tablette) : le ticket part
       directement a l'imprimante par le reseau du restaurant, sans fenetre ;
     - « Navigateur » (secours, sur un PC) : la fenetre d'impression.
   Un ticket qui ne sort pas reste marque « non imprime » : sonnerie, bouton
   Reimprimer, et nouvel essai a chaque rafraichissement.
   =================================================================== */
(function () {
  'use strict';
  var CFG = window.LOCWEB_CONFIG || {};
  var FN = CFG.supabaseUrl + '/functions/v1/ag-espace';
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var euros = function (c) { return (c / 100).toFixed(2).replace('.', ',') + ' €'; };
  var hm = function (d) { d = new Date(d); return d.getHours() + 'h' + String(d.getMinutes()).padStart(2, '0'); };
  var lire = function (k, d) { try { return JSON.parse(localStorage.getItem(k) || 'null') || d; } catch (e) { return d; } };
  var ecrire = function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };

  var session = lire('ag-cuisine', null);         // {jeton, snack}
  var APPLI = !!(window.LocWebImprimante && window.LocWebImprimante.version);
  // Par defaut : l'appli si on est dedans, sinon rien (on regarde seulement).
  var reglage = lire('ag-cuisine-reglage', { impression: APPLI ? 'appli' : 'aucune', son: true, ip: '', port: 9100 });
  if (reglage.impression === 'rawbt') reglage.impression = APPLI ? 'appli' : 'aucune';
  var donnees = { commandes: [], snack: null, carte: [] };
  var imprimees = {};                               // deja envoyees cette session (evite les doublons)
  var canal = null, client = null, minuteur = null, horsLigne = false;

  function appel(action, extra) {
    var corps = Object.assign({ action: action, jeton: session && session.jeton }, extra || {});
    return fetch(FN, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corps) })
      .then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) {
          if (r.status === 401 && action !== 'connexion') { deconnecter(); throw new Error(j.refus || 'Reconnecte-toi.'); }
          if (!r.ok) throw new Error(j.refus || j.error || 'Erreur serveur');
          return j;
        });
      });
  }

  /* ---------------- connexion ---------------- */
  function ecranCode(msg) {
    document.body.className = 'cuisine-code';
    $('#app').innerHTML = '<form class="code" data-code><div class="code-logo">' + document.querySelector('[data-logo]').innerHTML + '</div>' +
      '<h1>Cuisine</h1><p>Tape le code à 8 chiffres de ton snack.</p>' +
      '<input inputmode="numeric" pattern="[0-9]*" maxlength="8" autocomplete="off" placeholder="••••••••" data-code-champ aria-label="Code">' +
      '<button class="bouton bouton-feu" type="submit">Entrer</button><p class="code-err" data-code-err>' + esc(msg || '') + '</p></form>';
    var f = $('[data-code]'), c = $('[data-code-champ]');
    c.focus();
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = c.value.replace(/\D/g, '');
      if (v.length !== 8) { $('[data-code-err]').textContent = 'Le code fait 8 chiffres.'; return; }
      $('[data-code-err]').textContent = 'Vérification…';
      appel('connexion', { code: v }).then(function (j) {
        if (j.role !== 'cuisine') throw new Error('Ce code est celui du gérant : utilise la page Gérant.');
        session = { jeton: j.jeton, snack: j.snack }; ecrire('ag-cuisine', session); demarrer();
      }).catch(function (e) { $('[data-code-err]').textContent = e.message; c.select(); });
    });
  }
  function deconnecter() { session = null; try { localStorage.removeItem('ag-cuisine'); } catch (e) {} if (canal) { client.removeChannel(canal); canal = null; } clearInterval(minuteur); ecranCode(); }

  /* ---------------- l'ecran ---------------- */
  function demarrer() {
    document.body.className = 'cuisine';
    $('#app').innerHTML =
      '<header class="cu-tete"><div><small>Anas Grill · Cuisine</small><h1>' + esc(session.snack.nom) + '</h1></div>' +
      '<span class="cu-etat" data-etat>Connexion…</span>' +
      '<button type="button" class="cu-bouton" data-pause>Pause</button>' +
      '<button type="button" class="cu-bouton" data-epuises>Plats épuisés</button>' +
      (APPLI ? '' : '<button type="button" class="cu-bouton cu-feu" data-installer>Installer l’appli</button>') +
      '<button type="button" class="cu-bouton cu-aide" data-aide>Aide</button>' +
      '<button type="button" class="cu-bouton cu-discret" data-reglages aria-label="Réglages">Réglages</button></header>' +
      '<p class="cu-alerte" data-alerte hidden></p>' +
      '<main class="cu-colonnes"><section><h2>À préparer <span data-n-recue></span></h2><div data-col="recue"></div></section>' +
      '<section><h2>Prêtes <span data-n-prete></span></h2><div data-col="prete"></div></section>' +
      '<section class="cu-remises"><h2>Remises aujourd’hui <span data-n-remise></span></h2><div data-col="remise"></div></section></main>' +
      '<div class="cu-voile" data-voile hidden></div><div class="cu-panneau" data-panneau hidden></div>';
    rafraichir();
    clearInterval(minuteur); minuteur = setInterval(rafraichir, 60000); // signe de vie + filet de securite
    if (APPLI && window.LocWebImprimante.chercher && !reglage.ip) setTimeout(function () { panneauRecherche(); }, 800);
    ecouter();
    garderEcranAllume();
  }

  // Le direct : un message sur le canal du snack = « va voir, il y a du nouveau ».
  function ecouter() {
    if (!window.supabase || !donnees.snack) return;
    if (!client) client = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey, { auth: { persistSession: false } });
    if (canal) client.removeChannel(canal);
    canal = client.channel('ag-cuisine-' + donnees.snack.canal)
      .on('broadcast', { event: 'commande' }, function () { rafraichir(); })
      .subscribe(function (st) { horsLigne = st !== 'SUBSCRIBED'; majEtat(); if (st === 'SUBSCRIBED') rafraichir(); });
  }

  function rafraichir() {
    return appel('commandes').then(function (j) {
      var avant = {}; donnees.commandes.forEach(function (c) { avant[c.id] = 1; });
      var premiere = !donnees.snack;
      donnees = j; horsLigne = false;
      if (premiere) { ecouter(); setTimeout(majAuLancement, 3000); }
      var nouvelles = j.commandes.filter(function (c) { return !avant[c.id] && c.statut === 'recue'; });
      if (nouvelles.length && !premiere) sonner();
      afficher();
      imprimerEnAttente();
    }).catch(function (e) { horsLigne = true; majEtat(e.message); });
  }

  function majEtat(msg) {
    var e = $('[data-etat]'); if (!e) return;
    var pause = donnees.snack && donnees.snack.pause;
    e.textContent = horsLigne ? 'Hors ligne' : pause ? 'En pause' : 'En ligne';
    e.className = 'cu-etat ' + (horsLigne ? 'cu-rouge' : pause ? 'cu-jaune' : 'cu-vert');
    var b = $('[data-pause]'); if (b) { b.textContent = pause ? 'Reprendre les commandes' : 'Pause'; b.classList.toggle('cu-actif', !!pause); }
    var a = $('[data-alerte]');
    var nonImp = donnees.commandes.filter(function (c) { return !c.imprimee_le && c.statut === 'recue'; }).length;
    var t = horsLigne ? 'Connexion perdue : les commandes arrivent quand même, elles s’afficheront au retour du réseau.' + (msg ? ' (' + msg + ')' : '')
      : nonImp ? nonImp + ' ticket' + (nonImp > 1 ? 's' : '') + ' non imprimé' + (nonImp > 1 ? 's' : '') + ' : vérifie l’imprimante (papier, câble), puis « Réimprimer ».' : '';
    a.hidden = !t; a.textContent = t;
  }

  function afficher() {
    var cols = { recue: [], prete: [], remise: [] };
    donnees.commandes.forEach(function (c) { if (cols[c.statut]) cols[c.statut].push(c); });
    Object.keys(cols).forEach(function (k) {
      var l = cols[k];
      if (k === 'remise') l = l.slice().reverse().slice(0, 30);
      $('[data-col="' + k + '"]').innerHTML = l.map(carte).join('') || '<p class="cu-vide">Rien pour l’instant.</p>';
      $('[data-n-' + k + ']').textContent = l.length ? '(' + l.length + ')' : '';
    });
    majEtat();
  }
  function carte(c) {
    var rb = c.paiement === 'remboursee' ? '<span class="cu-badge cu-rouge">Remboursée</span>' : c.paiement === 'remboursee_partiel' ? '<span class="cu-badge cu-jaune">Remb. ' + euros(c.rembourse_cents) + '</span>' : '<span class="cu-badge cu-vert">Payée</span>';
    return '<article class="cu-cmd' + (c.imprimee_le ? '' : ' cu-non-imp') + '" data-id="' + c.id + '">' +
      '<div class="cu-cmd-tete"><b class="cu-num">N° ' + c.numero + '</b><span class="cu-heure">' + (c.creneau ? 'Programmée · ' : '') + 'À remettre à <b>' + hm(c.heure_prevue) + '</b></span>' + rb + '</div>' +
      '<p class="cu-client">' + esc(c.prenom) + ' · <a href="tel:' + esc(c.telephone) + '">' + esc(c.telephone) + '</a></p>' +
      '<ul class="cu-lignes">' + c.lignes.map(function (l) { return '<li><b>' + l.qte + ' × ' + esc(l.n) + '</b>' + (l.resume ? '<span>' + esc(l.resume) + '</span>' : '') + '</li>'; }).join('') + '</ul>' +
      (c.note ? '<p class="cu-note">« ' + esc(c.note) + ' »</p>' : '') +
      '<div class="cu-actions">' +
        (c.statut === 'recue' ? '<button type="button" class="cu-bouton cu-feu" data-statut="prete">Prête</button>' : '') +
        (c.statut === 'prete' ? '<button type="button" class="cu-bouton cu-feu" data-statut="remise">Remise au client</button><button type="button" class="cu-bouton cu-discret" data-statut="recue">Pas prête</button>' : '') +
        '<button type="button" class="cu-bouton cu-discret" data-reimprimer>' + (c.imprimee_le ? 'Réimprimer' : 'Imprimer') + '</button>' +
        '<span class="cu-total">' + euros(c.total_cents) + '</span></div></article>';
  }

  /* ---------------- l'impression ---------------- */
  function imprimerEnAttente() {
    if (reglage.impression === 'aucune') return;
    donnees.commandes.filter(function (c) { return c.statut === 'recue' && !c.imprimee_le && !imprimees[c.id] && c.paiement !== 'remboursee'; })
      .forEach(function (c, n) { setTimeout(function () { imprimer(c); }, n * 1500); });
  }
  function imprimer(c) {
    imprimees[c.id] = true;
    var ok = reglage.impression === 'appli' ? viaAppli(c) : viaNavigateur(c);
    Promise.resolve(ok).then(function (fait) {
      if (fait === false) { imprimees[c.id] = false; majEtat(); return; }
      appel('imprimee', { id: c.id }).then(function () { c.imprimee_le = new Date().toISOString(); afficher(); }).catch(function () {});
    });
  }

  // Le ticket en texte (80 mm = 48 caracteres), avec quelques commandes ESC/POS.
  function ticketTexte(c) {
    var ESC = '\x1b', GS = '\x1d', L = 48;
    var sans = function (s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’‘]/g, "'").replace(/[×]/g, 'x').replace(/[«»]/g, '"').replace(/[^\x20-\x7e]/g, ''); };
    var couper = function (s, larg) { var out = [], m = sans(s).split(' '), l = ''; m.forEach(function (w) { if ((l + ' ' + w).trim().length > larg) { out.push(l); l = w; } else l = (l + ' ' + w).trim(); }); if (l) out.push(l); return out; };
    var t = ESC + '@' + ESC + 'a1' + GS + '!' + '\x11' + 'N ' + c.numero + '\n' + GS + '!' + '\x00';
    t += ESC + 'E1' + 'A REMETTRE A ' + sans(hm(c.heure_prevue)) + '\n' + ESC + 'E0';
    t += (c.creneau ? 'Commande programmee\n' : '') + sans('Anas Grill ' + session.snack.nom) + ' - a emporter\n' + ESC + 'a0' + '-'.repeat(L) + '\n';
    c.lignes.forEach(function (l) {
      t += ESC + 'E1' + couper(l.qte + ' x ' + l.n, L).join('\n') + '\n' + ESC + 'E0';
      if (l.resume) t += couper(l.resume, L - 3).map(function (x) { return '   ' + x; }).join('\n') + '\n';
    });
    t += '-'.repeat(L) + '\n';
    if (c.note) t += ESC + 'E1' + 'NOTE : ' + ESC + 'E0' + couper(c.note, L - 7).join('\n') + '\n';
    t += sans(c.prenom) + ' - ' + sans(c.telephone) + '\n' + 'PAYE EN LIGNE : ' + sans(euros(c.total_cents)) + '\n\n\n\n' + GS + 'V' + '\x42' + '\x00';
    return t;
  }
  // L'appli Android LocWeb envoie les octets ESC/POS a l'imprimante, port 9100, sans fenetre.
  function viaAppli(c) {
    if (!APPLI) return false;
    if (!reglage.ip) { majEtat(); alerteImpression('Indique l’adresse de l’imprimante dans Réglages.'); return false; }
    var r = window.LocWebImprimante.imprimer(reglage.ip, +reglage.port || 9100, btoa(ticketTexte(c)));
    if (r !== 'ok') { alerteImpression(r); return false; }
    return true;
  }
  /* Trouver la bonne imprimante (appli Android) :
     1. l'appli scanne le reseau et ne garde que les imprimantes a tickets
        (celles qui repondent a la demande d'etat ESC/POS ; les imprimantes
        de bureau sont ecartees sans rien leur envoyer) ;
     2. la preuve physique : chaque candidate imprime un ticket avec un gros
        numero, et la cuisine dit lequel est sorti CHEZ ELLE. */
  var CANDIDATES = [];
  function octetsNumero(n) {
    var ESC = '\x1b', GS = '\x1d';
    return ESC + '@' + ESC + 'a1' + GS + '!' + '\x11' + 'IMPRIMANTE\n' + GS + '!' + '\x77' + n + '\n' + GS + '!' + '\x00' +
      '\nSi ce ticket sort en CUISINE,\ntouche le numero ' + n + ' sur la tablette.\n\n\n\n' + GS + 'V' + '\x42' + '\x00';
  }
  function envoyerBrut(ip, octets) { return window.LocWebImprimante.imprimer(ip, 9100, btoa(octets)); }
  function panneauRecherche() {
    panneau('<h2>Trouver l’imprimante</h2><p>On cherche l’imprimante à tickets sur le réseau du snack… (quelques secondes)</p>' +
      '<span class="cu-attente" aria-hidden="true"></span><div class="cu-actions"><button type="button" class="cu-bouton cu-discret" data-fermer>Plus tard</button></div>');
    window.__agImprimantes = function (liste) {
      var tickets = liste.filter(function (x) { return x.ticket; });
      var muettes = liste.filter(function (x) { return !x.ticket && !x.bureau; });
      var bureau = liste.filter(function (x) { return x.bureau; });
      CANDIDATES = tickets.length ? tickets : muettes;   // si aucune ne repond, on essaie celles qui se taisent
      if (!CANDIDATES.length) {
        panneau('<h2>Aucune imprimante à tickets trouvée</h2><p>Vérifie que l’imprimante est <b>allumée</b> et reliée à la <b>box par un câble réseau</b>, et que la tablette est sur le <b>même Wi-Fi</b> que la box.</p>' +
          (bureau.length ? '<p>' + bureau.length + ' imprimante(s) de bureau trouvée(s), écartée(s).</p>' : '') +
          '<div class="cu-actions"><button type="button" class="cu-bouton cu-feu" data-chercher>Chercher encore</button><button type="button" class="cu-bouton cu-discret" data-fermer>Plus tard</button></div>');
        return;
      }
      CANDIDATES.forEach(function (c, i) { setTimeout(function () { envoyerBrut(c.ip, octetsNumero(i + 1)); }, i * 1200); });
      panneau('<h2>Quel ticket est sorti en cuisine ?</h2><p>' + (CANDIDATES.length > 1
          ? 'On a trouvé ' + CANDIDATES.length + ' imprimantes. Chacune vient d’imprimer un ticket avec un gros numéro. Touche le numéro du ticket sorti <b>dans la cuisine</b>.'
          : 'L’imprimante trouvée vient d’imprimer un ticket avec le numéro 1. Est-il sorti <b>dans la cuisine</b> ?') + '</p>' +
        '<div class="cu-plats">' + CANDIDATES.map(function (c, i) {
          return '<button type="button" class="cu-plat cu-numero" data-choisir-ip="' + c.ip + '"><b>' + (i + 1) + '</b><small>' + (c.nom ? c.nom + ' · ' : '') + c.ip + '</small></button>';
        }).join('') + '</div>' +
        '<div class="cu-actions"><button type="button" class="cu-bouton" data-chercher>Aucun n’est sorti en cuisine : chercher encore</button><button type="button" class="cu-bouton cu-discret" data-fermer>Plus tard</button></div>');
    };
    try { window.LocWebImprimante.chercher('__agImprimantes'); } catch (e) { panneau('<h2>Recherche impossible</h2><p>' + esc(e.message) + '</p><div class="cu-actions"><button type="button" class="cu-bouton" data-fermer>Fermer</button></div>'); }
  }
  /* La mise a jour de l'appli : elle regarde s'il existe une nouvelle version
     (releases GitHub du depot des applis), et l'installe elle-meme apres un
     toucher. Android demande seulement de confirmer « Mettre a jour ». */
  var MAJ = APPLI && !!window.LocWebImprimante.verifierMiseAJour, DERNIERE = null;
  function verifierMaj(manuel) {
    window.__agMaj = function (r) {
      DERNIERE = r;
      if (r.disponible) proposerMaj(manuel);
      else if (manuel) alert(r.erreur ? 'Vérification impossible : ' + r.erreur : 'L’appli est à jour (version ' + r.actuelle + ').');
    };
    window.LocWebImprimante.verifierMiseAJour('__agMaj');
  }
  // Une seule verification par 24 h, au lancement de l'appli, et JAMAIS pendant le
  // service : relancee en plein rush (apres une coupure), la tablette ne propose rien.
  function enService() {
    var s0 = donnees.snack || {}, o = s0.ouverture == null ? 11 : s0.ouverture, f = s0.fermeture == null ? 1 : s0.fermeture;
    var h = new Date().getHours();
    return f <= o ? (h >= o || h < f) : (h >= o && h < f);
  }
  function majAuLancement() {
    if (!MAJ || enService()) return;
    if (Date.now() - lire('ag-maj-derniere', 0) < 24 * 3600000) return;
    ecrire('ag-maj-derniere', Date.now());
    verifierMaj();
  }
  // La fenetre « Nouvelle version » ; si une autre fenetre est ouverte, elle attend son tour.
  function proposerMaj(manuel) {
    if (!manuel && enService()) return;   // le service a commence entre-temps : demain
    if (!$('[data-panneau]').hidden) { setTimeout(function () { proposerMaj(manuel); }, 30000); return; }
    panneau('<h2>Nouvelle version de l’appli</h2><p>Une mise à jour de l’appli de la cuisine est disponible. Elle s’installe en quelques secondes ; Android te demandera juste de confirmer.</p>' +
      '<div class="cu-actions"><button type="button" class="cu-bouton cu-feu" data-maj-go>Mettre à jour</button><button type="button" class="cu-bouton cu-discret" data-fermer>Plus tard</button></div>');
  }
  window.__agMajEtat = function (m) {
    panneau(m === 'ok'
      ? '<h2>Appli mise à jour ✓</h2><div class="cu-actions"><button type="button" class="cu-bouton cu-feu" data-fermer>OK</button></div>'
      : '<h2>La mise à jour n’a pas abouti</h2><p>' + esc(m) + '</p><div class="cu-actions"><button type="button" class="cu-bouton cu-feu" data-maj-go>Réessayer</button><button type="button" class="cu-bouton cu-discret" data-fermer>Plus tard</button></div>');
  };
  function alerteImpression(t) { var a = $('[data-alerte]'); if (a) { a.hidden = false; a.textContent = t; } }
  function viaNavigateur(c) {
    var f = document.createElement('iframe'); f.className = 'cu-iframe'; document.body.appendChild(f);
    var d = f.contentDocument;
    d.open(); d.write('<!doctype html><meta charset="utf-8"><style>@page{size:80mm auto;margin:0}body{width:72mm;margin:0 4mm;font:13px/1.35 monospace;color:#000}h1{font-size:30px;margin:6px 0;text-align:center}h2{font-size:17px;margin:0 0 6px;text-align:center}hr{border:0;border-top:1px dashed #000}b{font-size:14px}.r{padding-left:10px}</style>' +
      '<h1>N° ' + c.numero + '</h1><h2>À REMETTRE À ' + hm(c.heure_prevue) + '</h2><div style="text-align:center">' + (c.creneau ? 'Commande programmée<br>' : '') + 'Anas Grill ' + esc(session.snack.nom) + ' · à emporter</div><hr>' +
      c.lignes.map(function (l) { return '<div><b>' + l.qte + ' × ' + esc(l.n) + '</b>' + (l.resume ? '<div class="r">' + esc(l.resume) + '</div>' : '') + '</div>'; }).join('') + '<hr>' +
      (c.note ? '<div><b>NOTE :</b> ' + esc(c.note) + '</div>' : '') + '<div>' + esc(c.prenom) + ' · ' + esc(c.telephone) + '</div><div>PAYÉ EN LIGNE : ' + euros(c.total_cents) + '</div>');
    d.close();
    setTimeout(function () { try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) {} setTimeout(function () { f.remove(); }, 5000); }, 250);
    return true;
  }

  /* ---------------- son et ecran ---------------- */
  var audio = null;
  function sonner() {
    if (!reglage.son) return;
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      [0, .28, .56].forEach(function (t) {
        var o = audio.createOscillator(), g = audio.createGain(); o.type = 'square'; o.frequency.value = 880;
        g.gain.setValueAtTime(.0001, audio.currentTime + t); g.gain.exponentialRampToValueAtTime(.35, audio.currentTime + t + .02); g.gain.exponentialRampToValueAtTime(.0001, audio.currentTime + t + .22);
        o.connect(g).connect(audio.destination); o.start(audio.currentTime + t); o.stop(audio.currentTime + t + .25);
      });
    } catch (e) {}
  }
  function garderEcranAllume() {
    if (!('wakeLock' in navigator)) return;
    var prendre = function () { navigator.wakeLock.request('screen').catch(function () {}); };
    prendre(); document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') prendre(); });
  }

  /* ---------------- panneaux : epuises, reglages ---------------- */
  function panneau(html) { $('[data-panneau]').innerHTML = html; $('[data-panneau]').hidden = false; $('[data-voile]').hidden = false; }
  function fermerPanneau() { $('[data-panneau]').hidden = true; $('[data-voile]').hidden = true; }
  function panneauEpuises() {
    var ep = donnees.snack.epuises || [];
    panneau('<h2>Plats épuisés aujourd’hui</h2><p>Touche un plat pour le retirer du site (ou le remettre).</p><div class="cu-plats">' +
      donnees.carte.map(function (p) { return '<button type="button" class="cu-plat' + (ep.indexOf(p.id) >= 0 ? ' cu-ep' : '') + '" data-plat="' + p.id + '">' + esc(p.n) + '</button>'; }).join('') +
      '</div><button type="button" class="cu-bouton" data-fermer>Fermer</button>');
  }
  /* La fiche « Que faire si… » : les situations du service, dans les mots
     de la cuisine. Elle s'imprime aussi, pour l'afficher au mur. */
  var AIDE = [
    ['Une commande arrive', 'Ça sonne et le ticket sort tout seul. Prépare-la pour l’heure écrite en gros (« À remettre à … »). Quand elle est prête, touche <b>Prête</b>. Quand le client la récupère, vérifie son <b>numéro</b>, puis touche <b>Remise au client</b>.'],
    ['Le ticket ne sort pas', 'La commande devient rouge et un bandeau te prévient. Vérifie le <b>papier</b>, que l’imprimante est <b>allumée</b> et que son <b>câble réseau</b> est branché. Puis touche <b>Réimprimer</b> sur la commande. Pour tester : <b>Réglages → Ticket de test</b>. En attendant, prépare la commande en lisant l’écran : tout y est.'],
    ['Trop de monde, on ne suit plus', 'Touche <b>Pause</b> en haut. Le site n’accepte plus de nouvelles commandes ; celles déjà payées restent à préparer. Quand ça se calme, touche <b>Reprendre les commandes</b>.'],
    ['Il n’y a plus d’un produit', 'Touche <b>Plats épuisés</b>, puis le plat : il disparaît du site tout de suite. <b>Pense à le remettre</b> quand il revient (même bouton), sinon il reste caché.'],
    ['Un plat déjà payé manque', 'Appelle le client (son numéro est sur la commande) et propose-lui autre chose. S’il préfère être remboursé, préviens le <b>gérant</b> : il rembourse le plat depuis sa page, le client est recrédité sur sa carte.'],
    ['Le client ne vient pas', 'La commande est déjà payée. Garde-la et appelle le client. Ne la marque <b>Remise</b> que quand il l’a vraiment récupérée.'],
    ['« Hors ligne » en rouge', 'Internet est coupé ou faible. <b>Aucune commande n’est perdue</b> : elles s’afficheront et s’imprimeront au retour du réseau. Vérifie le Wi-Fi de la tablette. Si ça dure, préviens le gérant.'],
    ['La tablette s’est éteinte', 'Rebranche-la sur son chargeur, rallume-la et ouvre la page <b>Cuisine</b> (l’icône Anas Grill sur l’écran d’accueil). Pas besoin de retaper le code. Les commandes arrivées entre-temps s’impriment toutes seules.'],
    ['Le code est demandé', 'C’est le code à 8 chiffres <b>de ton snack</b>, donné par le gérant. Il ne se tape qu’une fois sur cette tablette.'],
    ['Fermeture du soir', 'Rien à faire : le site arrête de prendre des commandes 15 minutes avant la fermeture et reprend à 8 h. Pour une fermeture exceptionnelle (congés, travaux), c’est le gérant qui la règle.'],
  ];
  function panneauAide() {
    panneau('<h2>Que faire si…</h2><div class="cu-aide-liste">' +
      AIDE.map(function (a) { return '<details class="cu-aide-item"><summary>' + a[0] + '</summary><p>' + a[1] + '</p></details>'; }).join('') +
      '</div><p class="cu-aide-pied">Un problème que la fiche ne règle pas : appelle le gérant.</p>' +
      '<div class="cu-actions"><button type="button" class="cu-bouton" data-aide-imprimer>Imprimer la fiche</button><button type="button" class="cu-bouton cu-feu" data-fermer>Fermer</button></div>');
  }
  function imprimerAide() {
    var f = document.createElement('iframe'); f.className = 'cu-iframe'; document.body.appendChild(f);
    var d = f.contentDocument;
    d.open(); d.write('<!doctype html><meta charset="utf-8"><title>Anas Grill — Que faire si…</title><style>@page{size:A4;margin:14mm}body{font:12.5pt/1.45 Arial,sans-serif;color:#000}h1{font-size:22pt;margin:0 0 4pt}p.s{margin:0 0 12pt;color:#444}h2{font-size:13.5pt;margin:12pt 0 2pt}p{margin:0}</style>' +
      '<h1>Anas Grill — Que faire si…</h1><p class="s">Fiche de la tablette Cuisine' + (session && session.snack ? ' · ' + esc(session.snack.nom) : '') + '</p>' +
      AIDE.map(function (a) { return '<h2>' + a[0] + '</h2><p>' + a[1] + '</p>'; }).join('') + '<h2>Autre problème</h2><p>Appelle le gérant.</p>');
    d.close();
    setTimeout(function () { try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) {} setTimeout(function () { f.remove(); }, 5000); }, 250);
  }

  // L'appli de la tablette : toujours la derniere version publiee (GitHub, depot anasgrillprint).
  var APK = 'https://github.com/Shigyn/anasgrillprint/releases/latest/download/anasgrill-cuisine.apk';
  function panneauInstaller() {
    var android = /android/i.test(navigator.userAgent);
    panneau('<h2>Installer l’appli de la cuisine</h2>' +
      '<p>Avec l’appli, les tickets sortent <b>tout seuls</b> sur l’imprimante de la cuisine. À faire une seule fois, sur la <b>tablette Android</b> de la cuisine.</p>' +
      (android ? '' : '<p class="cu-note">Tu n’es pas sur une tablette Android : ouvre cette page sur la tablette de la cuisine pour installer l’appli. (iPhone et iPad ne sont pas compatibles.)</p>') +
      '<h3 class="cu-h3">Avant de commencer</h3><ul class="cu-tuto">' +
        '<li>L’imprimante à tickets est <b>allumée</b> et branchée à la <b>box internet</b> par un câble réseau.</li>' +
        '<li>La tablette est connectée au <b>Wi-Fi du snack</b> (pas le Wi-Fi « invités »).</li></ul>' +
      '<h3 class="cu-h3">Installation (2 minutes)</h3><ol class="cu-tuto">' +
        '<li>Touche <b>Télécharger l’appli</b> ci-dessous.</li>' +
        '<li>Ouvre le fichier téléchargé (<b>anasgrill-cuisine.apk</b>), depuis la notification ou le dossier Téléchargements.</li>' +
        '<li>Android demande d’<b>autoriser l’installation</b> depuis le navigateur : touche <b>Paramètres</b>, active l’autorisation, puis reviens et touche <b>Installer</b>. C’est normal pour une appli qui ne vient pas du Play Store.</li>' +
        '<li>Ouvre l’appli <b>Anas Grill</b> et tape le <b>code à 8 chiffres</b> du snack.</li>' +
        '<li>L’appli <b>cherche l’imprimante toute seule</b> et imprime un ticket numéroté : touche le numéro du ticket sorti <b>en cuisine</b>. C’est réglé.</li></ol>' +
      '<h3 class="cu-h3">Pour que ça tienne toute la journée</h3><ul class="cu-tuto">' +
        '<li>Laisse la tablette <b>branchée sur son chargeur</b>.</li>' +
        '<li>Paramètres Android → Applis → Anas Grill → Batterie : choisis <b>Sans restriction</b>.</li></ul>' +
      '<div class="cu-actions">' + (android ? '<a class="cu-bouton cu-feu cu-lien" href="' + APK + '">Télécharger l’appli</a>' : '<button type="button" class="cu-bouton" data-copier-lien>Copier le lien de l’appli</button>') +
      '<button type="button" class="cu-bouton cu-discret" data-fermer>Fermer</button></div>');
  }

  function panneauReglages() {
    panneau('<h2>Réglages de la tablette</h2><label class="cu-choix"><span>Impression</span><select data-imp>' +
      (APPLI ? [['appli', 'Appli (imprimante réseau)']] : []).concat([['navigateur', 'Navigateur (PC)'], ['aucune', 'Aucune']]).map(function (o) { return '<option value="' + o[0] + '"' + (reglage.impression === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') +
      '</select></label>' +
      (APPLI ? '<label class="cu-choix"><span>Adresse de l’imprimante</span><input data-ip inputmode="decimal" placeholder="192.168.1.87" value="' + esc(reglage.ip) + '"></label>' +
        (window.LocWebImprimante.chercher ? '<div class="cu-actions"><button type="button" class="cu-bouton cu-feu" data-chercher>Chercher l’imprimante</button></div>' : '') : '') +
      '<label class="cu-choix"><span>Sonnerie</span><input type="checkbox" data-son' + (reglage.son ? ' checked' : '') + '></label>' +
      (MAJ ? '<div class="cu-choix"><span>Version de l’appli : ' + window.LocWebImprimante.versionAppli() + '</span><button type="button" class="cu-bouton" data-maj-verifier>Vérifier les mises à jour</button></div>' : '') +
      '<div class="cu-actions"><button type="button" class="cu-bouton" data-test-imp>Ticket de test</button><button type="button" class="cu-bouton" data-test-son>Tester le son</button></div>' +
      '<div class="cu-actions"><button type="button" class="cu-bouton cu-discret" data-deco>Se déconnecter</button><button type="button" class="cu-bouton" data-fermer>Fermer</button></div>');
  }

  document.addEventListener('click', function (e) {
    var t = e.target;
    if (t.closest('[data-voile]') || t.closest('[data-fermer]')) { fermerPanneau(); return; }
    if (t.closest('[data-epuises]')) { panneauEpuises(); return; }
    if (t.closest('[data-reglages]')) { panneauReglages(); return; }
    if (t.closest('[data-aide]')) { panneauAide(); return; }
    if (t.closest('[data-installer]')) { panneauInstaller(); return; }
    if (t.closest('[data-maj-go]')) {
      if (!DERNIERE || !DERNIERE.url) { verifierMaj(true); return; }
      panneau('<h2>Mise à jour en cours…</h2><span class="cu-attente" aria-hidden="true"></span><p>Téléchargement de la nouvelle version. Android va te demander de confirmer : touche <b>Mettre à jour</b>.</p>');
      window.LocWebImprimante.mettreAJour(DERNIERE.url);
      return;
    }
    if (t.closest('[data-maj-verifier]')) { fermerPanneau(); verifierMaj(true); return; }
    var cp = t.closest('[data-copier-lien]');
    if (cp) { try { navigator.clipboard.writeText(APK); cp.textContent = 'Lien copié ✓'; } catch (x) { prompt('Lien de l’appli :', APK); } return; }
    if (t.closest('[data-chercher]')) { panneauRecherche(); return; }
    var ch = t.closest('[data-choisir-ip]');
    if (ch) {
      reglage.ip = ch.getAttribute('data-choisir-ip'); reglage.port = 9100; reglage.impression = 'appli'; ecrire('ag-cuisine-reglage', reglage);
      panneau('<h2>Imprimante réglée ✓</h2><p>Les tickets sortiront sur l’imprimante <b>' + esc(reglage.ip) + '</b>. Tu peux la retrouver à tout moment dans <b>Réglages → Chercher l’imprimante</b>.</p><div class="cu-actions"><button type="button" class="cu-bouton cu-feu" data-fermer>Terminé</button></div>');
      imprimerEnAttente();
      return;
    }
    if (t.closest('[data-aide-imprimer]')) { imprimerAide(); return; }
    if (t.closest('[data-deco]')) { if (confirm('Se déconnecter de cette tablette ? Il faudra retaper le code.')) deconnecter(); return; }
    if (t.closest('[data-test-son]')) { var s0 = reglage.son; reglage.son = true; sonner(); reglage.son = s0; return; }
    if (t.closest('[data-test-imp]')) { imprimerTest(); return; }
    var pl = t.closest('[data-plat]');
    if (pl) {
      var v = !pl.classList.contains('cu-ep');
      appel('epuise', { plat: pl.getAttribute('data-plat'), valeur: v }).then(function (j) { donnees.snack.epuises = j.epuises; pl.classList.toggle('cu-ep', v); }).catch(function (x) { alert(x.message); });
      return;
    }
    if (t.closest('[data-pause]')) {
      var p = !donnees.snack.pause;
      if (p && !confirm('Mettre les commandes en ligne en pause ? Les commandes déjà payées restent à préparer.')) return;
      appel('pause', { valeur: p }).then(function () { donnees.snack.pause = p; majEtat(); });
      return;
    }
    var art = t.closest('[data-id]'); if (!art) return;
    var c = donnees.commandes.filter(function (x) { return x.id === art.getAttribute('data-id'); })[0];
    var st = t.closest('[data-statut]');
    if (st) { var nv = st.getAttribute('data-statut'); appel('statut', { id: c.id, statut: nv }).then(function () { c.statut = nv; afficher(); }); return; }
    if (t.closest('[data-reimprimer]')) { imprimees[c.id] = false; imprimer(c); }
  });
  document.addEventListener('change', function (e) {
    if (e.target.matches('[data-imp]')) { reglage.impression = e.target.value; ecrire('ag-cuisine-reglage', reglage); }
    if (e.target.matches('[data-son]')) { reglage.son = e.target.checked; ecrire('ag-cuisine-reglage', reglage); }
    if (e.target.matches('[data-ip]')) { reglage.ip = e.target.value.trim(); ecrire('ag-cuisine-reglage', reglage); }
  });
  function imprimerTest() {
    var c = { id: 'test', numero: 0, heure_prevue: new Date(Date.now() + 900000).toISOString(), creneau: null, prenom: 'Test', telephone: '06 00 00 00 00', note: 'Ticket de test : si tu le lis, l’impression marche.', total_cents: 1000,
      lignes: [{ qte: 1, n: 'Le Classique', resume: 'Sandwich : Curry, sauce mayo ×2 · Burger : Steak, sans cornichon' }] };
    var r = reglage.impression === 'appli' ? viaAppli(c) : viaNavigateur(c);
    if (r && reglage.impression === 'appli') alerteImpression('Ticket de test envoyé à ' + reglage.ip + '.');
  }

  if (session && session.jeton) demarrer(); else ecranCode();
})();
