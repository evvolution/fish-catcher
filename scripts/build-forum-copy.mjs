import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import {
  MOYU_SEMANTIC_VERSION,
  scoreMoyuSemanticActivityFit,
} from "../src/lib/moyu-semantics.ts";
import { assertMoyuCopyPolicy } from "./moyu-content-policy.mjs";

const VERSION = `2026-07-18-v${MOYU_SEMANTIC_VERSION}`;
const OBSERVED_AT = "2026-07-18";
const EXPIRES_AT = "2026-10-18";
const OUTPUT_URL = new URL("../src/lib/moyu-forum-copy.json", import.meta.url);
const ACTIVITIES = ["drift", "tea", "breathe", "stroll"];

const threads = [
  {
    forum: "V2EX",
    threadTitle: "AI 让工作流更碎了",
    sourceUrl: "https://v2ex.com/t/1226513",
    topic: "ai_attention",
    topicLabel: "AI 与注意力",
    light: [
      "AI 本来答应替我省时间，后来省下的时间全拿去检查 AI 省了多少时间。",
      "工具越来越聪明，我的浏览器标签也越来越多，像一群积极但没有排班的实习生。",
    ],
    deep: [
      "真正稀缺的也许不是答案，而是一段不用在多个窗口之间反复重建的完整注意力。",
      "效率工具若把工作切成更细的响应，就可能让人更忙；节省步骤，不等于归还心流。",
    ],
  },
  {
    forum: "V2EX",
    threadTitle: "应用监听屏幕与隐私边界",
    sourceUrl: "https://www.v2ex.com/t/1228005",
    topic: "privacy_trust",
    topicLabel: "隐私与信任",
    light: [
      "有些应用比家里的猫还关心我在看什么，区别是猫至少会先踩一下键盘。",
      "权限弹窗写得越客气，我越想慢慢读完；毕竟礼貌不该成为全选按钮。",
    ],
    deep: [
      "隐私并不是藏着秘密，而是保留一个不必持续向系统解释自己的房间。",
      "信任的基础不是用户看不见收集，而是产品愿意清楚说明为何需要、保存多久、如何退出。",
    ],
  },
  {
    forum: "V2EX",
    threadTitle: "职业倦怠与暂时离开",
    sourceUrl: "https://www.v2ex.com/t/1228050",
    topic: "work_rest",
    topicLabel: "工作与休息",
    light: [
      "请假第一天最大的项目，是把闹钟从工作日搬到博物馆永久展区。",
      "离开工位后才发现，午后的风不需要周报，也不会追问完成百分比。",
    ],
    deep: [
      "倦怠不总是能力不足，有时只是长期把恢复时间借给了紧急事项，而债终于到期。",
      "暂时离开并非放弃职业，它也可能是重新确认：工作应当容纳生活，而不是吞掉生活。",
    ],
  },
  {
    forum: "V2EX",
    threadTitle: "一个西瓜为什么这么贵",
    sourceUrl: "https://www.v2ex.com/t/1228103",
    topic: "mindful_consumption",
    topicLabel: "日常消费",
    light: [
      "今年的西瓜切开之前先拍照，毕竟它已经从水果升级成了家庭轻奢。",
      "贵西瓜最大的仪式感，是每一勺都自动触发慢慢吃、别掉桌上的提醒。",
    ],
    deep: [
      "价格变化最先抵达的往往不是报表，而是普通人站在摊位前那几秒钟的犹豫。",
      "理性消费不是取消快乐，而是知道这份甜值得多少，并允许自己对不值得的部分说算了。",
    ],
  },
  {
    forum: "V2EX",
    threadTitle: "第一次清楚看见银河",
    sourceUrl: "https://www.v2ex.com/t/1228090",
    topic: "science_wonder",
    topicLabel: "宇宙与惊奇",
    light: [
      "银河的加载速度很慢，但胜在没有广告，而且抬头就能全屏。",
      "城市里找星星像找停车位，偶尔看见一颗，就忍不住替整片夜空高兴。",
    ],
    deep: [
      "看见银河的珍贵，不只在于景色，而在于我们短暂退出日常尺度，重新感到自身既渺小又真实。",
      "宇宙没有替人解决烦恼，却把烦恼放回更宽的夜里；有些安慰来自比例，而不是答案。",
    ],
  },
  {
    forum: "V2EX",
    threadTitle: "AI 订阅越来越多",
    sourceUrl: "https://www.v2ex.com/t/1228031",
    topic: "ai_attention",
    topicLabel: "AI 与选择",
    light: [
      "AI 套餐越来越像自助餐：每盘都想试一口，月底先由银行卡获得智慧。",
      "最强模型总在下一个标签页里，真正稳定在线的只有那张订阅账单。",
    ],
    deep: [
      "工具选择过多会制造一种新焦虑：仿佛没有使用最新能力，就已经落后于尚未发生的未来。",
      "成熟的技术关系不是追逐每次更新，而是知道哪个问题值得交给机器，哪个判断仍要由自己承担。",
    ],
  },
  {
    forum: "V2EX",
    threadTitle: "孩子需要多少兴趣班",
    sourceUrl: "https://www.v2ex.com/t/1228170",
    topic: "family_connection",
    topicLabel: "成长与陪伴",
    light: [
      "兴趣班排得太满，孩子最大的兴趣可能会变成研究怎么在车上补觉。",
      "会三种乐器当然很好，会在院子里认真观察蚂蚁搬家也不算偏科。",
    ],
    deep: [
      "教育的难处在于，大人想替孩子减少未来遗憾，却可能先挤掉了他发现自己喜欢什么的空白。",
      "陪伴不是把每小时都安排得有价值，而是让孩子知道，即使暂时没有成果，他仍然值得被看见。",
    ],
  },
  {
    forum: "V2EX",
    threadTitle: "怎样备菜更省心",
    sourceUrl: "https://www.v2ex.com/t/1228158",
    topic: "everyday_ritual",
    topicLabel: "厨房小事",
    light: [
      "周末备菜像给星期三寄快递，收件人会在下班后郑重感谢过去的自己。",
      "冰箱里一排洗好的菜，是成年人版本的有人替我把作业写了一半。",
    ],
    deep: [
      "日常秩序不一定来自宏大的自律，也可能只是把疲惫时最难开始的那一步提前完成。",
      "为未来的自己留一份容易做好的晚饭，是一种很具体的照顾：它不励志，但能接住低电量的夜晚。",
    ],
  },
  {
    forum: "V2EX",
    threadTitle: "怀念旧版聊天软件界面",
    sourceUrl: "https://www.v2ex.com/t/1228189",
    topic: "digital_memory",
    topicLabel: "数字怀旧",
    light: [
      "旧界面一出现，耳边仿佛自动响起拨号上网声，青春瞬间开始缓冲。",
      "以前换皮肤是互联网装修，现在换主题更像把深色模式从这边搬到那边。",
    ],
    deep: [
      "我们怀念的往往不是像素本身，而是那个网络还很慢、关系却显得有充足时间的自己。",
      "数字产品不断更新，却很少为共同记忆留门；旧界面提醒人，技术也曾是生活年代的一层墙纸。",
    ],
  },
  {
    forum: "V2EX",
    threadTitle: "在乡下远程做个人项目",
    sourceUrl: "https://v2ex.com/t/1193387",
    topic: "creative_life",
    topicLabel: "远程创作",
    light: [
      "乡下远程办公的同事很守时：公鸡负责晨会，晚风负责提醒下班。",
      "写代码卡住就去看云，云没有给方案，但至少没有再开一个需求单。",
    ],
    deep: [
      "远程创作真正改变的未必是地点，而是人终于能重新编排注意力、身体和一天的节奏。",
      "离开城市并不自动带来自由；自由来自知道自己需要什么环境，也愿意承担选择后的安静与不便。",
    ],
  },
  {
    forum: "Hacker News",
    threadTitle: "AI 与医疗职场监控",
    sourceUrl: "https://news.ycombinator.com/item?id=48952880",
    topic: "privacy_trust",
    topicLabel: "技术与监控",
    light: [
      "如果系统连我停顿三秒都要分析，希望它也能识别这三秒是在认真呼吸。",
      "智能监控最像一位过度热心的同事：什么都记录，就是不替你值夜班。",
    ],
    deep: [
      "在照护行业里，把可测量等同于有价值，容易让真正重要却难量化的耐心与判断变得不可见。",
      "技术可以帮助发现风险，但当观察变成持续审判，专业者会先学会迎合指标，而不是照顾眼前的人。",
    ],
  },
  {
    forum: "Hacker News",
    threadTitle: "让旧上网本重新工作",
    sourceUrl: "https://news.ycombinator.com/item?id=48907063",
    topic: "repair_longevity",
    topicLabel: "修复与长寿",
    light: [
      "旧电脑开机慢得像在回忆密码，但能再次亮起来，就有一种老朋友赴约的体面。",
      "给上网本装轻量系统，像给退休运动员换双舒服的鞋：不争冠军，也还能散步。",
    ],
    deep: [
      "修复旧设备的意义不只是省钱，它拒绝把仍能工作的东西过早归入废物，也延长了人与物的关系。",
      "技术进步若只能通过不断丢弃来被看见，代价会留在看不见的矿山、工厂和垃圾堆里。",
    ],
  },
  {
    forum: "Hacker News",
    threadTitle: "类地行星大气的新线索",
    sourceUrl: "https://news.ycombinator.com/item?id=48947560",
    topic: "science_wonder",
    topicLabel: "遥远行星",
    light: [
      "给遥远行星看天气预报，大概是人类把出门带伞这件事做到了宇宙尺度。",
      "那颗星球也许有大气，但暂时不用担心堵车，通勤路线还在几十光年之外。",
    ],
    deep: [
      "寻找另一颗类地世界，表面是在问远方有没有生命，深处也在问我们该怎样珍惜这颗已经回答的星球。",
      "科学最动人的地方，是它允许确定与未知同时存在：证据向前一步，想象也学会不越过边界。",
    ],
  },
  {
    forum: "Hacker News",
    threadTitle: "随手写的纸质笔记",
    sourceUrl: "https://news.ycombinator.com/item?id=48954149",
    topic: "analog_focus",
    topicLabel: "纸笔与专注",
    light: [
      "纸质笔记最大的云同步功能，是把本子忘在家后，整天都在想它。",
      "手写的待办不会弹通知，只会安静躺着，用一行歪字表达持续关注。",
    ],
    deep: [
      "纸笔的价值不是复古，而是它给思考划出一个没有链接、提醒和推荐算法的有限空间。",
      "写得慢会迫使人选择什么值得留下；这种摩擦看似降低速度，却可能提高理解的密度。",
    ],
  },
  {
    forum: "Hacker News",
    threadTitle: "为什么 SQLite 仍然迷人",
    sourceUrl: "https://news.ycombinator.com/item?id=48950122",
    topic: "open_technology",
    topicLabel: "朴素技术",
    light: [
      "SQLite 像工具箱里那把旧螺丝刀：发布会从不提它，真正干活时总能找到它。",
      "能把数据库装进一个文件，是技术世界少见的整理高手，连搬家都只拎一个包。",
    ],
    deep: [
      "优秀基础设施的成熟，常表现为它不再要求被注意；可靠、可理解和长期兼容，本身就是创新。",
      "复杂系统容易让人误把规模当能力，而朴素工具提醒我们：贴合问题边界，比展示架构更重要。",
    ],
  },
  {
    forum: "Hacker News",
    threadTitle: "开源电子阅读器",
    sourceUrl: "https://news.ycombinator.com/item?id=48952135",
    topic: "open_technology",
    topicLabel: "开放阅读",
    light: [
      "开源阅读器最浪漫的功能，是翻到一半不会突然建议你顺便买个厨房电器。",
      "电子墨水刷新时那一下闪烁，很像机器认真眨眼，确认你还在读这一页。",
    ],
    deep: [
      "阅读设备若允许修理、导出和自主选择书源，书才更接近被拥有，而不是被平台临时许可。",
      "开放技术的价值不只属于开发者，它让普通人的记忆、标注和阅读习惯不必被一家公司定义寿命。",
    ],
  },
  {
    forum: "Hacker News",
    threadTitle: "乐高说明书的设计",
    sourceUrl: "https://news.ycombinator.com/item?id=48950518",
    topic: "everyday_ritual",
    topicLabel: "清晰说明",
    light: [
      "好说明书的最高境界，是让人觉得自己很聪明，而不是让人认识印刷厂所有箭头。",
      "一块积木装反时，说明书不会批评你，只会在下一页用现实温柔地指出问题。",
    ],
    deep: [
      "清晰设计不是删掉信息，而是按人的动作和疑问安排信息，让理解发生在需要它的那一刻。",
      "真正友善的指引会保留试错尊严：它帮助人回到路径，却不把一次装反定义成能力不足。",
    ],
  },
  {
    forum: "Hacker News",
    threadTitle: "面对问题的几种方式",
    sourceUrl: "https://news.ycombinator.com/item?id=48947490",
    topic: "problem_solving",
    topicLabel: "问题与行动",
    light: [
      "有些问题需要解决，有些需要绕开，还有一些只需要睡一觉后重新命名。",
      "待办列表最怕的一句话是：这件事如果不做，究竟会发生什么？",
    ],
    deep: [
      "成长不只增加解决问题的能力，也增加辨认问题归属的能力：并非每个警报都该由你接管。",
      "接受、改变和离开不是勇气的等级，而是三种判断；成熟在于看清代价后仍能选择。",
    ],
  },
  {
    forum: "Hacker News",
    threadTitle: "开源 AI 的下一步",
    sourceUrl: "https://news.ycombinator.com/item?id=48947825",
    topic: "open_technology",
    topicLabel: "开放智能",
    light: [
      "开源模型像公共厨房：大家都能进来做菜，显卡先负责决定今天吃不吃得起。",
      "模型权重开放以后，最先变重的往往是下载进度条和硬盘空间。",
    ],
    deep: [
      "开放 AI 的意义不只是免费使用，而是让能力、限制和修改权可以被更多人检查与讨论。",
      "技术开放不会自动带来公共利益；它还需要透明评估、可追责部署，以及对被影响者真实处境的关注。",
    ],
  },
  {
    forum: "Hacker News",
    threadTitle: "一枚老芯片五十岁了",
    sourceUrl: "https://news.ycombinator.com/item?id=48951461",
    topic: "digital_memory",
    topicLabel: "技术记忆",
    light: [
      "老芯片过五十岁仍有人庆生，说明只要接口稳定，电子元件也能拥有长久友谊。",
      "年轻芯片比参数，老芯片讲故事；跑得不快，却认识好几代人的第一次开机。",
    ],
    deep: [
      "纪念一枚老芯片，是在纪念一种可被个人理解的计算时代：机器并不神秘到只能被少数平台解释。",
      "技术史不只由最快的产品组成，也由那些足够简单、便宜、耐久，因而进入普通人创造生活的工具组成。",
    ],
  },
  {
    forum: "Reddit",
    threadTitle: "在家创作时忽然感到幸运",
    sourceUrl: "https://www.reddit.com/r/simpleliving/comments/1u8xc55/i_work_from_home_as_an_artist_this_morning_i_felt/",
    topic: "creative_life",
    topicLabel: "创作与感恩",
    light: [
      "在家创作的通勤路线只有十几步，最大的交通事故是踩到昨晚没收好的袜子。",
      "灵感没来时先给植物浇水，至少这场创作会议里有一位成员明确表示满意。",
    ],
    deep: [
      "感恩并不要求生活完美，它只是让人暂停追赶，认出那些已经在支撑自己的普通条件。",
      "把喜欢的事变成工作后，仍需为无目的的创作留一扇窗，否则热爱也会被产出指标慢慢挤窄。",
    ],
  },
  {
    forum: "Reddit",
    threadTitle: "成年人也需要更长的暑假",
    sourceUrl: "https://www.reddit.com/r/simpleliving/comments/1uhhfnk/34m_vacations_dont_cut_it_anymore_i_think_we_all/",
    topic: "work_rest",
    topicLabel: "长假与恢复",
    light: [
      "成年人当然需要暑假，只是第一周可能全部用来理解自己真的不用回邮件。",
      "三天假期像系统重启：刚显示桌面，就弹出明天上班的更新通知。",
    ],
    deep: [
      "短假常常只够停止疲惫，长一点的空白才可能让人想起，自己在职业之外还喜欢怎样生活。",
      "休息若必须证明能提高下一阶段产出，就仍是工作的一部分；真正的恢复允许时间暂时没有用途。",
    ],
  },
  {
    forum: "Reddit",
    threadTitle: "用真心支持来选择朋友",
    sourceUrl: "https://www.reddit.com/r/simpleliving/comments/1tuat9i/choosing_friends_based_on_the_hell_yeah_test/",
    topic: "family_connection",
    topicLabel: "友谊与支持",
    light: [
      "好朋友听见你的新计划，先说太好了，再问需要我带零食还是带充电器。",
      "真正支持你的朋友不一定懂那个爱好，但会认真记住你下次演出是哪一天。",
    ],
    deep: [
      "健康的友谊不是永远赞同，而是在诚实表达不同之后，仍愿意保护彼此的尊严和可能性。",
      "选择朋友也是选择一种内在气候：有些关系让人持续防御，有些关系让人更敢成为自己。",
    ],
  },
  {
    forum: "Reddit",
    threadTitle: "年纪越大越喜欢花园和散步",
    sourceUrl: "https://www.reddit.com/r/simpleliving/comments/1ubn5z5/the_older_i_get_the_clearer_it_becomes_people/",
    topic: "simple_living",
    topicLabel: "简单生活",
    light: [
      "年纪渐长的一个好处，是终于承认看树发呆不是浪费时间，而是成熟版娱乐。",
      "散步、读书、晒太阳，这套豪华套餐唯一的问题是天气有时不配合营业。",
    ],
    deep: [
      "简单生活不是把世界缩小，而是减少无关噪声，让真正重要的人、身体和四季重新变得清晰。",
      "年轻时容易把强烈当作充实，后来才懂，稳定的日常也能很深，只是它不急着证明自己。",
    ],
  },
  {
    forum: "Reddit",
    threadTitle: "能不能平静地自然老去",
    sourceUrl: "https://www.reddit.com/r/simpleliving/comments/1u4bqte/cant_we_just_age_in_peace/",
    topic: "aging_acceptance",
    topicLabel: "自然老去",
    light: [
      "白头发并不代表系统故障，它更像身体自动开启了银色主题。",
      "笑纹是表情留下的使用记录，说明这张脸没有一直放在包装盒里。",
    ],
    deep: [
      "平静老去需要对抗的不是时间，而是一个不断把自然变化包装成个人失败的市场。",
      "接纳衰老并非否认失去，它是在变化里继续辨认身体的价值，不把年轻当成被爱的唯一资格。",
    ],
  },
  {
    forum: "Reddit",
    threadTitle: "感谢窗外的一小片绿",
    sourceUrl: "https://www.reddit.com/r/simpleliving/comments/1uazhwk/i_am_grateful_for_my_window_view_i_live_in_a_flat/",
    topic: "simple_living",
    topicLabel: "窗景与绿意",
    light: [
      "窗外那棵树每天都换一点版本，更新日志由叶子颜色负责发布。",
      "城市窗景不必壮阔，有一只鸟偶尔来开会，就足够让下午多一项议程。",
    ],
    deep: [
      "一小片可反复观看的绿意，会成为生活的时间标尺；人借它看见季节，也看见自己仍在经过。",
      "安慰有时不是逃到远方，而是与窗前同一棵树建立长期关系，让日常重新拥有可依靠的风景。",
    ],
  },
  {
    forum: "Reddit",
    threadTitle: "重新学习忍受无聊",
    sourceUrl: "https://www.reddit.com/r/simpleliving/comments/1tz8n3w/i_bought_a_sauna_and_discovered_how_uncomfortable/",
    topic: "analog_focus",
    topicLabel: "无聊与注意力",
    light: [
      "没有手机的十分钟，前两分钟像被困住，后八分钟才发现墙上的光也有连续剧。",
      "无聊刚出现，大脑就到处找遥控器；找不到以后，它只好自己开始播放。",
    ],
    deep: [
      "无法忍受无聊，可能不是生活缺少内容，而是注意力已经习惯每个空白都由外部刺激立刻填满。",
      "无聊是一道低矮的门槛，越过去以后，记忆、感受和创造才有机会从持续输入下面浮起来。",
    ],
  },
  {
    forum: "Reddit",
    threadTitle: "书、狗与安静的早晨",
    sourceUrl: "https://www.reddit.com/r/simpleliving/comments/1tycc8f/book_doggo_and_a_quite_morning/",
    topic: "everyday_ritual",
    topicLabel: "安静早晨",
    light: [
      "书读到精彩处，狗刚好把头压在那一页上，文学评论简单而有分量。",
      "安静早晨的时间算法很特别：咖啡还热时很慢，准备出门时突然加速。",
    ],
    deep: [
      "日常幸福常没有高潮，只是熟悉的生命在身边呼吸，而你恰好没有急着去别处。",
      "安静并非什么都没发生；注意力不被争抢时，一本书、一只狗和晨光足以重新组织一天。",
    ],
  },
  {
    forum: "Reddit",
    threadTitle: "一杯黑咖啡和不赶时间的片刻",
    sourceUrl: "https://www.reddit.com/r/simpleliving/comments/1ui2dhl/a_simple_cup_of_black_coffee_a_quiet_moment_and/",
    topic: "everyday_ritual",
    topicLabel: "咖啡片刻",
    light: [
      "黑咖啡没有复杂配方，只用一口苦味郑重通知：今天已经开始营业。",
      "不赶时间时，咖啡会慢慢变凉；赶时间时，它通常保持滚烫直到你忘记它。",
    ],
    deep: [
      "仪式感不是把普通事物变昂贵，而是让注意力完整地停在一件正在发生的小事上。",
      "一杯咖啡无法改变忙碌结构，但主动坐下的几分钟，仍在提醒身体：你不是待办列表的附属品。",
    ],
  },
  {
    forum: "Reddit",
    threadTitle: "家庭延续至今的小传统",
    sourceUrl: "https://www.reddit.com/r/CasualConversation/comments/1ussq6d/what_small_tradition_has_your_family_carried_into/",
    topic: "family_connection",
    topicLabel: "家庭小传统",
    light: [
      "家里的传统菜谱没有精确克数，只有少许、看着办，以及长辈隔空传来的再加一点。",
      "每年固定拍一张合照的意义，是证明大家的发型都曾做过勇敢决定。",
    ],
    deep: [
      "小传统把抽象的家变成可重复的动作；即使地点改变，人仍能通过同一道菜和同一句玩笑彼此认出。",
      "传统最有生命力的部分不是一成不变，而是每一代都能留下自己的改动，同时知道它从谁手里传来。",
    ],
  },
];

