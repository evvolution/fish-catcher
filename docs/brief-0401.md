# 摸鱼 Brief 0401

## 这轮我们在做什么

这轮的核心目标，是把你提出的「摸鱼 / 摸鱼」从一份有灵魂的 PRD，落成一个可以真实体验的游客优先 MVP。

我们有意先不纠结完整用户体系，而是优先走通下面这条主线：

进入森林 -> 选择行为 -> 计时 -> 结果页 -> 趣味换算 -> 掉卡 -> 卡册回看

同时，为了让内容运营能够先开始，我们也补了一个独立的运营后台页，用来查看维度、管理文案和背景素材，但后面又按你的要求把它从任何客户端入口里隐藏掉了。

## 本轮做成的事情

### 1. 产品方向上的共识

- 确认了当前阶段先走「游客身份闭环」。
- 不以注册登录为先，不把用户体系当成 MVP 阻塞项。
- 默认本地优先，先验证“被懂得”的体验是否成立。
- 运营能力先内建，方便快速迭代内容，但不体现在前台用户路径里。

### 2. 数据与内容底座

已经围绕这个产品补了一套 Prisma 数据模型，覆盖：

- 行为
- 文案条目
- 文案与维度的关联
- 维度组与维度选项
- 背景素材
- 背景素材与维度的关联
- 城市与小吃换算

相关文件：

- [schema.prisma](g:/2026/fish-catcher/prisma/schema.prisma)
- [migration.sql](g:/2026/fish-catcher/prisma/migrations/20260401151535_gap_moment_mvp/migration.sql)

同时补了内容匹配和游客本地存储逻辑：

- [moyu-content.ts](g:/2026/fish-catcher/src/lib/moyu-content.ts)
- [moyu-engine.ts](g:/2026/fish-catcher/src/lib/moyu-engine.ts)
- [moyu-types.ts](g:/2026/fish-catcher/src/lib/moyu-types.ts)

### 3. 样例数据与素材

我已经把一批示例内容和素材接进项目，方便你直接体验和继续补内容：

- 4 个核心行为
- 7 组维度
- 22 个维度选项
- 22 条测试文案
- 4 张背景图
- 4 个城市与 8 个小吃换算项

示例背景图来自免费可商用图库，已经下载到项目内：

- `oss-upload/fish/assets/backgrounds`
- `docs/moyu-asset-sources.md`

### 4. 游客 MVP 主流程

已经做出一套可体验的游客端：

- 欢迎页
- 森林首页
- 行为选择
- 计时页
- 结果页
- 掉落卡片
- 卡册
- 设置页

主要入口和文件：

- `/`
- `/forest`
- [page.tsx](g:/2026/fish-catcher/src/app/page.tsx)
- [welcome-client.tsx](g:/2026/fish-catcher/src/app/welcome-client.tsx)
- [forest/page.tsx](g:/2026/fish-catcher/src/app/forest/page.tsx)
- [forest-client.tsx](g:/2026/fish-catcher/src/app/forest/forest-client.tsx)

游客数据当前存储策略：

- 记录：浏览器 `localStorage`
- 卡册：浏览器 `localStorage`
- 城市/行业偏好：浏览器 `localStorage`
- 内容资产：MySQL + Prisma

### 5. 运营后台

已经做了一个独立的内容运营页，方便你查看和 CRUD 当前内容维度、文案和背景图元数据。

相关文件：

- [operator/page.tsx](g:/2026/fish-catcher/src/app/operator/page.tsx)
- [operator/actions.ts](g:/2026/fish-catcher/src/app/operator/actions.ts)

这个页面目前还保留，但已经按你的要求从客户端入口中移除，不会在欢迎页、森林页、设置页里出现。

### 6. 前台收口与文案瘦身

后续你提出「不要把运营后台体现在任何客户端里面，去掉多余的说明文案」，我已经做了这轮收口：

- 去掉前台所有 `/operator` 入口
- 去掉“游客模式”“运营内容台”等说明性露出
- 缩短欢迎页文案
- 缩短首次进入与空状态文案
- 调整页面 metadata，去掉“原型”式表述

相关文件：

