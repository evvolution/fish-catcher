# OSS 静态资源迁移清单

## 当前资产边界

项目所有可迁移静态资源只在 `public/assets` 下：

- `backgrounds/`：首页与活动背景，WebP。
- `data/`：全国省 / 市 / 区县三级区划、GDP 前 50 城市的 100 条地方食物估价，JSON。
- `fishes/`：200 张 960×640 透明 WebP；文件名与鱼类 `slug` 一致。
- `fonts/`：中文字体，TTF/OTF。
- `icons/`：界面 SVG 图标。
- `manifest.json`：逐文件相对路径、字节数、MIME 与 SHA-256；它本身不参与哈希，避免递归变化。

运行 `npm run build:assets` 重建清单，运行 `npm run check:assets` 检查资源是否有未登记变化。

## 推荐 OSS 路径

不要直接覆盖无版本路径。首次迁移建议上传到：

```text
oss://<bucket>/fish-catcher/assets/v1/
```

线上资源前缀对应：

```text
https://<cdn-domain>/fish-catcher/assets/v1
```

应用里的 `/assets/fishes/xxx.webp` 应映射为 `${ASSET_BASE_URL}/fishes/xxx.webp`。后续换图时发布 `v2`，确认回源与页面正常后再切换前缀，可以快速回滚。

## 上传前

- 运行 `npm run check:fishes && npm run check:regions && npm run build:assets && npm run check:assets`。
- 保存 `public/assets/manifest.json`，确认文件数量、字节数与 SHA-256。
- 确认 OSS Bucket 不允许目录列表和匿名写入；只开放静态文件读取。
- 若使用自有 CDN 域名，将它加入 Next.js 图片远程来源配置后再切换。

## 上传与响应头

阿里云 `ossutil` 示例：

```bash
ossutil cp -r public/assets/ oss://<bucket>/fish-catcher/assets/v1/ --update
```

按扩展名设置正确的 `Content-Type`：WebP 为 `image/webp`，SVG 为 `image/svg+xml`，JSON 为 `application/json`，TTF 为 `font/ttf`，OTF 为 `font/otf`。版本目录可统一设置：

```text
Cache-Control: public, max-age=31536000, immutable
```

字体与图片 CDN 响应应允许应用域名跨域读取；字体至少配置对应站点的 `Access-Control-Allow-Origin`，不要无条件开放写方法或请求头。

## 上传后核对

- 从 CDN 随机抽取背景、鱼图、字体、SVG 各 2 个，并核对 `data/regional-catalog.json`，与 `manifest.json` 的字节数和 SHA-256 对比。
- 检查鱼图响应保留透明通道且 `Content-Type` 为 `image/webp`。
- 检查首张鱼图与背景命中 CDN，后续只预取下一条鱼图，没有一次请求 200 张图片。
- 检查 Brotli/Gzip 仅用于 SVG、JSON 等文本资源；不要重复压缩 WebP、TTF/OTF。
- 验证 404 回源、跨域、HTTPS、移动网络下的超时与缓存命中率。
- 切换 `ASSET_BASE_URL` 后保留上一版本至少一个发布周期，再清理旧目录。

## 回滚

出现图片缺失、跨域或缓存错误时，只需把 `ASSET_BASE_URL` 切回上一个版本前缀；不要在原路径覆盖式回滚。清单中的 SHA-256 用于确认回滚后拿到的确实是旧版文件，而不是 CDN 残留缓存。
