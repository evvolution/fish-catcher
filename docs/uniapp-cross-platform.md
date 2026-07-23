# uni-app 跨端与统一 backend

## 结构

项目只保留一份业务逻辑和一套服务端：

- `apps/uniapp`：Vue 3 + uni-app 客户端，只使用 uni-app 基础组件与 `uni.*` API。
- `src/lib/moyu-engine.ts`：Nuxt 和 uni-app 共用的纯 TypeScript 内容、结果、掉落与本地记录逻辑。
- `server/api`：唯一 Nitro backend，继续使用 Prisma / MySQL，不为每个平台复制服务。
- `oss-upload/fish/assets`：所有客户端共用的 OSS 静态资源。

游客卡册、日志、地区和职业仍然本地优先，分别写入浏览器、小程序或 App 的本地存储。内容目录与账号服务走统一 backend。

## 本地开发

先启动 backend：

```bash
cp .env.example .env
FOREST_STATIC_PREVIEW=1 npm run backend:dev
```

另开终端启动 uni-app H5：

```bash
npm run uni:dev:h5
```

`apps/uniapp/.env.development` 默认访问 `http://localhost:3000`。生产 API 和 OSS 域名在 `apps/uniapp/.env.production` 配置；这些文件只能放公开地址，不能放密钥。

## 构建

### H5

```bash
npm run uni:build:h5
```

产物：`apps/uniapp/dist/build/h5`。

### 微信小程序

```bash
npm run uni:build:mp-weixin
```

产物：`apps/uniapp/dist/build/mp-weixin`。发布前需要：

1. 在 `apps/uniapp/src/manifest.json` 填入微信小程序 AppID。
2. 在微信公众平台把 backend 与 OSS HTTPS 域名加入 `request` / `downloadFile` 合法域名。
3. 用微信开发者工具导入产物并上传。

其他小程序平台使用同一页面代码；需要哪个平台，再安装对应的 `@dcloudio/uni-mp-*` 编译包并增加一条 `uni build -p` 脚本即可。当前没有预装未使用的平台编译器。

### Android APK / iOS

```bash
npm run uni:build:app
```

产物：`apps/uniapp/dist/build/app`。uni-app CLI 只生成 App 离线资源；APK/IPA 需要在 HBuilderX 中导入 `apps/uniapp` 后进行本地或云打包，并配置真实的 uni-app AppID、包名、签名、隐私权限和应用图标。代码不需要再写 Android 专版。

### macOS DMG

```bash
npm run uni:build:dmg
```

脚本先构建 H5，再用 macOS 自带的 Swift、WKWebView、`codesign` 和 `hdiutil` 生成：

```text
apps/uniapp/dist/macos/Moyu-0.1.0.dmg
```

本地构建使用临时签名。对外分发时仍需替换为 Apple Developer ID 签名并执行 notarization；这一步需要开发者账号凭据，项目不会把凭据写入脚本。

DMG 从本地文件加载 H5，因此生产 backend 的 `API_ALLOWED_ORIGINS` 需要包含 `null`；`.env.example` 已给出配置。

## 统一 API

客户端启动只需一个请求：

```text
GET /api/v1/bootstrap
```

响应包含 `apiVersion`、服务时间、OSS 基础地址与完整森林目录。当前客户端要求 `apiVersion: 1`，避免 backend 破坏性升级被静默接受。

健康检查：

```text
GET /api/v1/health
```

账号接口同时支持同源 H5 的 HttpOnly Cookie 和其他客户端的 Bearer Token：

```text
POST /api/auth/guest               { "platform": "mp-weixin" }
POST /api/auth/phone/send-code     { "phone": "..." }
POST /api/auth/phone/verify        { "phone": "...", "code": "...", "platform": "android" }
GET  /api/auth/session             Authorization: Bearer <token>
POST /api/auth/logout              Authorization: Bearer <token>
```

Token 只存哈希到数据库。客户端收到的原始 Token 应放在 `uni.setStorage` 对应的私有本地存储中，不应拼进 URL。

## 部署边界

- Nitro backend 仍按 `docs/server-deployment.md` 部署一次。
- H5 可以与 backend 同域，也可以独立部署；独立域名需要加入 `API_ALLOWED_ORIGINS`。
- 小程序和原生 App 不部署 backend 副本，只配置同一个 HTTPS API 地址。
- 内容和图片继续通过现有 OSS 域名分发，backend 不代理大图片。
