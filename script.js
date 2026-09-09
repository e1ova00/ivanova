document.addEventListener('DOMContentLoaded', () => {
  initImageFallbacks();
  initFloatingBananas();
  initNavbar();
  initRevealOnScroll();
  initHeroBob();
  initQuotes();
  initGame();
  initCursor();
  initMagnetic();
  initTilt();
});

const HAS_FINE_POINTER = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

/* ------------------------------------------------------------------
   Показываем красивую заглушку вместо картинки, если файл не найден
   ------------------------------------------------------------------ */
function initImageFallbacks() {
  const images = document.querySelectorAll('img[data-fallback]');

  images.forEach((img) => {
    img.addEventListener('error', () => {
      const holder = img.closest('.photo, .hero__bob-btn');
      if (!holder) return;
      holder.classList.add('img-missing');
      holder.setAttribute('data-placeholder-label', img.dataset.fallback);
    }, { once: true });

    // Картинка ещё не существует / путь ещё не подставлен пользователем
    if (img.complete && img.naturalWidth === 0) {
      img.dispatchEvent(new Event('error'));
    }
  });
}

/* ------------------------------------------------------------------
   Летающие фоновые бананы (декоративные, еле заметные)
   ------------------------------------------------------------------ */
function initFloatingBananas() {
  const field = document.getElementById('bananaField');
  if (!field) return;

  const count = window.innerWidth < 640 ? 8 : 14;

  for (let i = 0; i < count; i++) {
    const span = document.createElement('span');
    span.textContent = '🍌';
    span.style.left = `${Math.random() * 100}%`;
    span.style.animationDuration = `${12 + Math.random() * 14}s`;
    span.style.animationDelay = `${Math.random() * 16}s`;
    span.style.fontSize = `${1 + Math.random() * 1.2}rem`;
    field.appendChild(span);
  }
}

/* ------------------------------------------------------------------
   Мобильное меню
   ------------------------------------------------------------------ */
function initNavbar() {
  const burger = document.getElementById('navBurger');
  const menu = document.getElementById('navMenu');
  if (!burger || !menu) return;

  burger.addEventListener('click', () => {
    menu.classList.toggle('is-open');
  });

  menu.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => menu.classList.remove('is-open'));
  });
}

/* ------------------------------------------------------------------
   Плавное появление секций при скролле
   ------------------------------------------------------------------ */
function initRevealOnScroll() {
  const targets = document.querySelectorAll(
    '.about__inner, .gallery__grid, .quote-box, .game__inner'
  );
  targets.forEach((el) => el.classList.add('reveal'));

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  targets.forEach((el) => observer.observe(el));
}

/* ------------------------------------------------------------------
   Клик по Бобу в шапке -> реплика в облачке
   ------------------------------------------------------------------ */
const BOB_PHRASES = [
  'Белло!',
  'Поупайе!',
  'Ба-на-на!',
  'Тимо тими!',
  'Ту-хе-хе!',
  'Тим, ту дир!',
  'Ла бу-ба!',
  'Ме ва фа бу-ту-лу!'
];

function initHeroBob() {
  const bob = document.getElementById('bobHero');
  const bubble = document.getElementById('speechBubble');
  if (!bob || !bubble) return;

  bob.addEventListener('click', () => {
    const phrase = BOB_PHRASES[Math.floor(Math.random() * BOB_PHRASES.length)];
    bubble.textContent = phrase;
    bubble.classList.add('is-visible');
    clearTimeout(bob._bubbleTimer);
    bob._bubbleTimer = setTimeout(() => {
      bubble.classList.remove('is-visible');
    }, 1800);
  });
}

/* ------------------------------------------------------------------
   Генератор фраз в разделе "Боб говорит"
   ------------------------------------------------------------------ */
const QUOTE_PHRASES = [
  '«Ba-na-na! Ba-na-na na-na!» — гимн любого миньона.',
  '«Bello! Me want banana!» — стандартное приветствие Боба.',
  '«Poopaye!» — так Боб прощается перед новым приключением.',
  '«Tim, tu dir?» — Боб спрашивает у своего мишки, всё ли в порядке.',
  '«Underwear!» — любимое слово всех миньонов, включая Боба.',
  '«Tank yu!» — вежливый Боб всегда благодарит.',
  '«Bee Do Bee Do Bee Do!» — тревожная сирена по-миньонски.',
  '«La bu-ba!» — Боб радуется новому банану.'
];

function initQuotes() {
  const btn = document.getElementById('quoteBtn');
  const text = document.getElementById('quoteText');
  if (!btn || !text) return;

  let lastIndex = -1;

  btn.addEventListener('click', () => {
    let index = Math.floor(Math.random() * QUOTE_PHRASES.length);
    if (index === lastIndex) {
      index = (index + 1) % QUOTE_PHRASES.length;
    }
    lastIndex = index;

    text.textContent = QUOTE_PHRASES[index];
    text.classList.remove('is-bouncing');
    // форсируем reflow, чтобы анимация перезапустилась
    void text.offsetWidth;
    text.classList.add('is-bouncing');
  });
}

