# Hilbert · 个人网站

一个以宇宙星空为背景的极简个人网站。纯静态、零依赖，可以直接双击打开，也可以一键部署到任何静态托管服务。**默认黑夜模式**，点右上角图标切换白天。

线上地址：<https://hilbert-blog.pages.dev>

![黑夜模式](preview/home.jpg)

![白天模式](preview/day.jpg)

## 现在有什么

- **黑夜模式（默认）**：密集 Canvas 星场、星云、北斗七星、天球轨道、地平线，追求《地。关于地球的运动》那种宏大星空感
- **白天模式**：浅紫、粉蓝的日间渐变，不放任何插画装饰，保持干净
- **置顶金句**：Hero 区展示「既已知道宇宙之辽阔，怎能甘心偏安于一隅」
- **极简身份**：全站只保留名字 `Hilbert`，没有示例人物、简介、社交、时间线
- **空文章系统**：目前 0 篇文章，首页不显示文章区块；文章列表页显示「还没有文章」
- **关于页空白**：可直接在 `content/about.md` 里写自己的介绍
- **蒸汽波滤镜**：全站叠加粉紫、青蓝渐变、细密扫描线与轻微色散，像隔着一层老屏幕
- **主题切换**：默认深空黑夜，可切到浅紫粉蓝的白天，并记住选择
- **完整响应式**：桌面、平板、手机三档布局，移动端抽屉式导航
- **无外部请求**：字体使用系统自带，没有 CDN、统计、广告和 Cookie
- **自带 RSS、sitemap、robots、JSON-LD、Open Graph**

## 快速预览

```bash
cd personal-blog
python3 -m http.server 8000
# 浏览器打开 http://localhost:8000
```

或者直接双击 `index.html`（所有链接都是相对路径）。

## 添加第一篇文章

在 `content/posts/` 下新建 `hello.md`：

```markdown
---
title: 文章标题
date: 2026-12-01
tags: [随笔]
excerpt: 一句话摘要，显示在列表和搜索结果里。
---

## 正文标题

正文段落……
```

然后运行：

```bash
node build.mjs
```

新文章会自动出现在首页、文章列表、RSS 和 sitemap 里，按日期倒序排列。文章为空时，首页不显示文章区块，文章列表页显示空状态。

支持的 Markdown 语法：标题、段落、粗体 / 斜体、行内代码、代码块、链接、图片、有序 / 无序列表、引用、分割线。

## 改成你自己的

| 想改什么 | 改哪里 |
| --- | --- |
| 名字、站点标题、描述、正式 URL | `content/site.json` |
| 关于页正文 | `content/about.md`（当前为空） |
| 置顶金句 | `content/site.json` 的 `hero.quoteLines` 与 `hero.highlight` |
| 文章 | `content/posts/*.md` |
| 颜色、字体、间距 | `assets/style.css` 顶部的变量 |
| 导航、页脚、页面结构 | `build.mjs` 里的模板函数 |
| 站点图标 | `assets/favicon.svg` |

## 部署

已通过 **Cloudflare Pages 原生 Git 集成**部署：<https://hilbert-blog.pages.dev>

- GitHub 仓库：<https://github.com/NGHXBXX/hilbert-blog>
- 生产分支：`main`
- Build command：`bash build-site.sh`
- Build output directory：`_site`

现在不需要 API Token、GitHub Secrets 或手动上传。每次：

```bash
git add .
git commit -m "new post"
git push
```

Cloudflare Pages 会自动拉取仓库、运行构建并更新线上，地址保持不变。

本地仍然可以用 `./deploy.sh` 手动构建和直接上传作为兜底，但当前项目以 Git 集成为主；Cloudflare 的 Git 集成项目不能再切回 Direct Upload。

## 目录结构


```
personal-blog/
├── index.html            # 首页（生成）
├── blog.html             # 文章列表（生成）
├── about.html            # 关于（生成）
├── 404.html              # 404（生成）
├── posts/                # 文章详情（生成，目前为空）
├── feed.xml              # Atom 订阅（生成）
├── sitemap.xml           # 站点地图（生成）
├── robots.txt
├── content/
│   ├── site.json         # 站点配置：名字、描述、置顶句、URL
│   ├── about.md          # 关于页正文（空）
│   └── posts/            # 文章源文件（空）
├── assets/
│   ├── style.css         # 设计系统与星空主题
│   ├── main.js           # 星空、主题、导航、目录、进度条
│   └── favicon.svg
├── build.mjs             # 零依赖生成器
├── build-site.sh         # 只构建、整理出 _site/
├── deploy.sh             # 一键构建 + 部署到 Cloudflare Pages
└── README.md
```

## 一点说明

- 示例文章、示例人物、社交链接、时间线、NOW 内容都已清空，页面不会出现任何不属于你的内容。
- 所有动效都尊重 `prefers-reduced-motion`；没有 JS 时页面内容依然完整可见。
- 文章页的目录、进度条、搜索筛选都是渐进增强，添加文章后自动生效。
