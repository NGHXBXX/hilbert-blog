#!/usr/bin/env node
/**
 * 个人博客 · 静态站点生成器
 * 零依赖，运行方式：node build.mjs
 *
 * 输入：content/site.json + content/posts/*.md + content/about.md
 * 输出：index.html / blog.html / about.html / 404.html / posts/*.html / feed.xml / sitemap.xml
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = path.join(ROOT, 'content');
const POSTS_SRC_DIR = path.join(CONTENT_DIR, 'posts');
const POSTS_OUT_DIR = path.join(ROOT, 'posts');

const site = JSON.parse(fs.readFileSync(path.join(CONTENT_DIR, 'site.json'), 'utf8'));

const THEME_KEY = 'yujian-theme';

/* ------------------------------------------------------------------ */
/* 工具函数                                                            */
/* ------------------------------------------------------------------ */

const esc = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** 在中文标点后插入换行机会，让长标题优先在标点处折行 */
const titleHtml = (value = '') => esc(value).replace(/([，。、；：！？,;:!?])/g, '$1<wbr>');

const CJK_OR_PUNCT = /[\u3000-\u303f\u3400-\u9fff\uff00-\uffef]/;

/** 中文段落换行不需要空格，英文单词之间需要 */
function smartJoin(lines) {
  let out = '';
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (!out) {
      out = line;
      continue;
    }
    const prev = out.slice(-1);
    const next = line[0];
    const needSpace = /[A-Za-z0-9]/.test(prev) && /[A-Za-z0-9]/.test(next);
    out += (needSpace ? ' ' : '') + line;
  }
  return out;
}

function slugify(text) {
  const slug = text
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}-]/gu, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return slug || 'section';
}

/** 行内 Markdown：`code` **粗体** *斜体* [链接](url) ![图](src) */
function inline(text) {
  const codeSpans = [];
  let s = text.replace(/`([^`]+)`/g, (_, code) => {
    codeSpans.push(code);
    return `\u0000${codeSpans.length - 1}\u0000`;
  });

  s = esc(s);

  s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g, (_, alt, src, title) => {
    return `<img src="${src}" alt="${alt}"${title ? ` title="${title}"` : ''} loading="lazy">`;
  });

  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g, (_, label, href, title) => {
    const external = /^https?:\/\//.test(href);
    const attrs = external ? ' target="_blank" rel="noopener"' : '';
    return `<a href="${href}"${title ? ` title="${title}"` : ''}${attrs}>${label}</a>`;
  });

  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');

  s = s.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${esc(codeSpans[Number(i)])}</code>`);
  return s;
}

