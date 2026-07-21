# 微信公众号 H5 登录接入指引

本文档对应当前项目里的微信 H5 登录实现，使用的是“微信公众号网页授权”方案。

这套方案适用于：

- 用户在微信内打开你的 H5 页面

这套方案不适用于：

- 普通浏览器里的“微信扫码登录”

如果你后面要支持普通浏览器微信登录，需要额外接“微信开放平台网站应用登录”。

## 当前项目配置点

- 环境变量位置：[.env.example](/home/zx/文档/workspace/fish-catcher/.env.example#L23)
- 回调地址拼接：[src/lib/auth-config.ts](/home/zx/文档/workspace/fish-catcher/src/lib/auth-config.ts#L43)
- 启动登录接口：[src/app/api/auth/wechat/start/route.ts](/home/zx/文档/workspace/fish-catcher/src/app/api/auth/wechat/start/route.ts)
- 回调处理接口：[src/app/api/auth/wechat/callback/route.ts](/home/zx/文档/workspace/fish-catcher/src/app/api/auth/wechat/callback/route.ts)

当前项目实际使用的回调地址为：

```text
${NUXT_PUBLIC_APP_URL}/api/auth/wechat/callback
```

例如正式域名为 `https://moyu.example.com` 时，回调地址就是：

```text
https://moyu.example.com/api/auth/wechat/callback
```

## 一、先确认公众号条件

你至少需要确认下面几点：

- 你有一个微信公众号
- 已拿到 `AppID` 和 `AppSecret`
- 你的正式域名已经备案并可访问
- H5 页面会在微信内打开

如果你的使用场景主要是 Safari、Chrome、安卓浏览器，不建议只做这套方案。

## 二、在微信公众平台后台配置

1. 登录微信公众平台
2. 找到公众号的开发设置
3. 获取 `AppID` 和 `AppSecret`
4. 找到“网页授权回调域名”配置项
5. 填写你的正式域名

## 三、网页授权回调域名怎么填

这里最容易填错。

后台里应该填写：

```text
你的正式域名
```

例如：

```text
moyu.example.com
```

不要填写这些内容：

```text
https://moyu.example.com
https://moyu.example.com/api/auth/wechat/callback
moyu.example.com/api/auth/wechat/callback
```

也就是说：

- 填域名本身
- 不带 `http` 或 `https`
- 不带路径
- 不带回调接口地址

## 四、把配置写回项目

在项目根目录 `.env` 中填写：

```bash
NUXT_PUBLIC_APP_URL="https://你的域名"
WECHAT_APP_ID="你的公众号 AppID"
WECHAT_APP_SECRET="你的公众号 AppSecret"
WECHAT_OAUTH_SCOPE="snsapi_userinfo"
```

模板位置见：

- [.env.example](/home/zx/文档/workspace/fish-catcher/.env.example#L23)
- [README.md](/home/zx/文档/workspace/fish-catcher/README.md#L100)

## 五、`WECHAT_OAUTH_SCOPE` 怎么选

当前项目默认值是：

```bash
WECHAT_OAUTH_SCOPE="snsapi_userinfo"
```

建议先继续使用这个值。

原因：

- 当前项目在回调阶段会继续请求微信用户信息
- 这样可以直接拿到昵称和头像
- 更符合你现在欢迎页和登录后的用户展示需求

两个 scope 的区别：

- `snsapi_base`：静默授权，只拿 `openid`
- `snsapi_userinfo`：用户确认授权后，可拿 `openid`、昵称、头像等信息

## 六、当前项目登录流程

1. 前端调用 `POST /api/auth/wechat/start`
2. 服务端生成 `state`
3. 服务端返回微信网页授权地址
4. 浏览器跳转到微信授权页
5. 微信回调到 `/api/auth/wechat/callback`
6. 服务端使用 `code` 换取 `access_token`、`openid`
7. 服务端继续拉取微信用户信息
8. 服务端自动完成注册或登录
9. 创建本地会话并跳转到 `/home`

## 七、上线前注意事项

- 必须使用正式域名
- 建议使用 HTTPS
- 一定要在微信客户端里真机测试
- 如果你后面要接 JS-SDK，还需要额外配置“JS 接口安全域名”

## 八、常见问题

### 1. 点击微信登录后报回调域名错误

检查微信公众平台里的“网页授权回调域名”是否只填写了纯域名。

### 2. 普通浏览器里无法正常拉起微信登录

这是这套方案的预期限制。当前接的是“微信公众号网页授权”，主要面向微信内 H5。

### 3. 登录成功但没有头像昵称

检查：

- `WECHAT_OAUTH_SCOPE` 是否为 `snsapi_userinfo`
- 微信用户是否完成授权
- 回调阶段获取用户信息是否成功

## 参考链接

- 微信公众号网页授权官方文档：https://developers.weixin.qq.com/doc/offiaccount/OA_Web_Apps/Wechat_webpage_authorization.html
- 微信 OAuth 授权地址说明：https://open.weixin.qq.com/connect/oauth2/authorize
