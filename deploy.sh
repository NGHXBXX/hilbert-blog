#!/usr/bin/env bash
# 一键构建并部署到 Cloudflare Pages
# 首次使用前：npx wrangler login
set -euo pipefail
cd "$(dirname "$0")"

bash build-site.sh

echo "→ 打包 zip"
rm -f hilbert-blog-site.zip
(cd _site && zip -rq ../hilbert-blog-site.zip . -x '*.DS_Store')

echo "→ 部署到 Cloudflare Pages"
npx wrangler pages deploy _site --project-name hilbert-blog --branch main --commit-dirty=true

echo "✓ 完成：https://hilbert-blog.pages.dev"