/** 极简 Markdown 渲染（支持标题、段落、列表、引用、代码块、分割线、图片链接） */
function renderMarkdown(markdown) {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const html = [];
  const headings = [];
  const usedIds = new Map();
  let i = 0;

  const isBlockStart = (line) =>
    /^#{1,4}\s+/.test(line) ||
    /^```/.test(line) ||
    /^\s*>\s?/.test(line) ||
    /^\s*[-*+]\s+/.test(line) ||
    /^\s*\d+\.\s+/.test(line) ||
    /^\s*(---+|\*\*\*+)\s*$/.test(line);

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i += 1;
      continue;
    }

    // 代码块
    if (/^```/.test(line)) {
      const lang = line.slice(3).trim();
      const buffer = [];
      i += 1;
      while (i < lines.length && !/^```/.test(lines[i])) buffer.push(lines[i++]);
      i += 1; // 跳过后引号
      html.push(
        `<pre class="code-block"><code${lang ? ` class="language-${esc(lang)}"` : ''}>${esc(
          buffer.join('\n')
        )}</code></pre>`
      );
      continue;
    }

    // 标题
    const heading = line.match(/^(#{1,4})\s+(.*)$/);
    if (heading) {
      const level = heading[1].length;
      const text = heading[2].trim();
      let id = slugify(text);
      if (usedIds.has(id)) {
        const count = usedIds.get(id) + 1;
        usedIds.set(id, count);
        id = `${id}-${count}`;
      } else {
        usedIds.set(id, 0);
      }
      headings.push({ level, text, id });
      html.push(`<h${level} id="${esc(id)}">${inline(text)}</h${level}>`);
      i += 1;
      continue;
    }

    // 分割线
    if (/^\s*(---+|\*\*\*+)\s*$/.test(line)) {
      html.push('<hr>');
      i += 1;
      continue;
    }

    // 引用
    if (/^\s*>\s?/.test(line)) {
      const buffer = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        buffer.push(lines[i].replace(/^\s*>\s?/, ''));
        i += 1;
      }
      html.push(`<blockquote><p>${inline(smartJoin(buffer))}</p></blockquote>`);
      continue;
    }

    // 无序列表
    if (/^\s*[-*+]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*+]\s+/, ''));
        i += 1;
      }
      html.push(`<ul>${items.map((item) => `<li>${inline(item)}</li>`).join('')}</ul>`);
      continue;
    }

    // 有序列表
    if (/^\s*\d+\.\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ''));
        i += 1;
      }
      html.push(`<ol>${items.map((item) => `<li>${inline(item)}</li>`).join('')}</ol>`);
      continue;
    }

    // 段落
    const buffer = [line];
    i += 1;
    while (i < lines.length && lines[i].trim() && !isBlockStart(lines[i])) {
      buffer.push(lines[i]);
      i += 1;
    }
    html.push(`<p>${inline(smartJoin(buffer))}</p>`);
  }

  return { html: html.join('\n'), headings };
}

/* ------------------------------------------------------------------ */
/* 文章                                                                */
/* ------------------------------------------------------------------ */

function readingStats(text) {
  const cjk = (text.match(/[\u3400-\u9fff]/g) || []).length;
  const words = (text.match(/[A-Za-z0-9]+/g) || []).length;
  return {
    cjk,
    words,
    minutes: Math.max(1, Math.ceil(cjk / 420 + words / 220)),
    total: cjk + words,
  };
}

function parsePost(fileName) {
  const raw = fs.readFileSync(path.join(POSTS_SRC_DIR, fileName), 'utf8');
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) throw new Error(`文章缺少 front matter：${fileName}`);

  const meta = {};
  for (const line of match[1].split('\n')) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (key === 'tags') {
      value = value
        .replace(/^\[|\]$/g, '')
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);
    } else if (key === 'featured') {
      value = value === 'true';
    }
    meta[key] = value;
  }

  const slug = path.basename(fileName, '.md');
  const body = match[2].trim();
  const { html, headings } = renderMarkdown(body);
  const stats = readingStats(body);
  const plain = body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#>*_`[\]()!-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const dateISO = meta.date;
  if (!dateISO) throw new Error(`文章缺少 date：${fileName}`);
  const date = new Date(`${dateISO}T12:00:00+08:00`);

  return {
    slug,
    title: meta.title,
    date,
    dateISO,
    dateLabel: `${date.getFullYear()} 年 ${date.getMonth() + 1} 月 ${date.getDate()} 日`,
    shortDate: `${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`,
    tags: meta.tags || [],
    featured: Boolean(meta.featured),
    excerpt: meta.excerpt || `${plain.slice(0, 100)}…`,
    html,
    headings,
    stats,
    plain,
    url: `posts/${slug}.html`,
    searchText: `${meta.title} ${meta.excerpt || ''} ${(meta.tags || []).join(' ')} ${plain}`.toLowerCase().slice(0, 4000),
  };
}

function loadPosts() {
  if (!fs.existsSync(POSTS_SRC_DIR)) return [];
  const files = fs.readdirSync(POSTS_SRC_DIR).filter((file) => file.endsWith('.md'));
  return files.map(parsePost).sort((a, b) => b.date - a.date);
}

/* ------------------------------------------------------------------ */
/* 页面骨架                                                            */
/* ------------------------------------------------------------------ */

const ICONS = {
  sun: `<svg class="icon icon-sun" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6"/></svg>`,
  moon: `<svg class="icon icon-moon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.5 14.8A8.5 8.5 0 1 1 9.2 3.5a6.8 6.8 0 0 0 11.3 11.3Z"/></svg>`,
};

const THEME_BOOT = `(function(){try{var k='${THEME_KEY}',t=localStorage.getItem(k);if(t!=='dark'&&t!=='light'){t='dark'}document.documentElement.setAttribute('data-theme',t);var m=document.querySelector('meta[name="theme-color"]');if(m&&t==='dark')m.setAttribute('content','#05060d')}catch(e){}})();`;

function brand(base) {
  return `<a class="brand" href="${base}index.html" aria-label="${esc(site.title)} · 首页">
        <span class="brand-star" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 1.5l2.7 7.8 7.8 2.7-7.8 2.7L12 22.5l-2.7-7.8-7.8-2.7 7.8-2.7z"/></svg>
        </span>
        <span class="brand-name">${esc(site.title)}</span>
      </a>`;
}

function header(base, active) {
  const link = (href, key, label) =>
    `<a class="nav-link${active === key ? ' is-active' : ''}" href="${base}${href}"${
      active === key ? ' aria-current="page"' : ''
    }>${label}</a>`;

  return `<header class="site-header">
    <div class="container header-inner">
      ${brand(base)}
      <nav class="site-nav" id="site-nav" aria-label="主导航">
        ${link('index.html', 'home', '首页')}
        ${link('blog.html', 'blog', '文章')}
        ${link('about.html', 'about', '关于')}
      </nav>
      <div class="header-actions">
        <button class="theme-toggle" type="button" aria-label="切换深色模式" aria-pressed="false" title="切换深色模式">
          ${ICONS.sun}
          ${ICONS.moon}
        </button>
        <button class="menu-toggle" type="button" aria-label="打开菜单" aria-expanded="false" aria-controls="site-nav">
          <span class="menu-bar"></span>
          <span class="menu-bar"></span>
        </button>
      </div>
    </div>
  </header>`;
}

function footer(base) {
  return `<footer class="site-footer">
    <div class="container footer-inner footer-inner--min">
      <div class="footer-brand">
        ${brand(base)}
      </div>
      <nav class="footer-col" aria-label="页脚导航">
        <h2 class="footer-title">导航</h2>
        <ul class="footer-links">
          <li><a href="${base}index.html">首页</a></li>
          <li><a href="${base}blog.html">文章</a></li>
          <li><a href="${base}about.html">关于</a></li>
        </ul>
      </nav>
    </div>
    <div class="container footer-bottom">
      <p>© <span class="js-year">2026</span> ${esc(site.owner)}</p>
    </div>
  </footer>`;
}

function layout({ title, description, pathname, content, active = '', bodyClass = '', head = '', progress = false }) {
  const base = pathname.startsWith('/posts/') ? '../' : '';
  const canonical = `${site.url.replace(/\/$/, '')}${pathname === '/' ? '/' : pathname}`;
  const fullTitle = pathname === '/' ? site.title : `${title} · ${site.title}`;

  return `<!doctype html>
<html lang="zh-CN" data-theme="dark">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(fullTitle)}</title>
  <meta name="description" content="${esc(description)}">
  <meta name="author" content="${esc(site.owner)}">
  <meta name="theme-color" content="#05060d">
  <meta name="color-scheme" content="dark light">
  <link rel="icon" href="${base}assets/favicon.svg" type="image/svg+xml">
  <link rel="canonical" href="${esc(canonical)}">
  <link rel="alternate" type="application/atom+xml" title="${esc(site.title)} · Atom" href="${base}feed.xml">
  <meta property="og:site_name" content="${esc(site.title)}">
  <meta property="og:title" content="${esc(fullTitle)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:type" content="${pathname.startsWith('/posts/') ? 'article' : 'website'}">
  <meta property="og:url" content="${esc(canonical)}">
  <script>${THEME_BOOT}</script>
  <script>document.documentElement.classList.add('js')</script>
  ${head}
  <link rel="stylesheet" href="${base}assets/style.css">
</head>
<body class="${bodyClass}">
  <div class="cosmos" aria-hidden="true">
    <div class="cosmos-nebula"></div>
    <div class="cosmos-milkyway"></div>
    <canvas class="starfield"></canvas>
    <svg class="cosmos-orbits" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
      <defs>
        <radialGradient id="nightOrb" cx=".5" cy=".5" r=".5">
          <stop offset="0" stop-color="#fff5d6" stop-opacity=".9"/>
          <stop offset=".32" stop-color="#f0c987" stop-opacity=".4"/>
          <stop offset="1" stop-color="#f0c987" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <circle cx="1090" cy="245" r="150" fill="url(#nightOrb)" opacity=".65"/>
      <circle cx="1090" cy="245" r="7" fill="#f7e0a8" opacity=".75"/>
      <g fill="none" stroke="currentColor" stroke-width="1">
        <ellipse cx="1040" cy="380" rx="520" ry="180" transform="rotate(-18 1040 380)" opacity=".22"/>
        <ellipse cx="1040" cy="380" rx="390" ry="130" transform="rotate(-18 1040 380)" opacity=".15"/>
        <ellipse cx="1040" cy="380" rx="660" ry="240" transform="rotate(-18 1040 380)" opacity=".1"/>
        <circle cx="1040" cy="380" r="92" opacity=".08"/>
      </g>
      <g fill="currentColor">
        <circle cx="610" cy="430" r="3.2" opacity=".8"/>
        <circle cx="1290" cy="285" r="2.4" opacity=".7"/>
        <circle cx="820" cy="530" r="2" opacity=".6"/>
        <circle cx="1150" cy="500" r="2.6" opacity=".7"/>
      </g>
    </svg>
    <div class="cosmos-vignette"></div>
  </div>
  <div class="daylight" aria-hidden="true"></div>
  <div class="vaporwave" aria-hidden="true"></div>
  <a class="skip-link" href="#main">跳到主要内容</a>
  ${progress ? '<div class="read-progress" data-progress aria-hidden="true"></div>' : ''}
  ${header(base, active)}
  <main id="main">
${content}
  </main>
  ${footer(base)}
  <script src="${base}assets/main.js" defer></script>
</body>
</html>`;
}

/* ------------------------------------------------------------------ */
/* 组件                                                                */
/* ------------------------------------------------------------------ */

function tagList(tags, { linkBase = null } = {}) {
  return `<span class="tag-list">${tags
    .map((tag) =>
      linkBase
        ? `<a class="tag" href="${linkBase}blog.html?tag=${encodeURIComponent(tag)}">#${esc(tag)}</a>`
        : `<span class="tag">#${esc(tag)}</span>`
    )
    .join('')}</span>`;
}

function postRow(post) {
  return `<a class="post-row" href="${post.url}" data-reveal>
      <time class="row-date" datetime="${post.dateISO}">${post.dateISO.replace(/-/g, '.')}</time>
      <span class="row-body">
        <span class="row-title">${titleHtml(post.title)}</span>
        <span class="row-excerpt">${esc(post.excerpt)}</span>
        ${tagList(post.tags)}
      </span>
      <span class="row-arrow" aria-hidden="true">→</span>
    </a>`;
}

function archiveItem(post) {
  return `<article class="archive-item" data-tags="${esc(post.tags.join(' '))}" data-search="${esc(
    post.searchText
  )}" data-reveal>
      <div class="archive-date">
        <time datetime="${post.dateISO}">${post.dateISO.replace(/-/g, '.')}</time>
        <span class="archive-time">约 ${post.stats.minutes} 分钟</span>
      </div>
      <div class="archive-body">
        <h3 class="archive-title"><a href="${post.url}">${titleHtml(post.title)}</a></h3>
        <p class="archive-excerpt">${esc(post.excerpt)}</p>
        ${tagList(post.tags)}
      </div>
      <span class="archive-arrow" aria-hidden="true">→</span>
    </article>`;
}

/* ------------------------------------------------------------------ */
/* 首页                                                                */
/* ------------------------------------------------------------------ */

function homePage(posts) {
  const quoteLines = site.hero.quoteLines.map((line) =>
    line.replace(site.hero.highlight, `<span class="mark">${esc(site.hero.highlight)}</span>`)
  );

  const articleSection =
    posts.length > 0
      ? `<section class="section" id="latest">
    <div class="container">
      <div class="section-head" data-reveal>
        <span class="section-num">01</span>
        <h2>文章</h2>
        <a class="section-more" href="blog.html">全部文章 <span aria-hidden="true">→</span></a>
      </div>
      <div class="home-grid home-grid--single">
        <div class="home-main">
          <div class="post-rows post-rows--standalone">
            ${posts.map(postRow).join('\n')}
          </div>
        </div>
      </div>
    </div>
  </section>`
      : '';

  const content = `<section class="hero">
    <div class="container hero-inner">
      <p class="eyebrow pin-label" data-reveal><span class="pin-star" aria-hidden="true">✦</span>${esc(
        site.hero.eyebrow
      )}</p>
      <h1 class="hero-title" data-reveal>${quoteLines.join('<br>\n      ')}</h1>
      <p class="hero-signature" data-reveal>${esc(site.owner)}</p>
    </div>
    <div class="hero-constellation" aria-hidden="true">
      <svg viewBox="0 0 440 330" fill="none">
        <g class="const-lines" stroke="currentColor" stroke-width="1.2" stroke-linecap="round">
          <path d="M36 208 L112 190 L188 166 L258 196 L278 268 L344 282 L372 212 L258 196"/>
        </g>
        <g class="const-stars" fill="currentColor">
          <circle class="star-big" cx="36" cy="208" r="3.4"/>
          <circle cx="112" cy="190" r="2.5"/>
          <circle cx="188" cy="166" r="2.7"/>
          <circle cx="258" cy="196" r="2.2"/>
          <circle cx="278" cy="268" r="2.6"/>
          <circle cx="344" cy="282" r="2.8"/>
          <circle class="star-big" cx="372" cy="212" r="3.8"/>
        </g>
        <g class="const-glow" fill="none" stroke="currentColor">
          <circle cx="372" cy="212" r="9" opacity=".25"/>
          <circle cx="344" cy="282" r="7" opacity=".18"/>
          <circle cx="36" cy="208" r="8" opacity=".2"/>
        </g>
      </svg>
    </div>
  </section>
