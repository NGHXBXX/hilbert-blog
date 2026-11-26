# 部署指南：不租服务器，把站点放上线

> 当前线上地址：<https://hilbert-blog.pages.dev>（Cloudflare Pages，项目名 `hilbert-blog`）

你的站点是**纯静态**的（HTML + CSS + JS + 图片），所以完全不需要服务器。静态托管平台会直接把这些文件分发到 CDN 上，个人博客的流量用免费额度就足够了。

一句话选择：

- **想 0 成本、今天上线、不备案** → Cloudflare Pages
- **主要读者在国外 / 喜欢 Git 工作流** → GitHub Pages
- **主要读者在国内、且已有（或愿意办）备案域名** → 腾讯云 EdgeOne Pages
- **只想要自己的域名、不想备案** → 买域名 + Cloudflare Pages

## 方案对比

| 方案 | 费用 | 国内访问 | 需要备案 | 自定义域名 | 适合 |
| --- | --- | --- | --- | --- | --- |
| **Cloudflare Pages** | 免费 | 一般（走海外节点） | 不需要 | 支持 | 想立刻上线、读者分散 |
| **GitHub Pages** | 免费 | 不稳定，时快时慢 | 不需要 | 支持 | 用 Git 管理、海外读者 |
| **EdgeOne Pages** | 免费额度 | 好（中国大陆节点） | 自定义域名需要 | 支持 | 已有备案域名 |
| **国内 OSS / COS** | 几元/月 | 好 | 需要 | 支持 | 已备案、追求国内速度 |

> 「备案」是工信部 ICP 备案，本身免费，但面向中国大陆节点的网站必须办理，周期通常 1–20 个工作日。海外托管（Cloudflare / GitHub）不需要备案。

## 方案 A：Cloudflare Pages（推荐，0 成本）

官方文档：<https://developers.cloudflare.com/pages/>

**上传上线（最快，不需要 Git）**

1. 注册 / 登录 Cloudflare，进入 **Workers & Pages → Create → Pages → Upload assets**。
2. 项目名填 `yujian`（最终地址是 `yujian.pages.dev`，可改）。
3. 把 `personal-blog/_site` 目录拖进去（或者直接拖 `hilbert-blog-site.zip`）：
   `index.html`、`blog.html`、`about.html`、`404.html`、`posts/`、`assets/`、`feed.xml`、`sitemap.xml`、`robots.txt`、`.nojekyll`
4. 点 **Deploy site**，几十秒后拿到 `https://xxx.pages.dev`。

**Git 自动部署（推荐长期用）**

1. 把项目推到 GitHub 仓库。
2. Cloudflare Pages → Connect to Git → 选择仓库。
3. 构建设置：
   - Framework preset：`None`
   - Build command：`node build.mjs`
   - Build output directory：`/`（根目录）
4. 以后每次 `git push`，Cloudflare 会自动构建并发布。

**绑定自己的域名（不需要备案）**

Pages 项目 → Custom domains → 添加域名，按提示在域名解析商处加 CNAME 或把 NS 交给 Cloudflare，HTTPS 证书自动签发。

