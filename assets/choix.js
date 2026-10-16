/* ===================================================================
   Anas Grill — l'arrivee « Choisis ton restaurant » (LocWeb, 2026-10-14)
   Les restaurants en cartes, classees par distance : par la position
   du telephone (avec permission) ou l'adresse tapee (Base Adresse
   Nationale, gratuite). Leger : pas de carte interactive, des images
   statiques et quelques classes CSS. Sans JavaScript, tout reste cliquable.
   =================================================================== */
(function () {
  'use strict';
  var J = JSON.parse(document.getElementById('snacks-json').textContent);
  var SNACKS = J.snacks, C = J.cadre;
  var note = document.querySelector('[data-choix-note]');
  var liste = document.querySelector('[data-snacks]');
  var ensemble = document.querySelector('.ensemble');
  var LOIN = 40; // au-dela, on dit franchement qu'il n'y a pas d'Anas Grill a cote

  function km(a, b) {
    var R = 6371, r = Math.PI / 180, dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
    var x = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * R * Math.asin(Math.sqrt(x));
  }
  var fmtKm = function (d) { return d < 1 ? Math.round(d * 1000) + ' m' : (d < 10 ? d.toFixed(1).replace('.', ',') : Math.round(d)) + ' km'; };

  function surligner(id) {
    document.querySelectorAll('[data-snack]').forEach(function (el) { el.classList.toggle('actif', el.getAttribute('data-snack') === id); });
  }
  document.addEventListener('mouseover', function (e) { var el = e.target.closest('[data-snack]'); if (el) surligner(el.getAttribute('data-snack')); });

  function classer(point, libelle, ouvrir) {
    var tries = SNACKS.map(function (s) { return { s: s, d: km(point, s) }; }).sort(function (a, b) { return a.d - b.d; });
    tries.forEach(function (t, i) {
      var li = liste.querySelector('li[data-snack="' + t.s.id + '"]');
      li.querySelector('[data-distance]').textContent = fmtKm(t.d);
      li.classList.toggle('proche', i === 0 && t.d < LOIN);
      li.style.setProperty('--i', i);
      liste.appendChild(li);
    });
    // On rejoue l'apparition dans le nouvel ordre.
    liste.classList.remove('rejoue'); void liste.offsetWidth; liste.classList.add('rejoue');
    var p = tries[0], lien = '<a href="' + ANAS.racine + p.s.id + '/">Anas Grill ' + p.s.nom + '</a>';
    note.innerHTML = p.d < LOIN
      ? 'Le plus proche ' + (libelle ? 'de <b>' + libelle + '</b>' : 'de toi') + ' : ' + lien + ', à ' + fmtKm(p.d) + '.'
      : 'Pas encore d’Anas Grill ' + (libelle ? 'près de <b>' + libelle + '</b>' : 'près de toi') + '. Le plus proche est ' + lien + ', à ' + fmtKm(p.d) + '.';
    surligner(p.s.id);
    // « Le plus proche de moi » : on ouvre directement sa carte (Nicolas).
    if (ouvrir && p.d < LOIN) {
      note.innerHTML = 'On t’emmène chez <b>Anas Grill ' + p.s.nom + '</b>, à ' + fmtKm(p.d) + '…';
      setTimeout(function () { location.href = ANAS.racine + p.s.id + '/'; }, 450);
    }
    // Ton point sur la petite carte, s'il tombe dedans.
    var x = (point.lng - C.O) / (C.E - C.O) * 100, y = (C.N - point.lat) / (C.N - C.S) * 100, v = ensemble.querySelector('[data-vous]');
    v.hidden = !(x > 1 && x < 99 && y > 1 && y < 99);
    v.style.left = x + '%'; v.style.top = y + '%';
    try { if (libelle) localStorage.setItem('anas-adresse', JSON.stringify({ label: libelle, lat: point.lat, lng: point.lng })); } catch (e) {}
  }

  /* --- La position du telephone --- */
  document.querySelector('[data-localiser]').addEventListener('click', function (e) {
    var b = e.currentTarget;
    if (!navigator.geolocation) { note.textContent = 'Ton navigateur ne donne pas ta position : tape ton adresse.'; return; }
    b.disabled = true; note.textContent = 'On cherche ta position…';
    navigator.geolocation.getCurrentPosition(function (pos) {
      b.disabled = false; classer({ lat: pos.coords.latitude, lng: pos.coords.longitude }, null, true);
    }, function () {
      b.disabled = false; note.textContent = 'Position refusée ou introuvable : tape ton adresse juste à côté.';
    }, { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 });
  });

  /* --- L'adresse tapee --- */
  var champ = document.querySelector('[data-adresse-champ]'), sugg = document.querySelector('[data-suggestions]'), minut = null;
  champ.addEventListener('input', function () {
    clearTimeout(minut);
    var q = champ.value.trim();
    if (q.length < 4) { sugg.hidden = true; return; }
    minut = setTimeout(function () {
      fetch('https://api-adresse.data.gouv.fr/search/?limit=5&autocomplete=1&lat=45.76&lon=4.95&q=' + encodeURIComponent(q))
        .then(function (r) { return r.json(); })
        .then(function (j) {
          sugg.innerHTML = (j.features || []).map(function (f) {
            return '<li><button type="button" data-lat="' + f.geometry.coordinates[1] + '" data-lng="' + f.geometry.coordinates[0] + '">' + f.properties.label + '</button></li>';
          }).join('');
          sugg.hidden = !sugg.children.length;
        }).catch(function () { sugg.hidden = true; });
    }, 300);
  });
  sugg.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    champ.value = b.textContent; sugg.hidden = true;
    classer({ lat: +b.getAttribute('data-lat'), lng: +b.getAttribute('data-lng') }, b.textContent);
  });
  document.querySelector('[data-adresse-form]').addEventListener('submit', function (e) {
    e.preventDefault(); var b = sugg.querySelector('button'); if (b) b.click();
  });

  try {
    var memo = JSON.parse(localStorage.getItem('anas-adresse') || 'null');
    if (memo) { champ.value = memo.label; classer(memo, memo.label); }
  } catch (e) {}
})();
