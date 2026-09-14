// Decorative cursor image trail: code, tool logos, and supplied AI illustrations.
(() => {
  const hero = document.querySelector('.hero');
  const layer = hero.querySelector('.hero-trail');
  const root = document.documentElement;
  const pointer = matchMedia('(hover: hover) and (pointer: fine)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const sources = ['agent.jpg', 'huggingface.svg', 'github.svg', 'ollama.png', 'transformer.jpg', 'user.jpg'].map(name => `assets/trail-${name}`);
  const active = [];
  let images = [];
  let loading;
  let index = 0;
  let depth = 0;
  let frame = 0;
  let pending;
  let last;
  let lastTime = 0;
  const enabled = () => root.dataset.motion === 'on' && pointer.matches && !reduced.matches && !document.hidden;
  const clear = () => {
    cancelAnimationFrame(frame);
    frame = 0; pending = null; last = null; lastTime = 0; depth = 0;
    active.splice(0).forEach(item => { item.animation.cancel(); item.node.remove(); });
  };
  const prepare = () => {
    if (loading || !enabled()) return;
    loading = Promise.all(sources.map(src => new Promise(resolve => {
      const image = new Image();
      image.onload = () => resolve({ src, ratio: image.naturalWidth / image.naturalHeight });
      image.onerror = () => resolve(null);
      image.src = src;
    }))).then(ready => { images = ready.filter(Boolean); });
  };
  const paint = () => {
    frame = 0;
    if (!enabled() || !pending || !images.length) return;
    const { x, y } = pending;
    const now = performance.now();
    const distance = last ? Math.hypot(x - last.x, y - last.y) : Infinity;
    if (distance < 65 || now - lastTime < 65) return;
    const dx = last ? Math.max(-1, Math.min(1, (x - last.x) / 110)) : .3;
    const dy = last ? Math.max(-1, Math.min(1, (y - last.y) / 110)) : -.2;
    last = { x, y }; lastTime = now;
    if (active.length >= 8) { const oldest = active.shift(); oldest.animation.cancel(); oldest.node.remove(); }
    const node = document.createElement('div');
    node.className = 'hero-trail-card';
    const picture = images[index % images.length];
    node.style.backgroundImage = `url("${picture.src}")`;
    const logo = /huggingface|github|ollama/.test(picture.src);
    node.style.aspectRatio = logo ? '1' : String(picture.ratio);
    if (logo) node.classList.add('hero-trail-logo');
    if (picture.ratio < 1 && !logo) node.style.width = '220px';
    node.style.left = `${x}px`;
    node.style.top = `${y}px`;
    node.style.zIndex = String(++depth);
    const rotation = [-9, 7, -4, 11][index++ % 4];
    layer.append(node);
    const pose = (mx, my, scale, angle) => `translate(calc(-50% + ${mx}px), calc(-50% + ${my}px)) rotate(${angle}deg) scale(${scale})`;
    const animation = node.animate([
      { transform: pose(-dx * 30, -dy * 30, .7, rotation - 4), opacity: 0, offset: 0 },
      { transform: pose(0, 0, 1, rotation), opacity: 1, offset: .16 },
      { transform: pose(dx * 13, dy * 13, 1, rotation + 2), opacity: 1, offset: .52 },
      { transform: pose(dx * 30, dy * 30, .88, rotation + 5), opacity: 0, offset: 1 }
    ], { duration: 1150, easing: 'cubic-bezier(.2,.65,.3,1)', fill: 'forwards' });
    const item = { node, animation };
    active.push(item);
    animation.finished.then(() => {
      node.remove();
      const at = active.indexOf(item);
      if (at >= 0) active.splice(at, 1);
    }).catch(() => {});
  };
  hero.addEventListener('pointerenter', prepare);
  hero.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse' || !enabled()) return;
    prepare();
    const rect = hero.getBoundingClientRect();
    pending = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    if (!frame) frame = requestAnimationFrame(paint);
  }, { passive: true });
  hero.addEventListener('pointerleave', clear);
  window.addEventListener('scroll', clear, { passive: true });
  window.addEventListener('resize', clear);
  document.addEventListener('visibilitychange', () => { if (!enabled()) clear(); });
  pointer.addEventListener('change', clear);
  reduced.addEventListener('change', clear);
  window.addEventListener('beforeprint', clear);
  new MutationObserver(() => { if (!enabled()) clear(); }).observe(root, { attributes: true, attributeFilter: ['data-motion'] });
})();
