/* ===================================================================
   Anas Grill — « Choisis ton restaurant » (LocWeb, 2026-10-14)
   La carte des snacks, le plus proche mis en avant : par la position
   du telephone (avec permission) ou par l'adresse tapee (Base Adresse
   Nationale, gratuite, sans cle). Sans JavaScript, la liste suffit.
   =================================================================== */
(function () {
  'use strict';
  var SNACKS = JSON.parse(document.getElementById('snacks-json').textContent);
  var note = document.querySelector('[data-choix-note]');
  var liste = document.querySelector('[data-snacks]');

  function km(a, b) {
    var R = 6371, r = Math.PI / 180;
    var dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
    var x = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * R * Math.asin(Math.sqrt(x));
  }
  var fmtKm = function (d) { return d < 1 ? Math.round(d * 1000) + ' m' : d.toFixed(1).replace('.', ',') + ' km'; };

  /* --- La carte dessinee (SVG genere au build, aucune requete) --- */
  var svg = document.querySelector('.carte-svg');
  var C = JSON.parse(svg.getAttribute('data-cadre'));
  function proj(lat, lng) { return [(lng - C.O) / (C.E - C.O) * C.W, (C.N - lat) / (C.N - C.S) * C.H]; }

  function surligner(id) {
    liste.querySelectorAll('.snack').forEach(function (li) { li.classList.toggle('actif', li.getAttribute('data-snack') === id); });
    svg.querySelectorAll('.marqueur').forEach(function (m) { m.classList.toggle('actif', m.getAttribute('data-snack') === id); });
  }
  liste.addEventListener('mouseover', function (e) { var li = e.target.closest('.snack'); if (li) surligner(li.getAttribute('data-snack')); });

  /* --- Classer par distance depuis un point --- */
  function classer(point, libelle) {
    var tries = SNACKS.map(function (s) { return { s: s, d: km(point, s) }; }).sort(function (a, b) { return a.d - b.d; });
    tries.forEach(function (t, i) {
      var li = liste.querySelector('[data-snack="' + t.s.id + '"]');
      li.querySelector('[data-distance]').textContent = fmtKm(t.d);
      li.classList.toggle('proche', i === 0);
      liste.appendChild(li);
    });
    var p = tries[0];
    note.innerHTML = 'Le plus proche ' + (libelle ? 'de <b>' + libelle + '</b>' : 'de toi') + ' : <a href="' + ANAS.racine + p.s.id + '/">Anas Grill ' + p.s.nom + '</a> à ' + fmtKm(p.d) + '.';
    surligner(p.s.id);
    // Ta position sur la carte, si elle est dans le cadre.
    var xy = proj(point.lat, point.lng), v = svg.querySelector('[data-vous]');
    var dedans = xy[0] > 10 && xy[0] < C.W - 10 && xy[1] > 10 && xy[1] < C.H - 10;
    v.toggleAttribute('hidden', !dedans);
    if (dedans) v.setAttribute('transform', 'translate(' + xy[0].toFixed(1) + ' ' + xy[1].toFixed(1) + ')');
    // On retient l'adresse pour la livraison (pre-remplie au paiement).
    try { if (libelle) localStorage.setItem('anas-adresse', JSON.stringify({ label: libelle, lat: point.lat, lng: point.lng })); } catch (e) {}
  }

  /* --- La position du telephone --- */
  document.querySelector('[data-localiser]').addEventListener('click', function (e) {
    var b = e.currentTarget;
    if (!navigator.geolocation) { note.textContent = 'Ton navigateur ne donne pas ta position : tape ton adresse.'; return; }
    b.disabled = true; note.textContent = 'On cherche ta position…';
    navigator.geolocation.getCurrentPosition(function (pos) {
      b.disabled = false; classer({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    }, function () {
      b.disabled = false; note.textContent = 'Position refusée ou introuvable : tape ton adresse juste au-dessus.';
    }, { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 });
  });

  /* --- L'adresse tapee (Base Adresse Nationale) --- */
  var champ = document.querySelector('[data-adresse-champ]');
  var sugg = document.querySelector('[data-suggestions]');
  var minuterie = null;
  champ.addEventListener('input', function () {
    clearTimeout(minuterie);
    var q = champ.value.trim();
    if (q.length < 4) { sugg.hidden = true; return; }
    minuterie = setTimeout(function () {
      fetch('https://api-adresse.data.gouv.fr/search/?limit=5&autocomplete=1&lat=45.76&lon=4.95&q=' + encodeURIComponent(q))
        .then(function (r) { return r.json(); })
        .then(function (j) {
          sugg.innerHTML = (j.features || []).map(function (f) {
            return '<li><button type="button" data-lat="' + f.geometry.coordinates[1] + '" data-lng="' + f.geometry.coordinates[0] + '">' + f.properties.label + '</button></li>';
          }).join('');
          sugg.hidden = !sugg.children.length;
        }).catch(function () { sugg.hidden = true; });
    }, 250);
  });
  sugg.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    champ.value = b.textContent; sugg.hidden = true;
    classer({ lat: +b.getAttribute('data-lat'), lng: +b.getAttribute('data-lng') }, b.textContent);
  });
  document.querySelector('[data-adresse-form]').addEventListener('submit', function (e) {
    e.preventDefault(); var b = sugg.querySelector('button'); if (b) b.click();
  });

  /* --- Une adresse deja connue : on reclasse tout de suite --- */
  try {
    var memo = JSON.parse(localStorage.getItem('anas-adresse') || 'null');
    if (memo) { champ.value = memo.label; classer(memo, memo.label); }
  } catch (e) {}
})();