${articleSection}`;

  return layout({
    title: site.title,
    description: site.description,
    pathname: '/',
    content,
    active: 'home',
    bodyClass: 'page-home',
  });
}

/* ------------------------------------------------------------------ */
/* 文章列表页                                                          */
/* ------------------------------------------------------------------ */

function blogPage(posts) {
  if (!posts.length) {
    const content = `<div class="container page">
      <header class="page-head">
        <p class="eyebrow" data-reveal>ARCHIVE</p>
        <h1 class="page-title" data-reveal>文章</h1>
      </header>
      <p class="empty-state" data-reveal>还没有文章。</p>
    </div>`;

    return layout({
      title: '文章',
      description: `${site.owner} 的文章。`,
      pathname: '/blog.html',
      content,
      active: 'blog',
      bodyClass: 'page-blog',
    });
  }

  const tags = [...new Set(posts.flatMap((post) => post.tags))];
  const years = [...new Set(posts.map((post) => post.dateISO.slice(0, 4)))];

  const groups = years
    .map((year) => {
      const items = posts.filter((post) => post.dateISO.startsWith(year));
      return `<section class="year-group" data-year="${year}">
        <div class="year-head" data-reveal>
          <h2 class="year-label">${year}</h2>
          <span class="year-count">${items.length} 篇</span>
        </div>
        <div class="archive-list">${items.map(archiveItem).join('\n')}</div>
      </section>`;
    })
    .join('\n');

  const chips = ['全部', ...tags]
    .map(
      (tag, index) =>
        `<button class="tag-chip${index === 0 ? ' is-active' : ''}" type="button" data-filter-tag="${esc(
          tag
        )}">${tag === '全部' ? '全部' : `#${esc(tag)}`}</button>`
    )
    .join('');

  const content = `<div class="container page">
    <header class="page-head">
      <p class="eyebrow" data-reveal>ARCHIVE · ${posts.length} POSTS</p>
      <h1 class="page-title" data-reveal>文章</h1>
    </header>

    <div class="blog-toolbar" data-reveal>
      <label class="search">
        <span class="sr-only">搜索文章</span>
        <svg class="search-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/></svg>
        <input id="post-search" type="search" placeholder="搜索标题、标签或关键词…" autocomplete="off">
        <kbd>/</kbd>
      </label>
      <div class="tag-filter" id="tag-filter" role="group" aria-label="按标签筛选">${chips}</div>
    </div>

    <div class="archive" id="archive">
      ${groups}
    </div>
    <p class="empty-state" id="empty-state" hidden>没有找到匹配的文章。换个关键词试试？</p>
  </div>`;

  return layout({
    title: '文章',
    description: `${site.owner} 的文章。`,
    pathname: '/blog.html',
    content,
    active: 'blog',
    bodyClass: 'page-blog',
  });
}

