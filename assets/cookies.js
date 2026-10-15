/* ===================================================================
   Anas Grill — le bandeau cookies (LocWeb, 2026-10-15)
   La mesure d'audience (mesure.js : Google Analytics + clics sur le
   telephone) ne se charge QU'APRES « Accepter » : c'est ce que demande la
   CNIL. Refuser est aussi simple qu'accepter. Le choix est garde 6 mois
   dans le navigateur ; le lien « Cookies » du pied de page le redemande.
   Le panier, lui, n'est pas un cookie de mesure : il marche sans accord.
   =================================================================== */
(function () {
  'use strict';
  var CLE = 'anas-cookies', DUREE = 182 * 864e5;
  var r = (window.ANAS || {}).racine || './';

  function lire() {
    try { var v = JSON.parse(localStorage.getItem(CLE) || 'null'); if (v && Date.now() - v.t < DUREE) return v.choix; } catch (e) {}
    return null;
  }
  function ecrire(c) { try { localStorage.setItem(CLE, JSON.stringify({ choix: c, t: Date.now() })); } catch (e) {} }
  function mesurer() {
    if (document.querySelector('script[data-mesure]')) return;
    var s = document.createElement('script'); s.src = r + 'mesure.js'; s.defer = true; s.setAttribute('data-mesure', '');
    document.body.appendChild(s);
  }
  function bandeau() {
    if (document.querySelector('.cookies')) return;
    var b = document.createElement('div');
    b.className = 'cookies'; b.setAttribute('role', 'dialog'); b.setAttribute('aria-label', 'Cookies');
    b.innerHTML = '<p><b>Cookies</b>On aimerait mesurer la fréquentation du site (Google Analytics) pour l’améliorer. Rien de publicitaire. <a href="' + r + 'confidentialite/">En savoir plus</a></p>' +
      '<div class="cookies-boutons"><button type="button" class="bouton bouton-ligne" data-c="non">Refuser</button><button type="button" class="bouton bouton-ligne" data-c="oui">Accepter</button></div>';
    document.body.appendChild(b);
    requestAnimationFrame(function () { b.classList.add('visible'); });
    b.addEventListener('click', function (e) {
      var c = e.target.closest('[data-c]'); if (!c) return;
      ecrire(c.getAttribute('data-c'));
      if (c.getAttribute('data-c') === 'oui') mesurer();
      b.classList.remove('visible'); setTimeout(function () { b.remove(); }, 300);
    });
  }

  var choix = lire();
  if (choix === 'oui') mesurer(); else if (choix === null) bandeau();
  document.addEventListener('click', function (e) {
    if (!e.target.closest('[data-cookies]')) return;
    e.preventDefault(); try { localStorage.removeItem(CLE); } catch (x) {}
    bandeau();
  });
})();
