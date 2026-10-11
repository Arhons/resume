// Content stays readable without JavaScript. Motion is progressive enhancement.
(() => {
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const root = document.documentElement;
  const toggle = document.getElementById('motion-toggle');
  const canvas = document.getElementById('ambient-canvas');
  const ambient = document.querySelector('.ambient');
  const projects = document.getElementById('experience');
  const context = canvas.getContext('2d');
  let enabled = !preference.matches;
  let frame = 0;
  let lastTime = 0;
  let elapsed = 0;
  let width = 0;
  let height = 0;
  let projectsTop = 0;
  let printing = false;
  const pointer = { x: -1000, y: -1000 };
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const running = () => enabled && !preference.matches && !document.hidden && !printing;
  const neuralNodes = Array.from({ length: 72 }, (_, i) => {
    const y = 1 - (i / 71) * 2;
    const radius = Math.sqrt(1 - y * y);
    const angle = i * Math.PI * (3 - Math.sqrt(5));
    return [Math.cos(angle) * radius, y, Math.sin(angle) * radius];
  });
  const neuralEdges = [];
  neuralNodes.forEach((point, i) => {
    neuralNodes.map((other, j) => ({ j, distance: Math.hypot(...point.map((v, axis) => v - other[axis])) }))
      .filter(other => other.j !== i).sort((a, b) => a.distance - b.distance).slice(0, 3)
      .forEach(({ j }) => { if (j > i) neuralEdges.push([i, j]); });
  });

  // One small canvas, capped resolution and 30 fps. No images or network requests.
  const resize = () => {
    width = window.innerWidth;
    projectsTop = 0;
    for (let element = projects; element; element = element.offsetParent) projectsTop += element.offsetTop;
    height = Math.max(window.innerHeight, projectsTop + 180);
    ambient.style.height = `${height}px`;
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
    const heroStrength = 1;
    const radius = Math.min(width * (small ? .64 : .29), 390);
    const centerX = width * (small ? .16 : .20);
    const centerY = projectsTop - radius * .78;
    const turn = time * .055;
    const project = ([x, y, z]) => {
      const rx = x * Math.cos(turn) + z * Math.sin(turn);
      const rz = z * Math.cos(turn) - x * Math.sin(turn);
      const ry = y * .94 - rz * .34;
      const depth = rz * .94 + y * .34;
      const perspective = 2.8 / (2.8 - depth * .35);
      return { x: centerX + rx * radius * perspective, y: centerY + ry * radius * perspective, depth };
    };
    // A projected neural sphere: restrained behind the text, brighter at the edges.
    const halo = context.createRadialGradient(centerX, centerY, radius * .2, centerX, centerY, radius * 1.35);
    halo.addColorStop(0, 'rgba(50,171,153,0)');
    halo.addColorStop(.63, `rgba(50,171,153,${.07 * heroStrength})`);
    halo.addColorStop(.8, `rgba(133,180,67,${.10 * heroStrength})`);
    halo.addColorStop(1, 'rgba(50,171,153,0)');
    context.fillStyle = halo; context.fillRect(0, 0, width, height);
    for (let ring = 0; ring < 3; ring++) {
      context.beginPath();
      for (let step = 0; step <= 96; step++) {
        const angle = step / 96 * Math.PI * 2;
        const tilt = .55 + ring * .75;
        const point = project([Math.cos(angle) * 1.10, Math.sin(angle) * Math.cos(tilt) * 1.10, Math.sin(angle) * Math.sin(tilt) * 1.10]);
        if (!step) context.moveTo(point.x, point.y); else context.lineTo(point.x, point.y);
      }
      context.lineWidth = ring === 1 ? 1.1 : .7;
      context.strokeStyle = ring === 1 ? `rgba(43,135,117,${.23 * heroStrength})` : `rgba(139,158,69,${.15 * heroStrength})`;
      context.stroke();
    }
    const projected = neuralNodes.map(project);
    const visibility = point => {
      const textShield = small ? .6 : .35 + .65 * Math.min(1, Math.abs(point.x / width - .36) * 2.7);
      return textShield * heroStrength * (.45 + (point.depth + 1.3) * .23);
    };
    neuralEdges.forEach(([a, b], i) => {
      if (small && i % 2) return;
      const p = projected[a], q = projected[b];
      const strength = (visibility(p) + visibility(q)) / 2;
      context.beginPath(); context.moveTo(p.x, p.y); context.lineTo(q.x, q.y);
      context.lineWidth = .8; context.strokeStyle = `rgba(38,119,101,${.20 * strength})`; context.stroke();
      if (i % 17 === 0) {
        const progress = (time * .17 + i * .13) % 1;
        const x = p.x + (q.x - p.x) * progress, y = p.y + (q.y - p.y) * progress;
        context.beginPath(); context.arc(x, y, 2.2, 0, Math.PI * 2);
        context.fillStyle = `rgba(20,147,123,${.65 * strength})`; context.fill();
      }
    });
    projected.forEach((point, i) => {
      if (small && i % 2) return;
      const strength = visibility(point);
      const size = 1.5 + (point.depth + 1.2) * .65;
      if (i % 9 === 0) {
        const glow = context.createRadialGradient(point.x, point.y, 0, point.x, point.y, 15);
        glow.addColorStop(0, `rgba(31,162,135,${.20 * strength})`); glow.addColorStop(1, 'rgba(31,162,135,0)');
        context.fillStyle = glow; context.fillRect(point.x - 15, point.y - 15, 30, 30);
        context.beginPath(); context.arc(point.x, point.y, size + 4 + Math.sin(time * 1.2 + i) * 1.5, 0, Math.PI * 2);
        context.strokeStyle = `rgba(37,141,117,${.2 * strength})`; context.stroke();
      }
      context.beginPath(); context.arc(point.x, point.y, size, 0, Math.PI * 2);
      context.fillStyle = `rgba(36,121,99,${.5 * strength})`; context.fill();
    });
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
  document.fonts?.ready.then(resize);
  toggle.hidden = false;
  toggle.addEventListener('click', () => { enabled = !enabled; syncMotion(); });
  preference.addEventListener('change', () => { enabled = !preference.matches; syncMotion(); });
  document.addEventListener('visibilitychange', syncMotion);
  window.addEventListener('beforeprint', () => { printing = true; syncMotion(); });
  window.addEventListener('afterprint', () => { printing = false; syncMotion(); });
  window.addEventListener('resize', resize);
  window.addEventListener('pointermove', event => {
    if (running() && finePointer.matches) { pointer.x = event.pageX; pointer.y = event.pageY; }
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