/* ------------------------------------------------------------------ */
/* 文章详情页                                                          */
/* ------------------------------------------------------------------ */

function postPage(post, posts) {
  const index = posts.findIndex((item) => item.slug === post.slug);
  const newer = index > 0 ? posts[index - 1] : null;
  const older = index >= 0 && index < posts.length - 1 ? posts[index + 1] : null;

  const tocHeadings = post.headings.filter((heading) => heading.level === 2 || heading.level === 3);
  const toc =
    tocHeadings.length > 1
      ? `<aside class="post-aside">
        <nav class="toc" aria-label="文章目录">
          <p class="toc-title">目录</p>
          <ol class="toc-list">
            ${tocHeadings
              .map(
                (heading) =>
                  `<li class="toc-item toc-h${heading.level}"><a href="#${esc(heading.id)}">${esc(
                    heading.text
                  )}</a></li>`
              )
              .join('\n')}
          </ol>
        </nav>
      </aside>`
      : '';

  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    datePublished: post.dateISO,
    dateModified: post.dateISO,
    author: { '@type': 'Person', name: site.owner },
    mainEntityOfPage: `${site.url.replace(/\/$/, '')}/${post.url}`,
    inLanguage: 'zh-CN',
    keywords: post.tags.join(', '),
  });

  const content = `<article class="post container">
    <header class="post-header">
      <a class="back-link" href="../blog.html"><span aria-hidden="true">←</span> 返回文章列表</a>
      ${tagList(post.tags, { linkBase: '../' })}
      <h1 class="post-title">${titleHtml(post.title)}</h1>
      <p class="post-excerpt">${esc(post.excerpt)}</p>
      <div class="post-meta">
        <time datetime="${post.dateISO}">${post.dateLabel}</time>
        <span class="meta-dot" aria-hidden="true"></span>
        <span>约 ${post.stats.minutes} 分钟</span>
        <span class="meta-dot" aria-hidden="true"></span>
        <span>${post.stats.total.toLocaleString('en-US')} 字</span>
      </div>
    </header>

    <div class="post-layout${toc ? '' : ' post-layout--single'}">
      <div class="post-body">
${post.html}
      </div>
      ${toc}
    </div>

    <footer class="post-footer">
      <div class="post-footer-tags">
        <span class="post-footer-label">标签</span>
        ${tagList(post.tags, { linkBase: '../' })}
      </div>
      <p class="post-footer-note">写于 ${post.dateLabel} · 如果你愿意，可以<a href="../feed.xml">订阅 RSS</a>${site.email ? `，或者<a href="mailto:${esc(site.email)}">写信给我</a>` : ''}。</p>
    </footer>

    <nav class="post-nav" aria-label="上下篇">
      ${
        older
          ? `<a class="post-nav-item" href="${older.slug}.html"><span class="post-nav-label">← 上一篇</span><strong>${titleHtml(older.title)}</strong></a>`
          : '<span class="post-nav-item is-empty"></span>'
      }
      ${
        newer
          ? `<a class="post-nav-item post-nav-next" href="${newer.slug}.html"><span class="post-nav-label">下一篇 →</span><strong>${titleHtml(newer.title)}</strong></a>`
          : '<span class="post-nav-item is-empty"></span>'
      }
    </nav>
  </article>`;

  return layout({
    title: post.title,
    description: post.excerpt,
    pathname: `/${post.url}`,
    content,
    active: 'blog',
    bodyClass: 'page-post',
    progress: true,
    head: `<meta property="article:published_time" content="${post.dateISO}">
  <meta property="article:tag" content="${esc(post.tags.join(','))}">
  <script type="application/ld+json">${jsonLd}</script>`,
  });
}