- [welcome-client.tsx](g:/2026/fish-catcher/src/app/welcome-client.tsx)
- [forest-client.tsx](g:/2026/fish-catcher/src/app/forest/forest-client.tsx)
- [layout.tsx](g:/2026/fish-catcher/src/app/layout.tsx)
- [page.module.css](g:/2026/fish-catcher/src/app/page.module.css)
- [forest.module.css](g:/2026/fish-catcher/src/app/forest/forest.module.css)

### 7. 视觉与交互优化

你后面又提出两个明确方向：

- 背景图不要随着内容拉伸而拉伸
- 毛玻璃效果参考 iOS，但不要过毛

这一轮我已经做完：

- 把森林页背景改成固定视口背景层，不再跟随内容高度变形
- 前景内容独立成单独层
- 卡片、底部按钮、弹层和欢迎页主卡片改为更轻的玻璃材质
- 控制 blur 和透明度，避免糊成一整片白雾

关键文件：

- [forest-client.tsx](g:/2026/fish-catcher/src/app/forest/forest-client.tsx)
- [forest.module.css](g:/2026/fish-catcher/src/app/forest/forest.module.css)
- [page.module.css](g:/2026/fish-catcher/src/app/page.module.css)

## 这轮顺手解决过的问题

### 1. 数据库配置

我已经把数据库配置写进：

- [.env.local](g:/2026/fish-catcher/.env.local)
- [.env](g:/2026/fish-catcher/.env)

生产数据库与应用部署在同一台服务器，使用本机连接目标 `127.0.0.1:3306/fish`，不在仓库中记录公网地址。

### 2. Nuxt / Vite 迁移状态

当前应用只保留 Nuxt、Vue 与 Vite 构建链。旧框架源码、配置、依赖和构建目录均已移除，类型检查通过独立的 `npm run typecheck` 执行。

### 3. Prisma Client 过期导致的运行时报错

你遇到过这类错误：

`Cannot read properties of undefined (reading 'count')`

这轮我已经做了两层保护：

- 在 `package.json` 加了 `predev`、`prebuild`、`postinstall` 自动执行 `prisma generate`
- 在 [moyu-content.ts](g:/2026/fish-catcher/src/lib/moyu-content.ts) 补了运行时守卫，旧 Client 时给出更明确的提示

相关文件：

- [package.json](g:/2026/fish-catcher/package.json)
- [moyu-content.ts](g:/2026/fish-catcher/src/lib/moyu-content.ts)

## 已写入项目的文档

除了这份 brief，项目里已经有这些文档：

- [moyu-prd.md](g:/2026/fish-catcher/docs/moyu-prd.md)
- [moyu-build-log.md](g:/2026/fish-catcher/docs/moyu-build-log.md)
- [moyu-asset-sources.md](g:/2026/fish-catcher/docs/moyu-asset-sources.md)

这份 [brief-0401.md](g:/2026/fish-catcher/docs/brief-0401.md) 更偏“本轮对话总结 + 当前状态快照 + 下次接力入口”。

## 当前项目状态

今天结束时，项目已经不是停留在概念层，而是一个可以真实体验的游客版雏形：

- 前台主流程已经可走通
- 内容引擎已有基础结构
- 示例内容已可运行
- 运营后台已存在但不在前台暴露
- 视觉开始形成自己的气质

目前还没有作为重点去做的部分：

- 完整用户体系
- 多端同步
- 正式上传型素材管理
- 更完整的文案审核流
- 节气/节日/天气联动
- 社区、电商、手表端、小组件

## 下次建议从这里继续

如果我们下一轮继续打磨，建议优先做这几个方向：

1. 继续把前台中文案、节奏和质感打磨细，尤其是欢迎页、结果页、空状态和掉卡体验。
2. 把运营页里的文案维度体系继续补厚，先把“行为 x 时段 x 情绪 x 行业”的内容宇宙做实。
3. 决定是否把“城市、小吃、行为、背景图”都完整纳入后台 CRUD。
4. 继续统一视觉语言，让森林页、结果页、卡片页的材质和层级更加一致。
5. 等游客体验满意后，再讨论“本地优先 + 可选同步”的账号升级路径，而不是反过来。

## 一句话结论

这轮我们已经把「摸鱼」从一个很动人的产品想法，推进成了一个有结构、有数据底座、有内容台、能实际体验的游客优先 MVP，并完成了前台收口与第一轮质感打磨。
