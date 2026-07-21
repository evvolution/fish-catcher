# 摸鱼

一个把碎片时间还给用户的移动端森林。它不做提醒、打卡、排名或效率评价，只提供一次进入、四种驻足方式、看鱼计时、名句结果与私人卡册。

## 当前能力

- Nuxt 4 / Vue 3 / Vite 8 / Nitro
- Prisma 7 / MySQL 内容与账号模型
- 游客本地优先的森林、计时、结果、卡册、日志背包和设置闭环
- 4 条时段问候、880 条行为结果、320 条掉落卡片（共 1,204 条内容资产）
- 1,200 条结果/卡片均具备场景、情感内核、心理需要、文字动作和能量标签
- 120 条论坛议题原创微评论：V2EX、Hacker News、Reddit 各 40 条，轻松与深度各 60 条，并带观察/过期日期
- 200 种鱼类百科轮播：中文名、学名、习性、分布、来源与统一透明底图片
- 全国省 / 市 / 区县三级联动、GDP 前 50 城市的 100 条地方食物与未收录城市通用换算
- 微信、Google、手机验证码和游客身份的服务端接口骨架
- 隐藏的内容运营页 `/operator`

设计原则与素材逻辑见 [`docs/design-system-2026.md`](docs/design-system-2026.md)，内容语义见 [`docs/content-semantics.md`](docs/content-semantics.md)，图片、图标与古典文案来源见 [`docs/moyu-asset-sources.md`](docs/moyu-asset-sources.md)。

生产服务器的 Git 拉取、构建、Prisma 迁移、PM2 与宝塔反代流程见 [`docs/server-deployment.md`](docs/server-deployment.md)。

## Start

```bash
npm install
cp .env.example .env
npm run dev
```

Then open `http://localhost:3000`.

没有数据库、只需做本地视觉验收时，可在开发环境设置：

```bash
FOREST_STATIC_PREVIEW="1"
```

该开关不会在生产环境生效。

## Database configuration

This project is now prepared to use a dedicated MySQL database called `fish`.

Recommended split:

- `prisma/schema.prisma`: chooses the database type (`mysql`)
- `prisma.config.ts`: tells Prisma CLI to read `DATABASE_URL`
- `.env`: stores the real connection details for local or server use
- `src/lib/prisma.ts`: creates the single Prisma client used by app code

Create the database on your MySQL server first:

```sql
CREATE DATABASE fish CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

If you want a dedicated account for this project, use something like:

```sql
CREATE USER 'fish_user'@'%' IDENTIFIED BY 'replace-with-password';
GRANT ALL PRIVILEGES ON fish.* TO 'fish_user'@'%';
FLUSH PRIVILEGES;
```

## Auth configuration

This project now includes a working H5-first auth skeleton:

- Guest login works immediately
- Phone verification login works with a real API flow
- Google OAuth and WeChat OAuth are wired as provider-ready flows
- First sign-in automatically creates the account when no identity exists

Configure the following in `.env`:

```bash
NUXT_PUBLIC_APP_URL="http://localhost:3000"
NUXT_PUBLIC_ASSET_BASE_URL="https://apex-res.nefelibata.ink/fish"
AUTH_SESSION_DAYS="30"
PHONE_CODE_TTL_MINUTES="5"
```

### Phone verification

Development default:

```bash
SMS_PROVIDER="mock"
```

This will generate the verification code and return it to the frontend for local testing.

If you want to connect a real SMS provider without changing app code, switch to webhook mode:

```bash
SMS_PROVIDER="webhook"
SMS_WEBHOOK_URL="https://your-service.example.com/send-sms"
SMS_WEBHOOK_TOKEN="optional-secret"
SMS_SIGN_NAME="your-sign"
SMS_TEMPLATE_CODE="your-template"
```

Your webhook will receive `phone`, `code`, `scene`, `signName`, and `templateCode`.

### Google login

```bash
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
NUXT_PUBLIC_APP_URL="https://fish.nefelibata.ink"
```

Google callback path is:

```text
/api/auth/google/callback
```

### WeChat H5 login

```bash
WECHAT_APP_ID=""
WECHAT_APP_SECRET=""
WECHAT_OAUTH_SCOPE="snsapi_userinfo"
NUXT_PUBLIC_APP_URL="https://fish.nefelibata.ink"
```

WeChat callback path is:

```text
/api/auth/wechat/callback
```

For WeChat, this is the place where you will later fill your official account `AppID` and `AppSecret`.

## Prisma

Prisma is already wired into the project with a first business schema for users, auth identities, sessions, and phone verification codes.

1. Extend `prisma/schema.prisma` with your domain models.
2. Run `npm run prisma:generate`.
3. Run `npm run prisma:migrate:dev`.

Useful commands:

```bash
npm run lint
npm run typecheck
npm run check:quotes
npm run check:fishes
npm run check:regions
npm run check:assets
npm run check:deployment
npm run build:quotes
npm run build:forums
npm run build:fishes
npm run build:regions
npm run build:assets
npm run prisma:generate
npm run prisma:studio
```

`check:quotes` 离线验证全部 1,200 条语料的数量、去重、地区/时代/语言平衡、论坛语气、来源、时效、低俗词与政治敏感过滤；`build:quotes` 会联网从公版来源重建冻结语料，`build:forums` 会从已核验的热点清单重建 120 条原创评论，通常只在内容版本升级或热点到期时运行。

## Project structure

- `app/pages`: Nuxt pages
- `app/components`: small view components grouped by feature
- `app/composables`: forest state, lifecycle and browser capabilities
- `server/api`: Nitro API handlers
- `prisma/schema.prisma`: database models
- `src/lib/prisma.ts`: shared Prisma client
- `src/lib/auth.ts`: auth/session/provider domain helpers
- `src/lib/auth-config.ts`: auth-related environment variable contract
- `app/pages/index.vue`: forest entry

所有需要上传 OSS 的静态资源统一位于 `oss-upload/fish/assets`，完整目录上传到 `oss://apexres/fish/assets/`，由 `https://apex-res.nefelibata.ink/fish/assets/` 提供；Nuxt 应用部署在 `https://fish.nefelibata.ink`。鱼类图片的抓取、来源记录、透明前景分割和 960×640 WebP 标准化由 `npm run build:fishes` 完成。项目只保留已经按应用文案字集化的 WOFF2，不保留原始字体。`npm run build:assets` 会生成带 SHA-256 的完整上传清单，防盗链、CORS 与验证步骤见 `docs/oss-static-assets-migration.md`。