/* ------------------------------------------------------------------ */
/* 关于页                                                              */
/* ------------------------------------------------------------------ */

function aboutPage(posts) {
  const aboutPath = path.join(CONTENT_DIR, 'about.md');
  const about = fs.existsSync(aboutPath)
    ? renderMarkdown(fs.readFileSync(aboutPath, 'utf8'))
    : { html: '' };

  const content = `<div class="container page">
    <header class="page-head">
      <p class="eyebrow" data-reveal>ABOUT</p>
      <h1 class="page-title" data-reveal>${esc(site.owner)}</h1>
    </header>
    ${about.html.trim() ? `<div class="about-main post-body" data-reveal>
${about.html}
</div>` : ''}
  </div>`;

  return layout({
    title: '关于',
    description: `关于 ${site.owner}。`,
    pathname: '/about.html',
    content,
    active: 'about',
    bodyClass: 'page-about',
  });
}

/* ------------------------------------------------------------------ */
/* 404                                                                 */
/* ------------------------------------------------------------------ */

function notFoundPage() {
  const content = `<div class="notfound container">
    <p class="eyebrow" data-reveal>ERROR 404</p>
    <p class="notfound-code" aria-hidden="true">404</p>
    <h1 class="notfound-title" data-reveal>这一页走丢了。</h1>
    <p class="notfound-lede" data-reveal>你要找的内容可能被移动、删除，或者从未存在过。也可能只是一次手滑的输入。</p>
    <a class="btn btn-primary" href="index.html">回到首页 <span class="btn-arrow" aria-hidden="true">→</span></a>
  </div>`;

  return layout({
    title: '页面走丢了',
    description: '404 · 页面不存在',
    pathname: '/404.html',
    content,
    bodyClass: 'page-404',
  });
}