// 论坛口语不沿用诗歌关键词猜测：这里逐类人工定义场景、情感和它在休息空间中承担的心理功能。
const semanticProfiles = {
  ai_attention: profile(["inner_world", "threshold"], ["relief", "resilience"], "release", "open", "open"),
  privacy_trust: profile(["human_world", "inner_world"], ["freedom", "resilience"], "courage", "affirm", "grounded"),
  work_rest: profile(["human_world", "inner_world"], ["melancholy", "relief"], "rest", "witness", "still"),
  mindful_consumption: profile(["human_world", "home"], ["serenity", "relief"], "permission", "reframe", "still"),
  science_wonder: profile(["spiritual", "nature"], ["wonder", "serenity"], "perspective", "awaken", "bright"),
  family_connection: profile(["companionship", "home"], ["belonging", "tenderness"], "connection", "soothe", "soft"),
  everyday_ritual: profile(["home", "solitude"], ["serenity", "tenderness"], "rest", "soothe", "soft"),
  digital_memory: profile(["memory", "human_world"], ["longing", "melancholy"], "comfort", "accompany", "soft"),
  creative_life: profile(["inner_world", "home"], ["joy", "freedom"], "renewal", "invite", "bright"),
  repair_longevity: profile(["human_world", "home"], ["resilience", "tenderness"], "meaning", "affirm", "grounded"),
  analog_focus: profile(["solitude", "inner_world"], ["serenity", "freedom"], "permission", "witness", "still"),
  open_technology: profile(["human_world", "companionship"], ["resilience", "freedom"], "courage", "affirm", "grounded"),
  problem_solving: profile(["inner_world", "journey"], ["resilience", "freedom"], "courage", "reframe", "grounded"),
  simple_living: profile(["nature", "home"], ["serenity", "relief"], "release", "open", "open"),
  aging_acceptance: profile(["inner_world", "human_world"], ["mortality", "tenderness"], "meaning", "reframe", "soft"),
};

