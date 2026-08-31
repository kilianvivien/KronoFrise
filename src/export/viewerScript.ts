/**
 * Script embarqué dans la page web exportée.
 *
 * Il vit **hors** de l'application : pas de React, pas d'import, aucun accès
 * réseau. Il ne recalcule jamais la mise en page — celle-ci est déjà figée
 * dans le SVG exporté — il ne fait que déplacer la fenêtre de vue (`viewBox`),
 * mettre un élément en valeur et afficher sa fiche.
 *
 * Écrit comme une chaîne : c'est du code destiné à un autre document.
 */
export const VIEWER_SCRIPT = String.raw`
(function () {
  var data = window.__KRONO__;
  var svg = document.querySelector('#frise svg');
  if (!svg || !data) return;
  var stage = document.getElementById('frise');
  var base = { x: 0, y: 0, w: data.width, h: data.height };
  var view = { x: 0, y: 0, w: data.width, h: data.height };
  var step = -1;
  var animation = null;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /**
   * Rapport de la fenêtre, pas celui de la frise : la vue remplit la page au
   * lieu de flotter entre deux bandes vides. Le papier déborde la scène, et le
   * fond de page porte la même couleur : la feuille paraît continue.
   */
  function ratio() {
    var box = stage.getBoundingClientRect();
    return box.height > 0 ? box.width / box.height : base.w / base.h;
  }
  function heightFor(width) { return width / ratio(); }

  var highlight = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  highlight.setAttribute('class', 'krono-highlight');
  highlight.setAttribute('rx', '7');
  highlight.style.display = 'none';
  svg.appendChild(highlight);

  function apply() {
    svg.setAttribute('viewBox', view.x + ' ' + view.y + ' ' + view.w + ' ' + view.h);
  }
  function clamp(next) {
    var minW = base.w / 40;
    next.w = Math.max(minW, Math.min(base.w, next.w));
    next.h = heightFor(next.w);
    next.x = Math.max(-base.w * 0.25, Math.min(base.w * 1.25 - next.w, next.x));
    // Verticalement, la scène est centrée tant qu'elle tient dans la vue.
    if (next.h >= base.h) next.y = (base.h - next.h) / 2;
    else next.y = Math.max(-base.h * 0.1, Math.min(base.h * 1.1 - next.h, next.y));
    return next;
  }
  function overview() { return clamp({ x: 0, y: 0, w: base.w, h: heightFor(base.w) }); }
  function animate(target) {
    if (animation) cancelAnimationFrame(animation);
    target = clamp(target);
    if (reduce) { view = target; apply(); return; }
    var from = { x: view.x, y: view.y, w: view.w, h: view.h };
    var start = performance.now();
    function tick(now) {
      var t = Math.min(1, (now - start) / 600);
      var e = 1 - Math.pow(1 - t, 3);
      view = { x: from.x + (target.x - from.x) * e, y: from.y + (target.y - from.y) * e,
               w: from.w + (target.w - from.w) * e, h: from.h + (target.h - from.h) * e };
      apply();
      if (t < 1) animation = requestAnimationFrame(tick);
    }
    animation = requestAnimationFrame(tick);
  }

  function show(index) {
    step = Math.max(-1, Math.min(data.items.length - 1, index));
    var card = document.getElementById('krono-card');
    var counter = document.getElementById('krono-counter');
    if (step < 0) {
      highlight.style.display = 'none';
      card.hidden = true;
      counter.textContent = data.strings.overview;
      animate(overview());
      return;
    }
    var item = data.items[step];
    highlight.style.display = '';
    highlight.setAttribute('x', item.x - 3);
    highlight.setAttribute('y', item.y - 3);
    highlight.setAttribute('width', item.width + 6);
    highlight.setAttribute('height', item.height + 6);
    counter.textContent = data.strings.position.replace('{index}', step + 1).replace('{total}', data.items.length);
    card.hidden = false;
    card.querySelector('h2').textContent = item.label;
    var dates = card.querySelector('.krono-dates');
    dates.textContent = item.dates;
    dates.hidden = !item.dates;
    var description = card.querySelector('.krono-description');
    description.textContent = item.description || '';
    description.hidden = !item.description;
    var picture = card.querySelector('img');
    var source = svg.querySelector('[data-item-id="' + item.id + '"] image');
    if (source) { picture.setAttribute('src', source.getAttribute('href')); picture.hidden = false; }
    else { picture.removeAttribute('src'); picture.hidden = true; }
    // La fenêtre garde le rapport de la scène : on centre donc l'élément
    // dans les deux sens, sinon un zoom horizontal le ferait sortir par le bas.
    // Jamais moins d'un tiers de la frise : sur un segment comprimé, une barre
    // étroite ferait sinon un zoom démesuré, sans repères autour.
    var width = Math.max(item.width * 2.5, base.w / 3.2);
    var height = heightFor(width);
    // Bas de la vue : la règle et ses libellés restent lisibles. Si l'élément
    // ne tient pas au-dessus, c'est lui qui décide — il est le sujet du pas.
    var y = (data.baseline + 56) - height;
    if (item.y < y + 8) y = item.y - 8;
    animate({ x: item.x + item.width / 2 - width / 2, y: y, w: width, h: height });
  }

  document.getElementById('krono-prev').addEventListener('click', function () { show(step - 1); });
  document.getElementById('krono-next').addEventListener('click', function () { show(step + 1); });
  document.getElementById('krono-fit').addEventListener('click', function () { show(-1); });
  function zoomBy(factor) {
    var cx = view.x + view.w / 2, cy = view.y + view.h / 2;
    var w = view.w * factor, h = view.h * factor;
    animate({ x: cx - w / 2, y: cy - h / 2, w: w, h: h });
  }
  document.getElementById('krono-in').addEventListener('click', function () { zoomBy(0.7); });
  document.getElementById('krono-out').addEventListener('click', function () { zoomBy(1 / 0.7); });
  document.getElementById('krono-full').addEventListener('click', function () {
    if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen();
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'ArrowRight' || event.key === ' ') { event.preventDefault(); show(step + 1); }
    else if (event.key === 'ArrowLeft') { event.preventDefault(); show(step - 1); }
    else if (event.key === 'Home' || event.key === 'Escape') { event.preventDefault(); show(-1); }
    else if (event.key === 'End') { event.preventDefault(); show(data.items.length - 1); }
  });

  stage.addEventListener('wheel', function (event) {
    event.preventDefault();
    var rect = svg.getBoundingClientRect();
    var factor = Math.exp(event.deltaY / 400);
    var px = view.x + ((event.clientX - rect.left) / rect.width) * view.w;
    var py = view.y + ((event.clientY - rect.top) / rect.height) * view.h;
    var next = clamp({ x: px - (px - view.x) * factor, y: py - (py - view.y) * factor, w: view.w * factor, h: view.h * factor });
    if (animation) cancelAnimationFrame(animation);
    view = next; apply();
  }, { passive: false });

  // La fenêtre change de forme : la vue suit, sinon l'image se déforme.
  var resize = null;
  window.addEventListener('resize', function () {
    clearTimeout(resize);
    resize = setTimeout(function () { view = clamp(view); apply(); }, 100);
  });

  var drag = null;
  stage.addEventListener('pointerdown', function (event) {
    drag = { x: event.clientX, y: event.clientY, view: { x: view.x, y: view.y } };
    stage.setPointerCapture(event.pointerId);
    stage.classList.add('krono-dragging');
  });
  stage.addEventListener('pointermove', function (event) {
    if (!drag) return;
    var rect = svg.getBoundingClientRect();
    view.x = drag.view.x - (event.clientX - drag.x) * (view.w / rect.width);
    view.y = drag.view.y - (event.clientY - drag.y) * (view.h / rect.height);
    view = clamp(view); apply();
  });
  function endDrag() { drag = null; stage.classList.remove('krono-dragging'); }
  stage.addEventListener('pointerup', endDrag);
  stage.addEventListener('pointercancel', endDrag);

  // Cliquer un élément de la frise l'ouvre : la page se parcourt à la souris.
  svg.addEventListener('click', function (event) {
    var group = event.target.closest ? event.target.closest('[data-item-id]') : null;
    if (!group) return;
    var id = group.getAttribute('data-item-id');
    for (var i = 0; i < data.items.length; i++) if (data.items[i].id === id) { show(i); return; }
  });

  view = overview();
  apply();
  show(-1);
})();
`;
