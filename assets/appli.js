/* « Ajouter Anas Grill a l'ecran d'accueil » (Hakim, 22/10).
   Android (Chrome) : la vraie fenetre d'installation du telephone.
   iPhone : Safari n'en a pas, on explique les 3 gestes (Partager > Sur l'ecran
   d'accueil). Deja installee : le bouton ne s'affiche pas. */
(function () {
  var boutons = document.querySelectorAll('[data-installer]');
  if (!boutons.length) return;
  if ((window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone) return;
  var ua = navigator.userAgent, ios = /iphone|ipad|ipod/i.test(ua), android = /android/i.test(ua);
  var invite = null;
  function montrer(v) { boutons.forEach(function (b) { b.hidden = !v; }); }
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); invite = e; montrer(true); });
  window.addEventListener('appinstalled', function () { montrer(false); });
  if (ios) montrer(true);
  // Un autre navigateur Android (Samsung, Firefox...) : on explique par le menu.
  if (android) setTimeout(function () { if (!invite) montrer(true); }, 3000);

  function aide() {
    var etapes = ios
      ? ['Touche le bouton <b>Partager</b> de Safari (le carré avec une flèche vers le haut).', 'Choisis <b>« Sur l’écran d’accueil »</b>.', 'Touche <b>Ajouter</b>.']
      : ['Ouvre le <b>menu</b> du navigateur (les 3 points ⋮).', 'Choisis <b>« Ajouter à l’écran d’accueil »</b> ou <b>« Installer l’application »</b>.', 'Confirme.'];
    var v = document.createElement('div');
    v.className = 'appli-voile';
    v.innerHTML = '<div class="appli-boite" role="dialog" aria-modal="true" aria-label="Installer l’appli Anas Grill">' +
      '<img src="' + (document.querySelector('link[rel="apple-touch-icon"]') || {}).href + '" alt="" width="56" height="56">' +
      '<b>Anas Grill sur ton écran d’accueil</b><p>Pour commander en un geste, comme une appli :</p><ol>' +
      etapes.map(function (t) { return '<li>' + t + '</li>'; }).join('') + '</ol>' +
      '<button type="button" class="bouton bouton-feu" data-appli-ok>J’ai compris</button></div>';
    v.addEventListener('click', function (e) { if (e.target === v || e.target.closest('[data-appli-ok]')) v.remove(); });
    document.body.appendChild(v);
  }
  boutons.forEach(function (b) {
    b.addEventListener('click', function () {
      if (invite) {
        invite.prompt();
        invite.userChoice.then(function (r) { if (r.outcome === 'accepted') montrer(false); invite = null; });
        return;
      }
      aide();
    });
  });
})();
