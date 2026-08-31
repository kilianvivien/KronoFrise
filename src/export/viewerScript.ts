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
  var base = { x: 0, y: 0, w: data.width, h: data.height };
  var view = { x: 0, y: 0, w: data.width, h: data.height };
  var step = -1;
  var animation = null;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
    next.h = next.w * (base.h / base.w);
    next.x = Math.max(-base.w * 0.25, Math.min(base.w * 1.25 - next.w, next.x));
    next.y = Math.max(-base.h * 0.25, Math.min(base.h * 1.25 - next.h, next.y));
    return next;
  }
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
      animate({ x: 0, y: 0, w: base.w, h: base.h });
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
    card.querySelector('.krono-dates').textContent = item.dates;
    var description = card.querySelector('.krono-description');
    description.textContent = item.description || '';
    description.hidden = !item.description;
    var picture = card.querySelector('img');
    var source = svg.querySelector('[data-item-id="' + item.id + '"] image');
    if (source) { picture.setAttribute('src', source.getAttribute('href')); picture.hidden = false; }
    else { picture.removeAttribute('src'); picture.hidden = true; }
    // La fenêtre garde le rapport de la scène : on centre donc l'élément
    // dans les deux sens, sinon un zoom horizontal le ferait sortir par le bas.
    var width = Math.max(item.width * 2.5, base.w / 6);
    var height = width * (base.h / base.w);
    animate({
      x: item.x + item.width / 2 - width / 2,
      y: item.y + item.height / 2 - height / 2,
      w: width, h: height
    });
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

  var stage = document.getElementById('frise');
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

  apply();
  show(-1);
})();
`;
