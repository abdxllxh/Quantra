/**
 * Intelligence Designed To Evolve
 * Vanilla JavaScript interactions: count-up stats & mobile menu
 */

document.addEventListener('DOMContentLoaded', () => {
  initCountUpStats();
  initMobileMenu();
});

/**
 * 1. Count-Up Stats with easeOutCubic animation
 */
function initCountUpStats() {
  const statCards = document.querySelectorAll('.stat-card');
  if (!statCards.length) return;

  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

  const animateValue = (el, target, suffix, decimals, duration, delay) => {
    setTimeout(() => {
      let startTime = null;

      const step = (timestamp) => {
        if (!startTime) startTime = timestamp;
        const progress = Math.min((timestamp - startTime) / duration, 1);
        const easedProgress = easeOutCubic(progress);
        const currentVal = (easedProgress * target).toFixed(decimals);

        el.textContent = `${currentVal}${suffix}`;

        if (progress < 1) {
          window.requestAnimationFrame(step);
        } else {
          el.textContent = `${target.toFixed(decimals)}${suffix}`;
        }
      };

      window.requestAnimationFrame(step);
    }, delay);
  };

  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          statCards.forEach((card, index) => {
            const target = parseFloat(card.getAttribute('data-target') || '0');
            const suffix = card.getAttribute('data-suffix') || '';
            const decimals = parseInt(card.getAttribute('data-decimals') || '0', 10);
            const valueEl = card.querySelector('.stat-value');

            if (valueEl) {
              const duration = 1500 + index * 80;
              const startOffset = 480 + index * 90;
              animateValue(valueEl, target, suffix, decimals, duration, startOffset);
            }
          });
          obs.disconnect();
        }
      });
    },
    { threshold: 0.25 }
  );

  const statsFooter = document.querySelector('.stats-footer');
  if (statsFooter) {
    observer.observe(statsFooter);
  }
}

/**
 * 2. Mobile Menu Controller
 */
function initMobileMenu() {
  const burgerBtn = document.querySelector('.burger-btn');
  const mobileMenu = document.querySelector('.mobile-menu');
  const mobileOverlay = document.querySelector('.mobile-overlay');
  const mobileLinks = document.querySelectorAll('.mobile-nav-link, .mobile-sign-in-btn');

  if (!burgerBtn || !mobileMenu || !mobileOverlay) return;

  let isOpen = false;

  const openMenu = () => {
    isOpen = true;
    burgerBtn.setAttribute('aria-expanded', 'true');
    mobileMenu.hidden = false;
    mobileOverlay.hidden = false;
    document.body.classList.add('menu-open');

    // Force reflow for animation
    void mobileMenu.offsetWidth;
    mobileMenu.classList.add('open');
    mobileOverlay.classList.add('open');
  };

  const closeMenu = () => {
    isOpen = false;
    burgerBtn.setAttribute('aria-expanded', 'false');
    mobileMenu.classList.remove('open');
    mobileOverlay.classList.remove('open');
    document.body.classList.remove('menu-open');

    setTimeout(() => {
      if (!isOpen) {
        mobileMenu.hidden = true;
        mobileOverlay.hidden = true;
      }
    }, 380);
  };

  burgerBtn.addEventListener('click', () => {
    if (isOpen) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  mobileOverlay.addEventListener('click', closeMenu);

  mobileLinks.forEach((link) => {
    link.addEventListener('click', closeMenu);
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen) {
      closeMenu();
    }
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 720 && isOpen) {
      closeMenu();
    }
  });
}
