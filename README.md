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

已部署在 Cloudflare Pages：<https://hilbert-blog.pages.dev>（项目名 `hilbert-blog`）。

日常更新：

```bash
./deploy.sh
```

首次使用前需要先 `npx wrangler login`。也可以直接把 [hilbert-blog-site.zip](hilbert-blog-site.zip) 拖到 Cloudflare Pages 控制台完成更新。详细步骤、费用与备案说明见 **[DEPLOY.md](DEPLOY.md)**。

### 用 Git 自动部署（可选）

当前 `hilbert-blog` 是 Cloudflare 的 **Direct Upload** 项目，Cloudflare 不允许 Direct Upload 项目直接切换成 Git 集成。想保留 `hilbert-blog.pages.dev` 这个地址，同时实现「push 到 GitHub 就自动上线」，用仓库里的 GitHub Actions 即可：

1. 新建一个 GitHub 仓库，把 `personal-blog/` 推上去（默认分支用 `main`）。
2. 在 Cloudflare 创建 API Token：
   - Dashboard → My Profile → API Tokens → Create Token
   - 用 **Cloudflare Pages: Edit** 模板，账户范围选你自己的账户
3. 在 GitHub 仓库 Settings → Secrets and variables → Actions 添加两个 Secret：
   - `CLOUDFLARE_API_TOKEN`：上一步的 Token
   - `CLOUDFLARE_ACCOUNT_ID`：Cloudflare 账户 ID（Workers & Pages 概览页右侧可以复制）
4. 工作流文件是 [`.github/workflows/deploy-cloudflare.yml`](.github/workflows/deploy-cloudflare.yml)。之后每次 `git push` 到 `main`，GitHub Actions 会自动 `bash build-site.sh` 并部署到现有的 `hilbert-blog` 项目，地址不变。

这个目录已经初始化成 git 仓库、提交了第一个 commit，并连上了 GitHub 仓库 `NGHXBXX/hilbert-blog`。如果你想换成别的仓库：

```bash
git remote set-url origin git@github.com:你的用户名/另一个仓库.git
git push -u origin main
```

Cloudflare 的两个 Secret 没配好之前，工作流会自动跳过部署并给出提示，不影响仓库本身。

只需要首次配置一次，以后写文章就是：

```bash
git add .
git commit -m "new post"
git push
```

如果你更想用 Cloudflare 控制台的 **原生 Git 集成**，需要新建一个 Pages 项目并连接 GitHub 仓库（当前项目不能直接转换）；新项目会有一个新的 `*.pages.dev` 地址，除非你给它绑定自定义域名。

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
├── .github/workflows/    # GitHub Actions 自动部署
└── README.md
```

## 一点说明

- 示例文章、示例人物、社交链接、时间线、NOW 内容都已清空，页面不会出现任何不属于你的内容。
- 所有动效都尊重 `prefers-reduced-motion`；没有 JS 时页面内容依然完整可见。
- 文章页的目录、进度条、搜索筛选都是渐进增强，添加文章后自动生效。