assert.equal(threads.length, 30, "forum source manifest must contain exactly 30 threads");
assert.deepEqual(countBy(threads, "forum"), { "Hacker News": 10, Reddit: 10, V2EX: 10 });
assert.equal(new Set(threads.map((thread) => thread.sourceUrl)).size, 30, "forum source URLs must be unique");
assert.ok(
  threads.every((thread) => thread.light.length === 2 && thread.deep.length === 2),
  "every forum thread must have two light and two deep original comments",
);

const drafts = threads.flatMap((thread) =>
  ["light", "deep"].flatMap((tone) =>
    thread[tone].map((content) => ({
      ...thread,
      light: undefined,
      deep: undefined,
      tone,
      content,
      title: `现代观察 · ${thread.topicLabel}`,
      region: "global_forum",
      era: "contemporary",
      language: "zh-Hans",
      rights: "original-commentary",
    })),
  ),
);

const assigned = ["light", "deep"].flatMap((tone) =>
  assignActivities(drafts.filter((entry) => entry.tone === tone)),
);
const entries = assigned.map((entry, index) => ({
  slug: `forum-${VERSION}-${String(index + 1).padStart(4, "0")}`,
  kind: index % 4 === 0 ? "CARD" : "RESULT",
  dropRate: index % 4 === 0 ? (index % 8 === 0 ? 16 : 24) : 0,
  title: entry.title,
  content: entry.content,
  activitySlug: entry.activitySlug,
  forum: entry.forum,
  threadTitle: entry.threadTitle,
  sourceUrl: entry.sourceUrl,
  topic: entry.topic,
  topicLabel: entry.topicLabel,
  tone: entry.tone,
  language: entry.language,
  era: entry.era,
  region: entry.region,
  rights: entry.rights,
  observedAt: OBSERVED_AT,
  expiresAt: EXPIRES_AT,
  semantics: analyzeForumSemantics(entry),
}));

