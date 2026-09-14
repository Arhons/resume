// Content stays readable without JavaScript. Motion is progressive enhancement.
(() => {
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const root = document.documentElement;
  const toggle = document.getElementById('motion-toggle');
  const canvas = document.getElementById('ambient-canvas');
  const context = canvas.getContext('2d');
  let enabled = !preference.matches;
  let frame = 0;
  let lastTime = 0;
  let elapsed = 0;
  let width = 0;
  let height = 0;
  let printing = false;
  const pointer = { x: -1000, y: -1000 };
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const running = () => enabled && !preference.matches && !document.hidden && !printing;

  // One small canvas, capped resolution and 30 fps. No images or network requests.
  const resize = () => {
    width = window.innerWidth;
    height = window.innerHeight;
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5, Math.sqrt(2500000 / (width * height)));
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context?.setTransform(ratio, 0, 0, ratio, 0, 0);
  };
  const draw = () => {
    if (!context) return;
    context.clearRect(0, 0, width, height);
    const time = elapsed / 1000;
    const small = width < 761;
    // Quiet circuit traces and a sparse dot grid, concentrated at the edges.
    const spacing = small ? 64 : 56;
    context.fillStyle = 'rgba(44,108,75,.075)';
    for (let x = 24; x < width; x += spacing) {
      if (x > width * .24 && x < width * .76) continue;
      for (let y = 24; y < height; y += spacing) context.fillRect(x, y, 1, 1);
    }
    const count = small ? 4 : 6;
    for (let lane = 0; lane < count; lane++) {
      const right = lane % 2 === 1;
      const inset = 18 + Math.floor(lane / 2) * (small ? 22 : 42);
      const x = right ? width - inset : inset;
      const bend = x + (right ? -1 : 1) * (small ? 24 : 48);
      const y1 = height * (.2 + lane * .055);
      const y2 = height * (.59 + lane * .045);
      const points = [[x, -40], [x, y1], [bend, y1], [bend, y2], [x, y2], [x, height + 40]];
      context.beginPath();
      points.forEach(([px, py], i) => i ? context.lineTo(px, py) : context.moveTo(px, py));
      context.strokeStyle = 'rgba(44,108,75,.10)';
      context.lineWidth = .75;
      context.stroke();
      for (const [px, py] of [points[2], points[3]]) {
        context.beginPath(); context.arc(px, py, 2.5, 0, Math.PI * 2);
        context.fillStyle = '#f5f5ef'; context.fill();
        context.strokeStyle = 'rgba(44,108,75,.20)'; context.stroke();
      }
      const lengths = points.slice(1).map(([px, py], i) => Math.abs(px - points[i][0]) + Math.abs(py - points[i][1]));
      let distance = ((time * .018 + lane * .167) % 1) * lengths.reduce((sum, length) => sum + length, 0);
      for (let segment = 0; segment < lengths.length; segment++) {
        if (distance > lengths[segment]) { distance -= lengths[segment]; continue; }
        const amount = distance / lengths[segment];
        const px = points[segment][0] + (points[segment + 1][0] - points[segment][0]) * amount;
        const py = points[segment][1] + (points[segment + 1][1] - points[segment][1]) * amount;
        context.fillStyle = 'rgba(45,116,73,.32)';
        context.fillRect(px - 1.5, py - 1.5, 3, 3);
        break;
      }
    }
    // The cursor glow is painted behind all content.
    if (finePointer.matches && pointer.x >= 0) {
      const glow = context.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, 180);
      glow.addColorStop(0, 'rgba(136,179,75,.12)'); glow.addColorStop(1, 'rgba(136,179,75,0)');
      context.fillStyle = glow; context.fillRect(pointer.x - 180, pointer.y - 180, 360, 360);
    }
  };
  const tick = time => {
    if (!running()) { frame = 0; return; }
    if (time - lastTime >= 1000 / 30) {
      elapsed += Math.min(time - lastTime, 80);
      lastTime = time;
      draw();
    }
    frame = window.requestAnimationFrame(tick);
  };
  const syncMotion = () => {
    const active = running();
    root.dataset.motion = active ? 'on' : 'off';
    if (!active) document.querySelectorAll('.reveal').forEach(item => item.classList.remove('reveal'));
    toggle.setAttribute('aria-pressed', String(enabled && !preference.matches));
    toggle.querySelector('.motion-label').textContent = enabled && !preference.matches ? 'Анимация: вкл' : 'Анимация: выкл';
    toggle.querySelector('.motion-symbol').textContent = enabled && !preference.matches ? 'Ⅱ' : '▷';
    toggle.disabled = preference.matches;
    toggle.title = preference.matches ? 'Анимация отключена настройкой уменьшения движения в вашей системе' : 'Включить или отключить визуальные эффекты';
    if (active && !frame) { lastTime = performance.now(); frame = window.requestAnimationFrame(tick); }
    if (!active) { window.cancelAnimationFrame(frame); frame = 0; }
  };
  resize();
  toggle.hidden = false;
  toggle.addEventListener('click', () => { enabled = !enabled; syncMotion(); });
  preference.addEventListener('change', () => { enabled = !preference.matches; syncMotion(); });
  document.addEventListener('visibilitychange', syncMotion);
  window.addEventListener('beforeprint', () => { printing = true; syncMotion(); });
  window.addEventListener('afterprint', () => { printing = false; syncMotion(); });
  window.addEventListener('resize', resize);
  window.addEventListener('pointermove', event => {
    if (running() && finePointer.matches) { pointer.x = event.clientX; pointer.y = event.clientY; }
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => { pointer.x = -1000; pointer.y = -1000; });
  syncMotion();

  // Card lighting follows the pointer; the content and hit targets stay still.
  document.querySelectorAll('.timeline-item, .skill-group, .edu-item, .hero-visual').forEach(card => {
    card.addEventListener('pointermove', event => {
      if (!running() || !finePointer.matches) return;
      const bounds = card.getBoundingClientRect();
      card.style.setProperty('--light-x', `${event.clientX - bounds.left}px`);
      card.style.setProperty('--light-y', `${event.clientY - bounds.top}px`);
    }, { passive: true });
  });
  document.querySelectorAll('[data-print]').forEach(button => {
    button.addEventListener('click', () => window.print());
  });

  const progress = document.querySelector('.reading-progress');
  let scheduled = false;
  const updateProgress = () => {
    const available = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.width = `${available > 0 ? Math.min(100, Math.max(0, window.scrollY / available * 100)) : 0}%`;
    scheduled = false;
  };
  window.addEventListener('scroll', () => {
    if (!scheduled) { scheduled = true; window.requestAnimationFrame(updateProgress); }
  }, { passive: true });
  window.addEventListener('resize', updateProgress);
  updateProgress();

  if ('IntersectionObserver' in window) {
    document.addEventListener('animationend', event => {
      if (event.animationName === 'section-arrive') event.target.classList.remove('reveal');
    });
    const showSection = (item, animate = true) => {
      const pending = item.classList.contains('reveal-pending');
      item.classList.remove('reveal-pending');
      if (pending && animate && running()) item.classList.add('reveal');
      if (!animate) item.classList.remove('reveal');
      reveal.unobserve(item);
    };
    const reveal = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        showSection(entry.target);
      });
    }, { threshold: 0, rootMargin: '0px 0px -32px 0px' });
    document.querySelectorAll('.section, #achievements, .contact').forEach(item => {
      if (item.getBoundingClientRect().top >= window.innerHeight) {
        item.classList.add('reveal-pending');
        reveal.observe(item);
      }
    });
    // Keyboard navigation must never land in an invisible section.
    document.addEventListener('focusin', event => {
      for (let item = event.target; item instanceof Element; item = item.parentElement) {
        if (item.matches('.reveal-pending, .reveal')) showSection(item, false);
      }
    });
    const links = [...document.querySelectorAll('nav a')];
    const active = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        links.forEach(link => {
          if (link.hash === `#${entry.target.id}`) link.setAttribute('aria-current', 'location');
          else link.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-10% 0px -55% 0px' });
    document.querySelectorAll('#experience, #skills, #about').forEach(item => active.observe(item));
  }
})();
