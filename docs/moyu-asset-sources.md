# 摸鱼背景图来源

## 许可说明

- Pixabay：原有 4 张，适用 [Pixabay Content License](https://pixabay.com/service/license-summary/)，下载日期为 2026-04-01。
- Pexels：新增 40 张，适用 [Pexels License](https://www.pexels.com/license/)，页面明确允许在网站或应用中使用并修改图片；筛选与下载日期为 2026-07-23。
- 哈苏大师赛学习评估集：109 张，来自公开报道中的 2026 决赛作品与获奖系列、2023 获奖系列；仅用于本地学习版视觉连续性评估，标记为 `Evaluation only — permission required for production`，不视为公开商用授权。
- 所有图片都保留来源页、摄影师和许可名称。即使 Pexels 不强制署名，项目仍主动保留作者信息。

## 原有 Pixabay 素材

### `oss-upload/fish/assets/backgrounds/mist-lake-dawn.webp`

- 来源页：https://pixabay.com/photos/misty-mountains-sunrise-lake-summer-7303991/
- 作者：JoshuaWoroniecki
- 用途建议：清晨、发呆、静默感

### `oss-upload/fish/assets/backgrounds/forest-light-path.webp`

- 来源页：https://pixabay.com/photos/forest-fog-path-sunrays-green-7456238/
- 作者：jplenio
- 用途建议：透气、散步、明亮但不刺眼的白天

### `oss-upload/fish/assets/backgrounds/mountain-dusk.webp`

- 来源页：https://pixabay.com/photos/mountains-lake-misty-sunrise-7500136/
- 作者：jplenio
- 用途建议：傍晚、散步、回收情绪

### `oss-upload/fish/assets/backgrounds/tea-window-night.webp`

- 来源页：https://pixabay.com/photos/sunrays-trees-forest-fog-sunset-8283601/
- 作者：jplenio
- 用途建议：喝茶、停靠、带暖意的休息时刻

## 新增 Pexels 素材

- 冻结清单：[src/lib/moyu-backgrounds.json](../src/lib/moyu-backgrounds.json)，共 40 条；每条包含来源页、原图地址、摄影师、中文标题、中文场景文案、行为和时段标签。
- 本地目录：`oss-upload/fish/assets/backgrounds`。连同原有 4 张和学习评估集，当前一共 153 张可轮换背景。
- 四组各 10 张：薄雾湖泊对应「发呆」，林间光束与极简结构对应「透气」，远山和长曝光海岸对应「散步」，秋林与静物式风景对应「喝茶」。
- 统一处理为 1280×853、质量 80 的 WebP，并降低少量饱和度与亮度，让前景文案更稳定。
- 在线重建：`npm run build:backgrounds`。
- 已有本地原图时可避免重复下载：`npm run build:backgrounds -- --source-dir=/absolute/path`；文件名格式为 `pexels-photo-{id}.jpg`。
- 完整性检查：`npm run check:backgrounds`，验证清单唯一性、来源域名、元数据以及每张输出图的格式和尺寸。

### 哈苏大师赛风格参考

- 参考的是 [Hasselblad Masters 2026](https://www.hasselblad.com/inspiration/masters/2026/) 的公开分类与视觉描述：低饱和、负空间、柔光、静水或长曝光，以及接近抽象的自然结构。官方页面也说明每位参赛者按类别提交三张风格统一的作品。
- [哈苏大师赛规则](https://www.hasselblad.com/inspiration/masters/2026/rules/)要求参赛者拥有作品权利并授予相应比赛使用许可；这不等于向公众开放复用。因此新增图只作为学习版评估集保存，并在元数据中明确要求取得许可后才能进入生产。
- 评估集冻结清单为 [src/lib/moyu-masters-evaluation.json](../src/lib/moyu-masters-evaluation.json)：2026 七类决赛各 10 张裁切图（70 张）、2026 七位获奖者系列（21 张）、2023 六位获奖者系列（18 张），合计 109 张。2026 决赛裁切图保留分类与序号；官方报道未公开全部决赛者姓名，因此不臆造作者。
- 构建脚本为 `scripts/build-masters-evaluation.mjs`，会从公开报道图集裁切/下载并统一为 1280×853 WebP；`npm run check:masters-eval` 会校验 109 张、来源域名、用途边界、活动均衡和输出尺寸。
- 评估集单独重建：`npm run build:masters-eval`；背景总检查 `npm run check:backgrounds` 会同时检查 Pexels 与评估集。
- 本地目录中原有的 8 张 `masters-` 前缀 Pexels 图仍是“哈苏风格参考”；新增 109 张使用 `masters-2026-finalist-*`、`masters-2026-winner-*` 和 `masters-2023-winner-*` 前缀，避免混淆。

### 背景动态

- Web 与 uni-app 的主背景、欢迎页背景统一使用 34 秒呼吸周期。
- 缩放范围为 1.035–1.055，不平移、不旋转，避免产生明显的镜头炫技感。
- 系统开启“减少动态效果”时停止循环，回到静态背景。

## 使用提醒

- WebP 是经过裁切和压缩的项目版本，不作为原图或图库素材重新分发；学习评估集尤其不能在取得作者/主办方许可前用于正式生产或公开作品集。
- 后续替换或新增图片时，必须同步更新冻结清单和作者信息，并重新运行背景与资产清单检查。
- 许可或来源页面若发生变更，上线前应按冻结清单逐条复核。

## 界面图标

- 来源：Tabler Icons（https://tabler.io/icons）与 Lucide（https://lucide.dev/icons/fish）
- 许可：MIT License
- 下载日期：2026-07-18
- 本地目录：`oss-upload/fish/assets/icons`
- 用途：行为、计时、卡册和设置等界面图标；下载后仅调整了颜色和线宽，未用 CSS 或组件路径临摹

## 鱼类轮播资料与图片

- 物种资料主源：[FishBase](https://www.fishbase.se/search.php)，以学名索引核对栖息环境、习性和地理分布；前台中文为项目原创摘要，不复制来源正文。
- 图片源：[Wikimedia Commons](https://commons.wikimedia.org/wiki/Category:Fish) 与 [FishBase](https://www.fishbase.se/)，保存每张图片的来源页、作者与许可或来源条款。
- 本地目录：`oss-upload/fish/assets/fishes`；200 张图片全部经过 macOS Vision 前景分割，统一为 960×640 透明 WebP，并采用相同主体尺度、留白、亮度与饱和度处理。
- 冻结清单：`src/lib/fish-species.json`；每条包含中英文名、学名、栖息类型、习性、分布、简介、资料源、图片源和许可。
- 重建命令：`npm run build:fishes`；仅重建指定条目可运行 `node scripts/build-fish-catalog.mjs --refresh=slug-a,slug-b`。
- OSS 上传根目录统一为 `oss-upload/fish/assets`，下分 `backgrounds`、`fishes`、`fonts` 与 `icons`。
- 文件级上传清单位于 `oss-upload/fish/assets/manifest.json`，部署检查表见 `docs/oss-static-assets-migration.md`。

## 跨文化公版文案

- 手工核对库：中国哲学书电子化计划（https://ctext.org/）、维基文库（https://zh.wikisource.org/），80 条。
- 中国古典结构化源：[chinese-poetry](https://github.com/chinese-poetry/chinese-poetry)，MIT；使用《唐诗三百首》与《诗经》500 条。
- 西方与拉美逐行诗歌源：[Freeverse](https://github.com/Pro777/freeverse)，诗歌正文按项目逐篇元数据标记为 Public Domain；使用西方250 条、José Martí 50 条。
- 南亚与中东校订源：[Standard Ebooks](https://standardebooks.org/)，项目新增内容以 CC0 发布；使用泰戈尔《Gitanjali》100 条、纪伯伦《The Prophet》50 条。
- 拉美近现代补充源：[Rubén Darío《Poema del Otoño》](https://www.gutenberg.org/ebooks/51569)，经 GITenberg 镜像读取，50 条。
- 公版层规模：4 条问候 + 1,080 条结果/卡片；其中新增语料恰好 1,000 条、92 位作者、四种行为各 250 条。
- 地域分布：东亚 500、西方 250、南亚/中东 150、拉美 100；时代分布为古代 500、古典 80、近现代 420。
- 每条保存作者、作品、原文语言、地区、时代、公版状态、来源链接，以及五层场景/情感语义；冻结资产位于 `src/lib/moyu-copy-corpus.json`。
- 用 `npm run build:quotes` 主动从来源重建并重做语义分析，用 `npm run check:quotes` 检查数量、重复、分布、长度、来源与标签完整性。
- 运行时每天只向前台下发 144 条平衡子集，完整语料仍保留在数据库与运营台；单次交互只出现一句。
- 中文内容生成采用双门槛：东亚语料必须来自核验过的古典来源且标记为古代；作者、作品、标题、正文和备注还会经过近现代中国政治人物与明显政治事件阻断检查。
- 当代或仍受保护作者不批量摘录正文。购买授权后必须记录授权范围、版本、原始出处和可展示字数，再作为独立版本导入。

## 当代论坛议题

- 观察日期：2026-07-18；当前版本有效至 2026-10-18。
- 议题入口：[V2EX 热门](https://www.v2ex.com/?tab=hot)、[Hacker News](https://news.ycombinator.com/)、[Reddit r/simpleliving 月度热门](https://www.reddit.com/r/simpleliving/top/?t=month) 与 [r/CasualConversation 月度热门](https://www.reddit.com/r/CasualConversation/top/?t=month)。
- 选取 30 个公开线程作为议题来源：V2EX、Hacker News、Reddit 各 10 个；每个线程衍生 2 条轻松与 2 条深度原创中文微评论，共 120 条。
- 不保存用户名，不复制帖子或评论正文，不把论坛排名当作事实可信度；源线程标题和 URL 只用于运营审计。
- 每条保存论坛、话题、语气、观察日期、过期日期、原创权利状态及五层场景/情感标签；冻结资产位于 `src/lib/moyu-forum-copy.json`。
- 运行时每天按四种行为抽取 20 条结果和 12 张卡片；到期条目自动退出前台抽取池，其余文化来源自动补足。
- `npm run build:forums` 重建冻结文件，`npm run check:quotes` 检查 30 个线程、120 条正文、配额、去重、域名、长度、非低俗词、时效、语义和政治敏感过滤。

当前总规模为 4 条问候 + 1,200 条结果/卡片，即 1,204 条内容资产。