/* ------------------------------------------------------------------ */
/* Feed / Sitemap                                                      */
/* ------------------------------------------------------------------ */

function feed(posts) {
  const latest = posts[0];
  const entries = posts
    .map(
      (post) => `  <entry>
    <title>${esc(post.title)}</title>
    <link href="${site.url.replace(/\/$/, '')}/${post.url}"/>
    <id>${site.url.replace(/\/$/, '')}/${post.url}</id>
    <updated>${post.dateISO}T12:00:00+08:00</updated>
    <published>${post.dateISO}T12:00:00+08:00</published>
    <summary>${esc(post.excerpt)}</summary>
    <content type="html">${esc(post.html)}</content>
    ${post.tags.map((tag) => `<category term="${esc(tag)}"/>`).join('\n    ')}
  </entry>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="zh-CN">
  <title>${esc(site.title)}</title>
  <subtitle>${esc(site.description)}</subtitle>
  <link href="${site.url.replace(/\/$/, '')}/feed.xml" rel="self"/>
  <link href="${site.url.replace(/\/$/, '')}/"/>
  <updated>${latest ? `${latest.dateISO}T12:00:00+08:00` : new Date().toISOString()}</updated>
  <id>${site.url.replace(/\/$/, '')}/</id>
  <author>
    <name>${esc(site.owner)}</name>
  </author>
${entries}
</feed>
`;
}

function sitemap(posts) {
  const today = new Date().toISOString().slice(0, 10);
  const urls = [
    { loc: '/', lastmod: posts[0]?.dateISO || today },
    { loc: '/blog.html', lastmod: posts[0]?.dateISO || today },
    { loc: '/about.html', lastmod: today },
    ...posts.map((post) => ({ loc: `/${post.url}`, lastmod: post.dateISO })),
  ];

  return `<?xml version="1.0" encoding="utf-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (item) => `  <url>
    <loc>${site.url.replace(/\/$/, '')}${item.loc}</loc>${item.lastmod ? `
    <lastmod>${item.lastmod}</lastmod>` : ''}
  </url>`
  )
  .join('\n')}
</urlset>
`;
}

/* ------------------------------------------------------------------ */
/* 构建                                                                */
/* ------------------------------------------------------------------ */

function build() {
  const posts = loadPosts();

  fs.rmSync(POSTS_OUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(POSTS_OUT_DIR, { recursive: true });

  const pages = new Map([
    [path.join(ROOT, 'index.html'), homePage(posts)],
    [path.join(ROOT, 'blog.html'), blogPage(posts)],
    [path.join(ROOT, 'about.html'), aboutPage(posts)],
    [path.join(ROOT, '404.html'), notFoundPage()],
  ]);

  for (const post of posts) {
    pages.set(path.join(POSTS_OUT_DIR, `${post.slug}.html`), postPage(post, posts));
  }

  for (const [file, html] of pages) {
    fs.writeFileSync(file, html);
  }

  fs.writeFileSync(path.join(ROOT, 'feed.xml'), feed(posts));
  fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), sitemap(posts));
  fs.writeFileSync(
    path.join(ROOT, 'robots.txt'),
    `User-agent: *
Allow: /
Sitemap: ${site.url.replace(/\/$/, '')}/sitemap.xml
`
  );

  const list = [...pages.keys()].map((file) => path.relative(ROOT, file));
  console.log(`✓ 生成 ${pages.size} 个页面、${posts.length} 篇文章`);
  console.log(list.map((file) => `  - ${file}`).join('\n'));
  console.log('  - feed.xml\n  - sitemap.xml\n  - robots.txt');
}

build();