/* ------------------------------------------------------------------
   Мини-игра "Собери бананы"
   ------------------------------------------------------------------ */
function initGame() {
  const startBtn = document.getElementById('gameStart');
  const banana = document.getElementById('gameBanana');
  const arena = document.getElementById('gameArena');
  const scoreEl = document.getElementById('gameScore');
  const timeEl = document.getElementById('gameTime');
  const bestEl = document.getElementById('gameBest');

  if (!startBtn || !banana || !arena || !scoreEl || !timeEl || !bestEl) return;

  const GAME_DURATION = 10;
  let score = 0;
  let timeLeft = GAME_DURATION;
  let timerId = null;
  let running = false;

  const storedBest = safeGetBest();
  bestEl.textContent = storedBest;

  function safeGetBest() {
    try {
      return Number(localStorage.getItem('bobBananaBest')) || 0;
    } catch (e) {
      return 0;
    }
  }

  function safeSetBest(value) {
    try {
      localStorage.setItem('bobBananaBest', String(value));
    } catch (e) {
      /* localStorage недоступен — просто не сохраняем */
    }
  }

  function moveBanana() {
    const arenaRect = arena.getBoundingClientRect();
    const bananaSize = 60;
    const maxX = Math.max(arenaRect.width - bananaSize, 0);
    const maxY = Math.max(arenaRect.height - bananaSize, 0);
    const x = Math.random() * maxX + bananaSize / 2;
    const y = Math.random() * maxY + bananaSize / 2;
    banana.style.left = `${x}px`;
    banana.style.top = `${y}px`;
  }

  function endGame() {
    running = false;
    clearInterval(timerId);
    startBtn.textContent = 'Играть ещё раз';
    startBtn.disabled = false;

    if (score > storedBest) {
      safeSetBest(score);
      bestEl.textContent = score;
    }
  }

  function startGame() {
    if (running) return;
    running = true;
    score = 0;
    timeLeft = GAME_DURATION;
    scoreEl.textContent = score;
    timeEl.textContent = timeLeft;
    startBtn.textContent = 'Игра идёт...';
    startBtn.disabled = true;
    moveBanana();

    timerId = setInterval(() => {
      timeLeft -= 1;
      timeEl.textContent = timeLeft;
      if (timeLeft <= 0) {
        endGame();
      }
    }, 1000);
  }

  banana.addEventListener('click', () => {
    if (!running) return;
    score += 1;
    scoreEl.textContent = score;
    moveBanana();
  });

  startBtn.addEventListener('click', startGame);
  window.addEventListener('resize', () => {
    if (running) moveBanana();
  });
}

/* ------------------------------------------------------------------
   Кастомный курсор-точка, растёт над интерактивными элементами
   ------------------------------------------------------------------ */
function initCursor() {
  if (!HAS_FINE_POINTER) return;
  const dot = document.getElementById('cursorDot');
  if (!dot) return;

  dot.classList.add('is-active');

  window.addEventListener('pointermove', (e) => {
    dot.style.left = `${e.clientX}px`;
    dot.style.top = `${e.clientY}px`;
  });

  const hoverTargets = document.querySelectorAll('a, button, .photo, [data-magnetic]');
  hoverTargets.forEach((el) => {
    el.addEventListener('mouseenter', () => dot.classList.add('is-hovering'));
    el.addEventListener('mouseleave', () => dot.classList.remove('is-hovering'));
  });
}

/* ------------------------------------------------------------------
   "Магнитные" кнопки — слегка тянутся к курсору
   ------------------------------------------------------------------ */
function initMagnetic() {
  if (!HAS_FINE_POINTER) return;
  const items = document.querySelectorAll('[data-magnetic], [data-magnetic-text]');

  items.forEach((el) => {
    el.addEventListener('mousemove', (e) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      const strength = el.hasAttribute('data-magnetic-text') ? 0.25 : 0.35;
      el.style.transform = `translate(${x * strength}px, ${y * strength}px)`;
    });

    el.addEventListener('mouseleave', () => {
      el.style.transform = 'translate(0, 0)';
    });
  });
}

/* ------------------------------------------------------------------
   Лёгкий 3D-наклон фотокарточек при наведении мыши
   ------------------------------------------------------------------ */
function initTilt() {
  if (!HAS_FINE_POINTER) return;
  const cards = document.querySelectorAll('.photo');

  cards.forEach((card) => {
    const baseRotation = card.classList.contains('photo--rot-l')
      ? -3
      : card.classList.contains('photo--rot-r')
        ? 2.5
        : 0;

    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width - 0.5;
      const py = (e.clientY - rect.top) / rect.height - 0.5;
      const tiltX = py * -10;
      const tiltY = px * 10;
      card.style.transform =
        `rotate(${baseRotation * 0.3}deg) perspective(600px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) translateZ(0)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = `rotate(${baseRotation}deg)`;
    });
  });
}
