// Content stays readable without JavaScript. Motion is progressive enhancement.
(() => {
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
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
    const reveal = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        if (!preference.matches) entry.target.classList.add('reveal');
        reveal.unobserve(entry.target);
      });
    }, { threshold: .08 });
    document.querySelectorAll('.timeline-item, .section:not(#experience), .contact').forEach(item => reveal.observe(item));
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
