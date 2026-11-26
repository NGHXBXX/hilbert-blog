/* 个人博客 · 交互脚本（无依赖） */
(() => {
  'use strict';

  const doc = document.documentElement;
  const THEME_KEY = 'yujian-theme';

  /* ---------- 主题切换 ---------- */
  const themeToggle = document.querySelector('.theme-toggle');
  const themeMeta = document.querySelector('meta[name="theme-color"]');

  const applyTheme = (theme) => {
    doc.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch (error) {
      /* 隐私模式下忽略 */
    }
    if (themeMeta) {
      themeMeta.setAttribute('content', theme === 'dark' ? '#05060d' : '#f7eedb');
    }
    if (themeToggle) {
      themeToggle.setAttribute('aria-pressed', String(theme === 'dark'));
    }
  };

  applyTheme(doc.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      applyTheme(doc.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
    });
  }

  /* ---------- 移动端菜单 ---------- */
  const menuToggle = document.querySelector('.menu-toggle');
  const nav = document.getElementById('site-nav');

  const closeNav = () => {
    doc.classList.remove('nav-open');
    if (menuToggle) {
      menuToggle.setAttribute('aria-expanded', 'false');
      menuToggle.setAttribute('aria-label', '打开菜单');
    }
  };

  if (menuToggle) {
    menuToggle.addEventListener('click', () => {
      const open = doc.classList.toggle('nav-open');
      menuToggle.setAttribute('aria-expanded', String(open));
      menuToggle.setAttribute('aria-label', open ? '关闭菜单' : '打开菜单');
    });

    if (nav) {
      nav.addEventListener('click', (event) => {
        if (event.target.closest('a')) closeNav();
      });
    }

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && doc.classList.contains('nav-open')) {
        closeNav();
        menuToggle.focus();
      }
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 860) closeNav();
    });

    document.addEventListener('click', (event) => {
      if (!doc.classList.contains('nav-open')) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest('.site-nav') || target.closest('.menu-toggle')) return;
      closeNav();
    });
  }

  /* ---------- 头部滚动态 ---------- */
  const header = document.querySelector('.site-header');
  const onScrollHeader = () => {
    if (header) header.classList.toggle('is-scrolled', window.scrollY > 8);
  };
  onScrollHeader();
  window.addEventListener('scroll', onScrollHeader, { passive: true });

  /* ---------- 入场动效 ---------- */
  const revealItems = Array.from(document.querySelectorAll('[data-reveal]'));
  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-in');
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.06 }
    );
    revealItems.forEach((item) => revealObserver.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add('is-in'));
  }

  /* ---------- 阅读进度条 ---------- */
  const progressBar = document.querySelector('[data-progress]');
  if (progressBar) {
    const updateProgress = () => {
      const scrollable = doc.scrollHeight - window.innerHeight;
      const ratio = scrollable > 0 ? Math.min(window.scrollY / scrollable, 1) : 0;
      progressBar.style.transform = `scaleX(${ratio})`;
    };
    updateProgress();
    window.addEventListener('scroll', updateProgress, { passive: true });
    window.addEventListener('resize', updateProgress);
  }

  /* ---------- 目录高亮 ---------- */
  const tocLinks = Array.from(document.querySelectorAll('.toc-list a'));
  if (tocLinks.length && 'IntersectionObserver' in window) {
    const targets = tocLinks
      .map((link) => {
        const id = decodeURIComponent(link.getAttribute('href').slice(1));
        return document.getElementById(id);
      })
      .filter(Boolean);

    const setActive = (id) => {
      tocLinks.forEach((link) => {
        const href = decodeURIComponent(link.getAttribute('href').slice(1));
        link.classList.toggle('is-active', href === id);
      });
    };

    if (targets.length) {
      const spy = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) setActive(entry.target.id);
          });
        },
        { rootMargin: '-18% 0px -68% 0px', threshold: 0 }
      );
      targets.forEach((target) => spy.observe(target));
    }
  }

  /* ---------- 文章搜索与标签筛选 ---------- */
  const searchInput = document.getElementById('post-search');
  const tagFilter = document.getElementById('tag-filter');
  const archive = document.getElementById('archive');

  if (searchInput && archive) {
    const items = Array.from(archive.querySelectorAll('.archive-item'));
    const groups = Array.from(archive.querySelectorAll('.year-group'));
    const emptyState = document.getElementById('empty-state');
    const chips = tagFilter ? Array.from(tagFilter.querySelectorAll('[data-filter-tag]')) : [];
    let activeTag = '全部';

    const normalize = (value) => (value || '').trim().toLowerCase();

    const applyFilter = () => {
      const query = normalize(searchInput.value);
      let visible = 0;

      items.forEach((item) => {
        const text = item.dataset.search || '';
        const tags = (item.dataset.tags || '').split(' ').filter(Boolean);
        const matchesQuery = !query || text.includes(query);
        const matchesTag = activeTag === '全部' || tags.includes(activeTag);
        const show = matchesQuery && matchesTag;
        item.hidden = !show;
        if (show) visible += 1;
      });

      groups.forEach((group) => {
        const hasVisible = group.querySelector('.archive-item:not([hidden])');
        group.hidden = !hasVisible;
      });

      if (emptyState) emptyState.hidden = visible !== 0;
    };

    searchInput.addEventListener('input', applyFilter);

    chips.forEach((chip) => {
      chip.addEventListener('click', () => {
        activeTag = chip.dataset.filterTag || '全部';
        chips.forEach((item) => item.classList.toggle('is-active', item === chip));
        applyFilter();
      });
    });

    /* 从文章页的标签链接带参数进来时，自动选中对应标签 */
    const tagFromQuery = new URLSearchParams(window.location.search).get('tag');
    if (tagFromQuery) {
      const chip = chips.find((item) => item.dataset.filterTag === tagFromQuery);
      if (chip) {
        chip.click();
        chip.scrollIntoView({ block: 'nearest' });
      }
    }

    /* 按 / 快速聚焦搜索框 */
    document.addEventListener('keydown', (event) => {
      if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target;
      const typing =
        target instanceof HTMLElement &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if (typing) return;
      event.preventDefault();
      searchInput.focus();
    });

    applyFilter();
  }


  /* ---------- 宇宙星空 ---------- */
  const starCanvas = document.querySelector('.starfield');

  if (starCanvas && starCanvas.getContext) {
    const ctx = starCanvas.getContext('2d');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const palette = {
      cool: '178, 204, 255',
      violet: '200, 176, 255',
      warm: '255, 219, 170',
    };

    let stars = [];
    let width = 0;
    let height = 0;
    let dpr = 1;
    let frame = 0;
    let shoot = null;
    let nextShoot = 0;

    const isCosmic = () => doc.getAttribute('data-theme') === 'dark';

    const buildStars = () => {
      const count = Math.min(520, Math.max(160, Math.round((width * height) / 3600)));
      stars = Array.from({ length: count }, () => {
        const roll = Math.random();
        return {
          x: Math.random() * width,
          y: Math.random() * height,
          r: Math.random() * 1.35 + 0.25,
          alpha: Math.random() * 0.6 + 0.3,
          phase: Math.random() * Math.PI * 2,
          speed: Math.random() * 0.7 + 0.25,
          drift: (Math.random() - 0.5) * 0.014,
          color: roll < 0.14 ? 'warm' : roll < 0.34 ? 'violet' : 'cool',
          big: Math.random() < 0.055,
        };
      });
    };

    const drawStar = (star, time) => {
      const twinkle = reduceMotion
        ? 0.85
        : 0.55 + 0.45 * Math.sin(time * 0.001 * star.speed + star.phase);
      const rgb = palette[star.color];

      ctx.beginPath();
      ctx.fillStyle = `rgba(${rgb}, ${star.alpha * twinkle})`;
      ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
      ctx.fill();

      if (star.big) {
        ctx.strokeStyle = `rgba(${rgb}, ${0.11 * twinkle})`;
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(star.x - 5, star.y);
        ctx.lineTo(star.x + 5, star.y);
        ctx.moveTo(star.x, star.y - 5);
        ctx.lineTo(star.x, star.y + 5);
        ctx.stroke();
      }
    };

    const drawStatic = () => {
      ctx.clearRect(0, 0, width, height);
      stars.forEach((star) => drawStar(star, 0));
    };

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      starCanvas.width = Math.round(width * dpr);
      starCanvas.height = Math.round(height * dpr);
      starCanvas.style.width = `${width}px`;
      starCanvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildStars();
      if (reduceMotion) drawStatic();
    };

    const render = (time) => {
      if (!isCosmic()) {
        frame = requestAnimationFrame(render);
        return;
      }

      ctx.clearRect(0, 0, width, height);
      stars.forEach((star) => {
        drawStar(star, time);
        if (!reduceMotion) {
          star.x += star.drift;
          if (star.x < -2) star.x = width + 2;
          if (star.x > width + 2) star.x = -2;
        }
      });

      // 偶尔划过的流星
      if (!reduceMotion) {
        if (!shoot && time > nextShoot) {
          shoot = {
            x: Math.random() * width * 0.7,
            y: Math.random() * height * 0.35,
            vx: 2.6 + Math.random() * 2.2,
            vy: 1.1 + Math.random() * 1.1,
            len: 90 + Math.random() * 80,
            life: 0,
            maxLife: 46 + Math.random() * 30,
          };
        }

        if (shoot) {
          const fade = Math.sin((shoot.life / shoot.maxLife) * Math.PI);
          const gradient = ctx.createLinearGradient(
            shoot.x,
            shoot.y,
            shoot.x - shoot.len,
            shoot.y - shoot.len * 0.46
          );
          gradient.addColorStop(0, `rgba(255, 248, 232, ${0.85 * fade})`);
          gradient.addColorStop(1, 'rgba(255, 248, 232, 0)');
          ctx.strokeStyle = gradient;
          ctx.lineWidth = 1.1;
          ctx.beginPath();
          ctx.moveTo(shoot.x, shoot.y);
          ctx.lineTo(shoot.x - shoot.len, shoot.y - shoot.len * 0.46);
          ctx.stroke();

          shoot.x += shoot.vx;
          shoot.y += shoot.vy;
          shoot.life += 1;
          if (shoot.life > shoot.maxLife) {
            shoot = null;
            nextShoot = time + 7000 + Math.random() * 9000;
          }
        }
      }

      frame = requestAnimationFrame(render);
    };

    resize();
    window.addEventListener('resize', resize);

    if (!reduceMotion) {
      frame = requestAnimationFrame(render);
    }

    document.addEventListener('visibilitychange', () => {
      if (document.hidden && frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      } else if (!document.hidden && !reduceMotion && !frame) {
        frame = requestAnimationFrame(render);
      }
    });
  }

  /* ---------- 页脚年份 ---------- */
  document.querySelectorAll('.js-year').forEach((node) => {
    node.textContent = String(new Date().getFullYear());
  });
})();
