# 间隙时光示例背景图来源

## 许可说明

- 来源平台：Pixabay
- 许可说明页：https://pixabay.com/service/license-summary/
- 当前用途：开发阶段示例背景素材
- 下载日期：2026-04-01

## 本地素材清单

### `public/assets/backgrounds/mist-lake-dawn.webp`

- 来源页：https://pixabay.com/photos/misty-mountains-sunrise-lake-summer-7303991/
- 作者：JoshuaWoroniecki
- 用途建议：清晨、发呆、静默感

### `public/assets/backgrounds/forest-light-path.webp`

- 来源页：https://pixabay.com/photos/forest-fog-path-sunrays-green-7456238/
- 作者：jplenio
- 用途建议：透气、散步、明亮但不刺眼的白天

### `public/assets/backgrounds/mountain-dusk.webp`

- 来源页：https://pixabay.com/photos/mountains-lake-misty-sunrise-7500136/
- 作者：jplenio
- 用途建议：傍晚、散步、回收情绪

### `public/assets/backgrounds/tea-window-night.webp`

- 来源页：https://pixabay.com/photos/sunrays-trees-forest-fog-sunset-8283601/
- 作者：jplenio
- 用途建议：喝茶、停靠、带暖意的休息时刻

## 使用提醒

- 当前示例素材用于产品原型和后台演示
- 正式上线前，建议再做一次图片尺寸、压缩率、色调统一和许可复核

## 界面图标

- 来源：Tabler Icons（https://tabler.io/icons）与 Lucide（https://lucide.dev/icons/fish）
- 许可：MIT License
- 下载日期：2026-07-18
- 本地目录：`public/assets/icons`
- 用途：行为、计时、卡册和设置等界面图标；下载后仅调整了颜色和线宽，未用 CSS 或组件路径临摹

## 鱼类轮播资料与图片

- 物种资料主源：[FishBase](https://www.fishbase.se/search.php)，以学名索引核对栖息环境、习性和地理分布；前台中文为项目原创摘要，不复制来源正文。
- 图片源：[Wikimedia Commons](https://commons.wikimedia.org/wiki/Category:Fish) 与 [FishBase](https://www.fishbase.se/)，保存每张图片的来源页、作者与许可或来源条款。
- 本地目录：`public/assets/fishes`；200 张图片全部经过 macOS Vision 前景分割，统一为 960×640 透明 WebP，并采用相同主体尺度、留白、亮度与饱和度处理。
- 冻结清单：`src/lib/fish-species.json`；每条包含中英文名、学名、栖息类型、习性、分布、简介、资料源、图片源和许可。
- 重建命令：`npm run build:fishes`；仅重建指定条目可运行 `node scripts/build-fish-catalog.mjs --refresh=slug-a,slug-b`。
- 静态资源根目录统一为 `public/assets`，下分 `backgrounds`、`fishes`、`fonts` 与 `icons`；后续迁移 OSS 只需替换这一层资源前缀。
- 文件级迁移清单位于 `public/assets/manifest.json`，部署检查表见 `docs/oss-static-assets-migration.md`。

## 跨文化公版文案

- 手工核对库：中国哲学书电子化计划（https://ctext.org/）、维基文库（https://zh.wikisource.org/），80 条。
- 中国古典结构化源：[chinese-poetry](https://github.com/chinese-poetry/chinese-poetry)，MIT；使用《唐诗三百首》与《诗经》500 条。
- 西方与拉美逐行诗歌源：[Freeverse](https://github.com/Pro777/freeverse)，诗歌正文按项目逐篇元数据标记为 Public Domain；使用西方250 条、José Martí 50 条。
- 南亚与中东校订源：[Standard Ebooks](https://standardebooks.org/)，项目新增内容以 CC0 发布；使用泰戈尔《Gitanjali》100 条、纪伯伦《The Prophet》50 条。
- 拉美近现代补充源：[Rubén Darío《Poema del Otoño》](https://www.gutenberg.org/ebooks/51569)，经 GITenberg 镜像读取，50 条。
- 公版层规模：4 条问候 + 1,080 条结果/卡片；其中新增语料恰好 1,000 条、92 位作者、四种行为各 250 条。
- 地域分布：东亚 500、西方 250、南亚/中东 150、拉美 100；时代分布为古代 500、古典 80、近现代 420。
- 每条保存作者、作品、原文语言、地区、时代、公版状态、来源链接，以及五层场景/情感语义；冻结资产位于 `src/lib/gap-copy-corpus.json`。
- 用 `npm run build:quotes` 主动从来源重建并重做语义分析，用 `npm run check:quotes` 检查数量、重复、分布、长度、来源与标签完整性。
- 运行时每天只向前台下发 144 条平衡子集，完整语料仍保留在数据库与运营台；单次交互只出现一句。
- 中文内容生成采用双门槛：东亚语料必须来自核验过的古典来源且标记为古代；作者、作品、标题、正文和备注还会经过近现代中国政治人物与明显政治事件阻断检查。
- 当代或仍受保护作者不批量摘录正文。购买授权后必须记录授权范围、版本、原始出处和可展示字数，再作为独立版本导入。

## 当代论坛议题

- 观察日期：2026-07-18；当前版本有效至 2026-10-18。
- 议题入口：[V2EX 热门](https://www.v2ex.com/?tab=hot)、[Hacker News](https://news.ycombinator.com/)、[Reddit r/simpleliving 月度热门](https://www.reddit.com/r/simpleliving/top/?t=month) 与 [r/CasualConversation 月度热门](https://www.reddit.com/r/CasualConversation/top/?t=month)。
- 选取 30 个公开线程作为议题来源：V2EX、Hacker News、Reddit 各 10 个；每个线程衍生 2 条轻松与 2 条深度原创中文微评论，共 120 条。
- 不保存用户名，不复制帖子或评论正文，不把论坛排名当作事实可信度；源线程标题和 URL 只用于运营审计。
- 每条保存论坛、话题、语气、观察日期、过期日期、原创权利状态及五层场景/情感标签；冻结资产位于 `src/lib/gap-forum-copy.json`。
- 运行时每天按四种行为抽取 20 条结果和 12 张卡片；到期条目自动退出前台抽取池，其余文化来源自动补足。
- `npm run build:forums` 重建冻结文件，`npm run check:quotes` 检查 30 个线程、120 条正文、配额、去重、域名、长度、非低俗词、时效、语义和政治敏感过滤。

当前总规模为 4 条问候 + 1,200 条结果/卡片，即 1,204 条内容资产。