assert.equal(entries.length, 120);
assert.equal(new Set(entries.map((entry) => normalize(entry.content))).size, 120, "forum copy must be unique");
assert.deepEqual(countBy(entries, "tone"), { deep: 60, light: 60 });
assert.deepEqual(countBy(entries, "activitySlug"), { breathe: 30, drift: 30, stroll: 30, tea: 30 });
assert.deepEqual(countBy(entries, "kind"), { CARD: 30, RESULT: 90 });
for (const entry of entries) {
  assertMoyuCopyPolicy(entry);
  assert.ok(entry.content.length >= 16 && entry.content.length <= 120, `${entry.slug} content length is invalid`);
}

writeFileSync(
  OUTPUT_URL,
  `${JSON.stringify({ version: VERSION, generatedAt: OBSERVED_AT, observedAt: OBSERVED_AT, expiresAt: EXPIRES_AT, entries }, null, 2)}\n`,
);
console.log(`wrote ${entries.length} original forum-inspired entries to ${OUTPUT_URL.pathname}`);

function assignActivities(entries) {
  assert.equal(entries.length, 60, "each tone pool must contain 60 entries");
  const quotas = Object.fromEntries(ACTIVITIES.map((activity) => [activity, 15]));
  // ponytail: 只有四种固定行为和等额配额，先分配“错配最痛”的内容；行为继续增加时升级为最小费用流。
  const candidates = entries
    .map((entry, index) => ({ entry, index, choices: rankActivities(entry) }))
    .toSorted((left, right) => {
      const leftRegret = left.choices[0].score - left.choices[1].score;
      const rightRegret = right.choices[0].score - right.choices[1].score;
      return rightRegret - leftRegret || right.choices[0].score - left.choices[0].score || left.index - right.index;
    });
  const assignedActivity = new Map();

  for (const candidate of candidates) {
    const activitySlug = candidate.choices.find((choice) => quotas[choice.activitySlug] > 0)?.activitySlug;
    assert.ok(activitySlug, "forum activity quota assignment failed");
    quotas[activitySlug] -= 1;
    assignedActivity.set(candidate.index, activitySlug);
  }

  return entries.map((entry, index) => ({ ...entry, activitySlug: assignedActivity.get(index) }));
}

function rankActivities(entry) {
  return ACTIVITIES.map((activitySlug) => ({
    activitySlug,
    score: scoreMoyuSemanticActivityFit(analyzeForumSemantics(entry), activitySlug),
  })).toSorted((left, right) => right.score - left.score || left.activitySlug.localeCompare(right.activitySlug));
}

function profile(scenes, emotionalCores, psychologicalNeed, literaryGesture, energy) {
  return { scenes, emotionalCores, psychologicalNeed, literaryGesture, energy };
}

function analyzeForumSemantics(entry) {
  const semantics = semanticProfiles[entry.topic];
  assert.ok(semantics, `unknown forum semantic profile: ${entry.topic}`);
  return { version: MOYU_SEMANTIC_VERSION, ...semantics, confidence: "high" };
}

function countBy(entries, key) {
  return Object.fromEntries(
    [...Map.groupBy(entries, (entry) => entry[key])]
      .map(([value, items]) => [value, items.length])
      .sort(([left], [right]) => String(left).localeCompare(String(right))),
  );
}

function normalize(value) {
  return value.toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, "");
}
