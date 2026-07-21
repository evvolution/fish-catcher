# 摸鱼 OSS 上传与访问控制

## 唯一上传目录

只上传 `oss-upload/fish/assets/`，目标为 Bucket `apexres` 的 `fish/assets/`：

```bash
ossutil cp -r oss-upload/fish/assets/ oss://apexres/fish/assets/ --update
```

不要上传 `.output/`、`.nuxt/`、源码或数据库文件。原始字体不进入仓库和部署产物。`fish.nefelibata.ink` 部署 Nuxt 应用，`apex-res.nefelibata.ink` 只提供静态资源。

当前目录包含 221 个待上传对象：

- 4 张背景图，全部 WebP。
- 200 张 960×640 透明鱼图，全部 WebP。
- 2 个按项目文案字集化的 WOFF2；原始 TTF/OTF 不上传。
- 13 个 SVG 界面图标。SVG 已是更小且无损缩放的矢量资源，不转 WebP。
- 1 个地区数据 JSON。
- 1 个 `manifest.json` 上传清单。

完整的逐文件清单位于 `oss-upload/fish/assets/manifest.json`。清单列出每个对象的本地相对路径、OSS Object Key、最终 URL、字节数、MIME 和 SHA-256，并把清单自身作为第 221 个对象计入。运行：

```bash
npm run build:assets
npm run check:assets
npm run check:deployment
```

## 最终路径

| 用途 | 值 |
| --- | --- |
| 应用域名 | `https://fish.nefelibata.ink` |
| 资源前缀 | `https://apex-res.nefelibata.ink/fish/assets` |
| OSS Bucket | `apexres` |
| OSS 前缀 | `fish/assets/` |
| 本地上传根目录 | `oss-upload/fish/assets/` |

例如 `/assets/fishes/ocellaris-clownfish.webp` 会由应用统一解析为 `https://apex-res.nefelibata.ink/fish/assets/fishes/ocellaris-clownfish.webp`。不要在业务组件里手写其他资源域名。

## 防盗链

Bucket 保持“公共读、禁止公共写”，然后在 OSS 控制台的“数据安全 → 防盗链”配置：

- 白名单 Referer：`https://fish.nefelibata.ink/`
- 黑名单：留空。
- 空 Referer：不允许。
- 截断 QueryString：允许。

等价命令：

```bash
ossutil referer --method put oss://apexres https://fish.nefelibata.ink/ --disable-empty-referer
```

末尾 `/` 是有意保留的，避免把相似域名当前缀误放行。不允许空 Referer 后，地址栏直接打开资源会返回 403，这是预期行为；从最终站点加载仍应成功。若需要 OSS 控制台预览，可临时加入 `*.console.aliyun.com`，检查结束后移除。

Referer 防盗链只能阻止普通浏览器外链，Referer 可以伪造，不能保护敏感文件。若以后需要真正的私有访问，应改成私有 Bucket，并使用带时效的签名 URL 或 CDN 私有回源鉴权；当前这些公开页面素材不应放敏感信息。

## CORS 与对象元数据

OSS CORS 只配置一条：

- Allowed Origin：`https://fish.nefelibata.ink`
- Allowed Methods：`GET`、`HEAD`
- Allowed Headers：`Range`
- Expose Headers：`ETag`、`Content-Length`、`Content-Range`
- Max Age：`86400`

不要使用 `*` Origin，不开放 `PUT`、`POST`、`DELETE`。这条规则主要保证跨域 WOFF2 字体正常应用；图片普通展示不需要前端读权限。

对象 `Content-Type` 以 `manifest.json` 为准：WebP 为 `image/webp`，SVG 为 `image/svg+xml`，JSON 为 `application/json`，WOFF2 为 `font/woff2`。图片、字体和 SVG 建议 `Cache-Control: public, max-age=86400`；未使用内容哈希文件名，暂不设置 `immutable`。`manifest.json` 建议 `Cache-Control: no-cache`。

确认自定义域名已经绑定有效 HTTPS 证书。中国内地 Bucket 使用自定义域名还需满足备案要求。

## 上传后验证

上传和控制台配置都完成后再执行，当前项目不会自动修改你的 OSS：

```bash
curl -I -e 'https://fish.nefelibata.ink/' \
  'https://apex-res.nefelibata.ink/fish/assets/icons/fish.svg'
curl -I -e 'https://example.com/' \
  'https://apex-res.nefelibata.ink/fish/assets/icons/fish.svg'
curl -I 'https://apex-res.nefelibata.ink/fish/assets/icons/fish.svg'
curl -I -H 'Origin: https://fish.nefelibata.ink' \
  'https://apex-res.nefelibata.ink/fish/assets/fonts/Alibaba-PuHuiTi-Medium.subset.woff2'
```

预期依次为：最终站点 Referer 返回 200、外站 Referer 返回 403、空 Referer 返回 403、字体响应包含 `Access-Control-Allow-Origin: https://fish.nefelibata.ink`。最后随机抽取背景、鱼图、字体、SVG 和 JSON，与 `manifest.json` 的字节数及 SHA-256 对比。
