# Google Identity Services 接入指引

本文档对应当前项目里的 Google 登录实现，适用于 H5 Web 场景。

## 当前项目配置点

- 环境变量位置：[.env.example](/home/zx/文档/workspace/fish-catcher/.env.example)
- 回调地址拼接：[src/lib/auth-config.ts](/home/zx/文档/workspace/fish-catcher/src/lib/auth-config.ts#L39)
- 启动登录接口：[src/app/api/auth/google/start/route.ts](/home/zx/文档/workspace/fish-catcher/src/app/api/auth/google/start/route.ts)
- 回调处理接口：[src/app/api/auth/google/callback/route.ts](/home/zx/文档/workspace/fish-catcher/src/app/api/auth/google/callback/route.ts)

当前项目实际使用的回调地址为：

```text
${NEXT_PUBLIC_APP_URL}/api/auth/google/callback
```

例如正式域名为 `https://moyu.example.com` 时，回调地址就是：

```text
https://moyu.example.com/api/auth/google/callback
```

## 一、在 Google Cloud Console 创建项目

1. 打开 Google Cloud Console。
2. 新建一个项目，例如 `moyu-web`。
3. 进入 `Google Auth Platform`。

## 二、配置 OAuth Consent Screen

在 `Branding` 或 `OAuth consent screen` 中填写：

- `Application name`：`摸鱼`
- `User support email`：你的邮箱
- `Developer contact information`：你的邮箱
- `Homepage`：`https://你的域名/`
- `Privacy Policy`：`https://你的域名/privacy`
- `Authorized domains`：你的正式域名

建议：

- 如果还在测试，`Audience` 选择 `External`
- `Publishing status` 保持 `Testing`
- 把你自己的 Google 账号加入 `Test users`

## 三、创建 OAuth Client

1. 进入 `Clients`
2. 点击 `Create client`
3. `Application type` 选择 `Web application`
4. 名称可填写 `moyu-h5`

## 四、填写 Authorized JavaScript origins

如果你要使用 Google Identity Services 前端按钮或 One Tap，需要配置这一项。

开发环境建议填写：

```text
http://localhost
http://localhost:3000
```

正式环境填写：

```text
https://你的域名
```

注意：

- 这里只填源站，不带路径
- 不要填写 `/api/auth/google/callback`

## 五、填写 Authorized redirect URIs

这里必须填写完整回调地址。

开发环境：

```text
http://localhost:3000/api/auth/google/callback
```

正式环境：

```text
https://你的域名/api/auth/google/callback
```

注意：

- 这一项必须和项目里的 `NEXT_PUBLIC_APP_URL` 完全对应
- 如果域名、协议、端口、路径有任何不一致，就会出现 `redirect_uri_mismatch`

## 六、把配置写回项目

在项目根目录 `.env` 中填写：

```bash
NEXT_PUBLIC_APP_URL="https://你的域名"
GOOGLE_CLIENT_ID="你的 Google Client ID"
GOOGLE_CLIENT_SECRET="你的 Google Client Secret"
```

模板位置见：

- [.env.example](/home/zx/文档/workspace/fish-catcher/.env.example#L8)
- [.env.example](/home/zx/文档/workspace/fish-catcher/.env.example#L20)

## 七、当前项目登录流程

1. 前端调用 `POST /api/auth/google/start`
2. 服务端生成 `state` 并返回 Google 授权地址
3. 浏览器跳转到 Google 授权页
4. Google 回调到 `/api/auth/google/callback`
5. 服务端换取 access token
6. 服务端请求 Google userinfo
7. 服务端自动完成注册或登录
8. 创建本地会话并跳转到 `/home`

## 八、上线前注意事项

- 必须使用正式域名，生产环境不要用裸 IP
- 建议全站 HTTPS
- 如果仍处于 `Testing`，只有测试用户能登录
- App 壳子如果只是普通 WebView，不建议直接依赖 GIS 登录，应优先走系统浏览器或系统授权容器

## 九、常见问题

### 1. 报 `redirect_uri_mismatch`

检查这 3 处是否完全一致：

- Google Cloud Console 里的 `Authorized redirect URIs`
- `.env` 里的 `NEXT_PUBLIC_APP_URL`
- 项目实际访问域名

### 2. 页面能打开，但 Google 登录按钮不可用

检查：

- `Authorized JavaScript origins` 是否已配置
- 当前页面域名是否与 Cloud Console 中配置一致
- 是否在受支持的浏览器环境中测试

### 3. 只有自己能登录，别人不能

通常是因为 OAuth Consent Screen 仍处于 `Testing`，且对方账号不在 `Test users` 列表中。

## 参考链接

- Google Identity Services: https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid#load_the_client_library
- OpenID Connect: https://developers.google.com/identity/openid-connect/openid-connect
- OAuth 2.0 Web Server Applications: https://developers.google.com/identity/protocols/oauth2/web-server
- Production Readiness: https://developers.google.com/identity/protocols/oauth2/production-readiness/policy-compliance
