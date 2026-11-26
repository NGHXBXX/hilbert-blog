#!/usr/bin/env bash
# 构建静态站点，输出到 _site/（部署和设备预览共用）
set -euo pipefail
cd "$(dirname "$0")"

echo "→ 构建 HTML"
node build.mjs

echo "→ 整理 _site"
rm -rf _site
mkdir -p _site
cp -R index.html blog.html about.html 404.html posts assets feed.xml sitemap.xml robots.txt .nojekyll _site/

echo "✓ 已生成 _site/"