**免费额度**（个人博客绰绰有余）：每月 500 次构建、单站点 2 万个文件、单文件 25 MiB、100 个自定义域名。详见 [Cloudflare Pages Limits](https://developers.cloudflare.com/pages/platform/limits/)。

> 注意：Cloudflare 免费版在中国大陆走的是海外节点，能打开但速度取决于运营商和时段。纯文字博客通常够用；如果非常在意国内秒开，看方案 C。

## 方案 B：GitHub Pages（0 成本，Git 原生）

官方文档：<https://docs.github.com/zh/pages>

1. 新建一个 **public** 仓库，把 `personal-blog` 里的文件推上去。
2. 仓库 **Settings → Pages → Build and deployment → Source** 选 **GitHub Actions**。
3. 项目里已经带好了 [`.github/workflows/pages.yml`](.github/workflows/pages.yml)，推送到 `main` 后会自动构建并发布。
4. 地址是 `https://<用户名>.github.io/<仓库名>/`；如果仓库名是 `<用户名>.github.io`，地址就是 `https://<用户名>.github.io/`。

**免费额度**：站点 ≤ 1 GB、每月约 100 GB 流量（软限制）、每小时最多 10 次构建（用 Actions 不受此限）。详见 [GitHub Pages 限制](https://docs.github.com/zh/pages/getting-started-with-github-pages/github-pages-limits)。

**自定义域名**：Pages 设置里填域名，再到 DNS 加 CNAME；仓库根目录放一个 `CNAME` 文件也可以。不需要备案。

> GitHub Pages 的 `github.io` 域名在国内访问不太稳定，时快时慢，适合读者主要在海外的博客。

## 方案 C：腾讯云 EdgeOne Pages（国内访问最优）

官方文档：<https://edgeone.cloud.tencent.com/pages/document>

EdgeOne Pages 提供长期免费套餐：不限量的站点加速流量和请求额度，免费构建次数，支持 Git / 模板 / 直接上传，自定义域名自动配 HTTPS。

**但有一个关键限制要知道**：

- 如果加速区域选「中国大陆」或「全球（含中国大陆）」，平台分配的项目域名/部署域名**只提供 3 小时有效的预览链接**，不能长期对外分享。
- 想稳定访问，必须绑定**已完成 ICP 备案的自定义域名**。
- 如果选「全球（不含中国大陆）」，自定义域名免备案，但**中国大陆网络访问会返回 401**。

所以：**没有备案域名的话，EdgeOne Pages 不适合作为「直接分享」的方案**；它适合「我已经有备案域名 / 愿意去备案」的情况。这种情况下国内速度确实好。

备案本身免费，但需要域名、实名认证和接入商，通常 1–20 个工作日。

## 域名与备案

- 域名：`.com` / `.cn` / `.me` 之类，年费大约 30–100 元，不需要服务器。
- 海外托管（Cloudflare Pages / GitHub Pages）：域名直接解析过去，**不需要备案**。
- 国内托管（EdgeOne / OSS / COS）：域名**必须备案**才能绑定并访问。
- 只想先用免费二级域名：`xxx.pages.dev`、`xxx.github.io` 完全够用，以后再换域名也不迟（换域名后要改 `content/site.json` 里的 `url` 并重新构建）。

## 上线前的 5 项检查

1. 把 `content/site.json` 里的 `url` 改成你的真实地址（如 `https://yujian.pages.dev`），然后运行 `node build.mjs`。
2. 确认首页、文章、关于、404 都能打开，样式和字体正常。
3. 点一下明暗主题切换、移动端菜单（文章为空时列表页显示空状态，属正常）。
4. 打开 `/feed.xml` 和 `/sitemap.xml`，确认地址是新的域名。
5. 用手机 4G 网络打开一次，感受真实访问速度。

## 没有服务器，也能有这些功能

- **评论**：Giscus / Utterances（基于 GitHub Discussions，免费）
- **访问统计**：Cloudflare Web Analytics（免费、无 Cookie）、Umami Cloud
- **搜索**：本站已经是纯前端搜索；文章多了可以换 Pagefind
- **订阅**：RSS 已有；邮件订阅可用 Buttondown / Substack 等第三方
- **需要数据库 / 登录**：Cloudflare D1、Supabase、CloudBase 等 BaaS 免费额度，仍然不用自己维护服务器

## 成本总结

| 项目 | 费用 |
| --- | --- |
| 静态托管 | 0 元（免费额度） |
| 域名 | 可选，约 30–100 元/年 |
| 备案 | 0 元（仅国内托管需要） |
| 服务器 | 0 元，不需要 |

---

准备好了的话，告诉我你选哪个平台，我可以直接按平台给你更细的点击步骤。
