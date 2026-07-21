import type { FishSpeciesRecord } from "~~/src/lib/moyu-types";
import moyuCopyCorpusData from "~~/src/lib/moyu-copy-corpus.json";
import moyuForumCopyData from "~~/src/lib/moyu-forum-copy.json";
import fishSpeciesData from "~~/src/lib/fish-species.json";
import { moyuQuoteSeeds } from "~~/src/lib/moyu-quotes";
import { semanticDimensionRefs, type MoyuSemanticAnalysis } from "~~/src/lib/moyu-semantics";

type DimensionGroupSeed = {
  key: string;
  label: string;
  kind:
    | "TIME_OF_DAY"
    | "INDUSTRY"
    | "MOOD"
    | "STYLE"
    | "WEATHER"
    | "CARD_RARITY"
    | "GREETING_PHASE"
    | "SCENE"
    | "EMOTIONAL_CORE"
    | "PSYCHOLOGICAL_NEED"
    | "LITERARY_GESTURE"
    | "ENERGY"
    | "CONTENT_TONE"
    | "HOT_TOPIC";
  description: string;
  options: Array<{
    slug: string;
    label: string;
    description?: string;
  }>;
};

type ActivitySeed = {
  slug: string;
  name: string;
  iconKey: string;
  description: string;
  prompt: string;
  colorStart: string;
  colorEnd: string;
  sortOrder: number;
};

type CopySeed = {
  slug: string;
  kind: "RESULT" | "CARD" | "GREETING" | "GUIDE";
  title: string;
  content: string;
  notes?: string;
  activitySlug?: string;
  minDurationSec?: number;
  maxDurationSec?: number;
  weight?: number;
  dropRate?: number;
  dimensions?: string[];
};

type CorpusEntry = {
  slug: string;
  kind: "RESULT" | "CARD";
  title: string;
  content: string;
  activitySlug: "drift" | "tea" | "breathe" | "stroll";
  dropRate: number;
  region: "east_asia" | "west" | "south_asia_middle_east" | "latin_america";
  era: "ancient" | "classical" | "modern";
  language: string;
  sourceUrl: string;
  semantics: MoyuSemanticAnalysis;
};

type ForumEntry = {
  slug: string;
  kind: "RESULT" | "CARD";
  title: string;
  content: string;
  activitySlug: "drift" | "tea" | "breathe" | "stroll";
  dropRate: number;
  forum: "V2EX" | "Hacker News" | "Reddit";
  topic: string;
  tone: "light" | "deep";
  sourceUrl: string;
  observedAt: string;
  expiresAt: string;
  semantics: MoyuSemanticAnalysis;
};

type BackgroundSeed = {
  slug: string;
  title: string;
  imagePath: string;
  sourceName: string;
  sourcePageUrl: string;
  photographerName?: string;
  licenseLabel?: string;
  blurColor?: string;
  description?: string;
  activitySlug?: string;
  sortOrder?: number;
  dimensions?: string[];
};

type CitySeed = {
  slug: string;
  name: string;
  description: string;
  snacks: Array<{
    slug: string;
    name: string;
    unitLabel: string;
    priceCents: number;
    description?: string;
    sortOrder: number;
  }>;
};

type FishSpeciesSeed = Omit<FishSpeciesRecord, "id"> & {
  chinaProtectionNote: string;
  chinaProtectionBasis: string;
  chinaProtectionSourceUrl: string;
  citesNote: string;
  citesSourceUrl: string;
  threeHaveNote: string;
  toxicityNote: string;
  edibilityNote: string;
  sourceName: string;
  sourcePageUrl: string;
  imageSourceName: string;
  imageSourcePageUrl: string;
  imageAuthor: string | null;
  licenseLabel: string | null;
  sortOrder: number;
};

// ponytail: the catalog checker validates these generated status strings more usefully than widening every JSON literal.
export const fishSpeciesSeeds = fishSpeciesData as FishSpeciesSeed[];
export const dimensionGroupSeeds: DimensionGroupSeed[] = [
  {
    key: "time_of_day",
    label: "时段",
    kind: "TIME_OF_DAY",
    description: "用于区分早晨、午间、傍晚与深夜的呼吸感。",
    options: [
      { slug: "dawn", label: "清晨", description: "天刚亮，适合轻轻醒来。" },
      { slug: "day", label: "午后", description: "白天的缝隙里，留一点松动。" },
      { slug: "dusk", label: "傍晚", description: "白天退场、夜晚靠近的过渡带。" },
      { slug: "night", label: "深夜", description: "适合安静、自我回收和慢呼吸。" },
    ],
  },
  {
    key: "industry",
    label: "职业",
    kind: "INDUSTRY",
    description: "从现行国家职业分类中选取 30 个代表职业，给不同劳动节奏一点被理解的专属语气。",
    options: [
      { slug: "programmer", label: "计算机程序设计员", description: "长时间面对屏幕、逻辑与上下文切换频繁。" },
      { slug: "medical", label: "全科医师", description: "临床判断、沟通和值班压力同时在线。" },
      { slug: "teacher", label: "中小学教师", description: "教学、备课和持续的情绪劳动交织。" },
      { slug: "accounting", label: "会计专业人员", description: "数字、制度和截止时间要求高度准确。" },
      { slug: "ai-trainer", label: "人工智能训练师", description: "在数据、标注、调优与人的判断之间往返。" },
      { slug: "security-tester", label: "信息安全测试员", description: "持续寻找边界与漏洞，需要长时间集中注意。" },
      { slug: "data-engineer", label: "数据分析处理工程技术人员", description: "从复杂数据里梳理结构、异常与结论。" },
      { slug: "bim-technician", label: "建筑信息模型技术员", description: "在空间、协同和大量工程细节之间切换。" },
      { slug: "nurse", label: "护士", description: "照护、轮班与突发状况带来持续身心负荷。" },
      { slug: "preschool-teacher", label: "幼儿教育教师", description: "需要高密度关注、安全判断与温柔回应。" },
      { slug: "lawyer", label: "律师", description: "事实、规则、表达与当事人的情绪共同在场。" },
      { slug: "office", label: "人力资源管理专业人员", description: "在组织制度、沟通和人的具体处境之间协调。" },
      { slug: "text-reporter", label: "文字记者", description: "追踪事实、赶时效，也承接现场的复杂感受。" },
      { slug: "text-editor", label: "文字编辑", description: "反复校正信息、结构和语气，需要细密专注。" },
      { slug: "advertising-designer", label: "广告设计师", description: "创意、审美、反馈与交付节点彼此拉扯。" },
      { slug: "commercial-photographer", label: "商业摄影师", description: "在光线、现场、客户期待和后期之间奔走。" },
      { slug: "social-worker", label: "社会工作者", description: "长期接住他人的困境，也需要为自己留出缓冲。" },
      { slug: "ecommerce-specialist", label: "电子商务师", description: "商品、平台、运营和即时数据构成快速节奏。" },
      { slug: "internet-marketer", label: "互联网营销师", description: "内容、流量和反馈实时变化，注意力消耗密集。" },
      { slug: "logistics-specialist", label: "物流服务师", description: "协调路径、库存与异常，让许多环节准时衔接。" },
      { slug: "courier", label: "快递员", description: "在路线、时效、天气和沟通之间持续移动。" },
      { slug: "delivery", label: "网约配送员", description: "平台节奏、路况与每一单的时间压力都在身上。" },
      { slug: "chinese-cook", label: "中式烹调师", description: "高温、站立、出餐节奏与味觉判断同时发生。" },
      { slug: "barista", label: "咖啡师", description: "重复而精细的手作、服务交流和早晚班交织。" },
      { slug: "agricultural-manager", label: "农业经理人", description: "天气、生产、市场和人员安排都具有不确定性。" },
      { slug: "electrician", label: "电工", description: "在安全规范和现场故障之间保持谨慎专注。" },
      { slug: "auto-mechanic", label: "汽车维修工", description: "诊断、拆装和体力工作需要稳定耐心。" },
      { slug: "industrial-robot-operator", label: "工业机器人系统操作员", description: "设备节拍、参数和生产安全要求持续在场。" },
      { slug: "elderly-care-worker", label: "养老护理员", description: "身体照护与情绪陪伴都需要耐力和温度。" },
      { slug: "childcare-worker", label: "保育师", description: "照料细节密集，始终要关注儿童安全与感受。" },
    ],
  },
  {
    key: "mood",
    label: "心绪",
    kind: "MOOD",
    description: "记录这条文案更偏向哪一种情绪落点。",
    options: [
      { slug: "reset", label: "复位", description: "像给自己按下一次刷新键。" },
      { slug: "breathe", label: "喘口气", description: "比快乐更基础，是先缓下来。" },
      { slug: "wander", label: "游离", description: "允许意识短暂偏航。" },
      { slug: "gather", label: "归拢", description: "把散掉的自己慢慢收回来。" },
    ],
  },
  {
    key: "scene",
    label: "场景内核",
    kind: "SCENE",
    description: "不是地点分类，而是读到这句话时，意识被带入的生活与心理场域。",
    options: [
      { slug: "nature", label: "山水天地", description: "风、月、山海、草木构成的开放自然场域。" },
      { slug: "solitude", label: "独处静室", description: "无人打扰、安静向内的独处空间。" },
      { slug: "journey", label: "行路迁徙", description: "道路、舟船、脚步、离开与归返。" },
      { slug: "home", label: "炉火日常", description: "窗、灯、茶、酒与可安放身体的日常。" },
      { slug: "companionship", label: "相逢共坐", description: "朋友、爱人、亲人或陌生人的彼此在场。" },
      { slug: "memory", label: "故园回望", description: "记忆、旧日、故乡和无法复现的时间。" },
      { slug: "threshold", label: "晨昏风雨", description: "黎明、黄昏、季节和天气形成的过渡时刻。" },
      { slug: "spiritual", label: "宇宙玄思", description: "灵魂、真理、天地与超越个体的尺度。" },
      { slug: "human_world", label: "人间行役", description: "城市、劳作、战争、秩序与尘世往来。" },
      { slug: "inner_world", label: "梦与内景", description: "心、梦、念头和无法被外界直接看见的活动。" },
    ],
  },
  {
    key: "emotional_core",
    label: "情感内核",
    kind: "EMOTIONAL_CORE",
    description: "识别诗句真正承载的情绪张力，避免把有风景的句子一概归为治愈。",
    options: [
      { slug: "serenity", label: "澄静", description: "情绪已沉淀，世界暂时不需要被推动。" },
      { slug: "tenderness", label: "温情", description: "柔软地关心一个人、一件事或此刻的自己。" },
      { slug: "longing", label: "思念", description: "指向远方、故人、故乡或尚未抵达之物。" },
      { slug: "melancholy", label: "怅惘", description: "允许失落存在，不急着把它修复成积极。" },
      { slug: "wonder", label: "惊奇敬畏", description: "面对天地、美与未知时，被更大尺度打开。" },
      { slug: "joy", label: "欣悦", description: "轻盈、明亮、有生命力，但不喧闹亢奋。" },
      { slug: "resilience", label: "坚韧", description: "承认阻力，同时仍有继续站立和前行的力量。" },
      { slug: "freedom", label: "旷达", description: "松开控制，允许心和身体拥有更大边界。" },
      { slug: "belonging", label: "归属", description: "与家、友人、世界或自身重新建立联系。" },
      { slug: "mortality", label: "无常", description: "直面时间、衰老、离别和生命有限。" },
      { slug: "relief", label: "释然", description: "压力松动，终于可以呼出一直憋住的气。" },
    ],
  },
  {
    key: "psychological_need",
    label: "心理需要",
    kind: "PSYCHOLOGICAL_NEED",
    description: "这句话在当下承担什么功能：不是情绪是什么，而是此刻需要得到什么。",
    options: [
      { slug: "rest", label: "歇息", description: "暂时停止消耗，让注意力落地。" },
      { slug: "comfort", label: "被接住", description: "悲伤和疲惫不必独自承担。" },
      { slug: "release", label: "松绑", description: "从紧绷、控制和反复思考中松开一点。" },
      { slug: "connection", label: "重新相连", description: "确认自己仍与人、地方或世界存在关系。" },
      { slug: "perspective", label: "拉远视角", description: "把眼前难题放回更大的时间和空间。" },
      { slug: "renewal", label: "重新开始", description: "恢复新鲜感与再次行动的可能。" },
      { slug: "meaning", label: "找回意义", description: "在无常和失序中寻找可以承受的解释。" },
      { slug: "courage", label: "继续向前", description: "不否认困难，但为下一步提供支撑。" },
      { slug: "permission", label: "允许无用", description: "允许自己停顿、游离，不必立刻产出。" },
    ],
  },
  {
    key: "literary_gesture",
    label: "文字动作",
    kind: "LITERARY_GESTURE",
    description: "一句话如何靠近用户：看见、陪伴、邀请或改变观看角度。",
    options: [
      { slug: "witness", label: "静静看见", description: "不判断、不劝解，只确认此刻真实存在。" },
      { slug: "soothe", label: "轻声安抚", description: "降低刺激，让情绪先安全下来。" },
      { slug: "accompany", label: "并肩陪伴", description: "不替用户解决，但不让他独自停留。" },
      { slug: "invite", label: "向外邀请", description: "邀请身体或注意力迈出很小的一步。" },
      { slug: "reframe", label: "换个角度", description: "不否认现实，只重新安排它的尺度。" },
      { slug: "awaken", label: "唤醒感官", description: "用光、声音、风景让感受重新上线。" },
      { slug: "affirm", label: "确认力量", description: "指出用户已经拥有的韧性与行动能力。" },
      { slug: "open", label: "打开空间", description: "让胸口、视线和思绪获得更多余地。" },
    ],
  },
  {
    key: "energy",
    label: "能量强度",
    kind: "ENERGY",
    description: "控制一句话抵达用户时的力度，避免疲惫时收到过度昂扬的表达。",
    options: [
      { slug: "still", label: "静止", description: "几乎不推动，只陪意识停下。" },
      { slug: "soft", label: "低柔", description: "轻微安抚，不要求立刻改变。" },
      { slug: "flowing", label: "流动", description: "带一点前行感，但没有催促。" },
      { slug: "bright", label: "明亮", description: "唤醒感官和希望，保持克制。" },
      { slug: "grounded", label: "稳定", description: "提供可以依靠的力量与确定感。" },
      { slug: "open", label: "舒展", description: "从封闭状态向外展开呼吸和视野。" },
    ],
  },
  {
    key: "content_tone",
    label: "表达深浅",
    kind: "CONTENT_TONE",
    description: "区分当代议题的轻松入口与深度观察；两者都避免说教和低俗表达。",
    options: [
      { slug: "light", label: "轻松", description: "带一点日常幽默，让热点不制造新的压力。" },
      { slug: "deep", label: "深度", description: "追问议题背后的关系、边界、代价与心理需要。" },
    ],
  },
  {
    key: "hot_topic",
    label: "当代议题",
    kind: "HOT_TOPIC",
    description: "来自热门论坛公开线程的议题观察；正文为原创评论，并设置时效边界。",
    options: [
      { slug: "ai_attention", label: "AI 与注意力" },
      { slug: "privacy_trust", label: "隐私与信任" },
      { slug: "work_rest", label: "工作与休息" },
      { slug: "mindful_consumption", label: "日常消费" },
      { slug: "science_wonder", label: "科学与惊奇" },
      { slug: "family_connection", label: "关系与陪伴" },
      { slug: "everyday_ritual", label: "日常仪式" },
      { slug: "digital_memory", label: "数字记忆" },
      { slug: "creative_life", label: "创作生活" },
      { slug: "repair_longevity", label: "修复与长寿" },
      { slug: "analog_focus", label: "专注与留白" },
      { slug: "open_technology", label: "开放技术" },
      { slug: "problem_solving", label: "问题与行动" },
      { slug: "simple_living", label: "简单生活" },
      { slug: "aging_acceptance", label: "自然老去" },
    ],
  },
  {
    key: "style",
    label: "风格",
    kind: "STYLE",
    description: "帮助内容库混合不同的文字肌理。",
    options: [
      { slug: "tender", label: "温柔", description: "轻一点，像被稳稳接住。" },
      { slug: "witty", label: "俏皮", description: "带一点幽默，不端着。" },
      { slug: "lucid", label: "清醒", description: "不鸡汤，像一句干净的旁白。" },
    ],
  },
  {
    key: "weather",
    label: "天气",
    kind: "WEATHER",
    description: "为后续天气联动预留位置。",
    options: [
      { slug: "clear", label: "晴朗", description: "适合更明亮的表达。" },
      { slug: "rain", label: "下雨", description: "更安静，也更容易向内。" },
    ],
  },
  {
    key: "card_rarity",
    label: "卡片类型",
    kind: "CARD_RARITY",
    description: "区分普通收藏卡与更稀有的微光卡。",
    options: [
      { slug: "ordinary", label: "普通", description: "温柔稳定的日常句子。" },
      { slug: "glow", label: "微光", description: "更适合被珍藏和回看。" },
    ],
  },
  {
    key: "greeting_phase",
    label: "问候阶段",
    kind: "GREETING_PHASE",
    description: "用于主界面的问候语轮换。",
    options: [
      { slug: "opening", label: "初见", description: "刚打开森林时出现。" },
      { slug: "settling", label: "落座", description: "适合停下来之后读到。" },
    ],
  },
];

export const expectedDimensionOptionCount = dimensionGroupSeeds.reduce((total, group) => total + group.options.length, 0);

export const activitySeeds: ActivitySeed[] = [
  {
    slug: "drift",
    name: "发呆",
    iconKey: "cloud",
    description: "不解决问题，只让意识暂时离席。",
    prompt: "允许脑内弹窗静一会儿。",
    colorStart: "#dde9e1",
    colorEnd: "#b7d3c7",
    sortOrder: 1,
  },
  {
    slug: "tea",
    name: "喝茶",
    iconKey: "cup",
    description: "把手和呼吸都交给一杯热气。",
    prompt: "给工位加一点温热的水汽。",
    colorStart: "#f4e4cc",
    colorEnd: "#d8b78c",
    sortOrder: 2,
  },
  {
    slug: "breathe",
    name: "透气",
    iconKey: "leaf",
    description: "从原地退半步，给胸口腾出位置。",
    prompt: "跟空气重新打个招呼。",
    colorStart: "#d7ebe7",
    colorEnd: "#9ec6c3",
    sortOrder: 3,
  },
  {
    slug: "stroll",
    name: "散步",
    iconKey: "trail",
    description: "让脚步替脑子消化一下今天。",
    prompt: "把心思交给一段不赶路的路。",
    colorStart: "#dce2f1",
    colorEnd: "#b8c7e5",
    sortOrder: 4,
  },
];

export const copySeeds: CopySeed[] = [
  {
    slug: "greeting-dawn-01",
    kind: "GREETING",
    title: "常建《题破山寺后禅院》",
    content: "清晨入古寺，初日照高林。",
    notes: "原文核对：维基文库 https://zh.wikisource.org/",
    dimensions: ["time_of_day:dawn", "greeting_phase:opening", "style:tender"],
  },
  {
    slug: "greeting-day-01",
    kind: "GREETING",
    title: "苏轼《浣溪沙》",
    content: "人间有味是清欢。",
    notes: "原文核对：维基文库 https://zh.wikisource.org/",
    dimensions: ["time_of_day:day", "greeting_phase:opening", "style:lucid"],
  },
  {
    slug: "greeting-dusk-01",
    kind: "GREETING",
    title: "陶渊明《饮酒·其五》",
    content: "山气日夕佳，飞鸟相与还。",
    notes: "原文核对：维基文库 https://zh.wikisource.org/",
    dimensions: ["time_of_day:dusk", "greeting_phase:settling", "style:tender"],
  },
  {
    slug: "greeting-night-01",
    kind: "GREETING",
    title: "王维《鸟鸣涧》",
    content: "月出惊山鸟，时鸣春涧中。",
    notes: "原文核对：维基文库 https://zh.wikisource.org/",
    dimensions: ["time_of_day:night", "greeting_phase:settling", "style:lucid"],
  },
  ...moyuQuoteSeeds,
];

const moyuCopyCorpus = moyuCopyCorpusData as { version: string; entries: CorpusEntry[] };
export const corpusCopyPrefix = `corpus-${moyuCopyCorpus.version}-`;
const corpusRegionLabels: Record<CorpusEntry["region"], string> = {
  east_asia: "东亚",
  west: "西方",
  south_asia_middle_east: "南亚/中东",
  latin_america: "拉美",
};
const corpusEraLabels: Record<CorpusEntry["era"], string> = {
  ancient: "古代",
  classical: "古典",
  modern: "近现代",
};
const corpusCopySeeds: CopySeed[] = moyuCopyCorpus.entries.map((entry) => ({
  slug: entry.slug,
  kind: entry.kind,
  title: entry.title,
  content: entry.content,
  activitySlug: entry.activitySlug,
  dropRate: entry.dropRate,
  notes: `区域=${corpusRegionLabels[entry.region]};时代=${corpusEraLabels[entry.era]};语言=${entry.language};权利=公版;来源=${entry.sourceUrl}`,
  dimensions: semanticDimensionRefs(entry.semantics),
}));
const moyuForumCopy = moyuForumCopyData as { version: string; entries: ForumEntry[] };
export const forumCopyPrefix = `forum-${moyuForumCopy.version}-`;
const forumCopySeeds: CopySeed[] = moyuForumCopy.entries.map((entry) => ({
  slug: entry.slug,
  kind: entry.kind,
  title: entry.title,
  content: entry.content,
  activitySlug: entry.activitySlug,
  dropRate: entry.dropRate,
  notes: `区域=现代论坛;时代=当代;语言=zh-Hans;权利=原创;论坛=${entry.forum};语气=${entry.tone};话题=${entry.topic};观察=${entry.observedAt};有效至=${entry.expiresAt};来源=${entry.sourceUrl}`,
  dimensions: [
    ...semanticDimensionRefs(entry.semantics),
    `content_tone:${entry.tone}`,
    `hot_topic:${entry.topic}`,
  ],
}));
export const generatedCopySeeds = [...corpusCopySeeds, ...forumCopySeeds];
export const expectedGeneratedDimensionLinkCount = generatedCopySeeds.reduce(
  (total, entry) => total + (entry.dimensions?.length ?? 0),
  0,
);

export const legacyGeneratedCopySlugs = [
  "drift-result-01",
  "drift-result-02",
  "drift-result-programmer",
  "tea-result-01",
  "tea-result-02",
  "breathe-result-01",
  "breathe-result-02",
  "breathe-result-medical",
  "stroll-result-01",
  "stroll-result-02",
  "office-result-01",
  "teacher-result-01",
  "delivery-result-01",
  "card-ordinary-01",
  "card-ordinary-02",
  "card-glow-01",
  "card-glow-02",
  "guide-onboarding-01",
];

export const backgroundSeeds: BackgroundSeed[] = [
  {
    slug: "mist-lake-dawn",
    title: "雾湖清晨",
    imagePath: "/assets/backgrounds/mist-lake-dawn.webp",
    sourceName: "Pixabay",
    sourcePageUrl: "https://pixabay.com/photos/misty-mountains-sunrise-lake-summer-7303991/",
    photographerName: "JoshuaWoroniecki",
    licenseLabel: "Pixabay Content License",
    blurColor: "#7c94a0",
    description: "适合清晨和发呆时刻的薄雾湖面。",
    activitySlug: "drift",
    sortOrder: 1,
    dimensions: ["time_of_day:dawn"],
  },
  {
    slug: "forest-light-path",
    title: "林间光路",
    imagePath: "/assets/backgrounds/forest-light-path.webp",
    sourceName: "Pixabay",
    sourcePageUrl: "https://pixabay.com/photos/forest-fog-path-sunrays-green-7456238/",
    photographerName: "jplenio",
    licenseLabel: "Pixabay Content License",
    blurColor: "#66826a",
    description: "有微光穿过树林的小路，适合透气和散步。",
    activitySlug: "breathe",
    sortOrder: 2,
    dimensions: ["time_of_day:day", "weather:clear"],
  },
  {
    slug: "mountain-dusk",
    title: "山谷晚风",
    imagePath: "/assets/backgrounds/mountain-dusk.webp",
    sourceName: "Pixabay",
    sourcePageUrl: "https://pixabay.com/photos/mountains-lake-misty-sunrise-7500136/",
    photographerName: "jplenio",
    licenseLabel: "Pixabay Content License",
    blurColor: "#707a8f",
    description: "傍晚层叠山色，适合把白天慢慢放下。",
    activitySlug: "stroll",
    sortOrder: 3,
    dimensions: ["time_of_day:dusk"],
  },
  {
    slug: "golden-forest-rest",
    title: "窗边夜色",
    imagePath: "/assets/backgrounds/tea-window-night.webp",
    sourceName: "Pixabay",
    sourcePageUrl: "https://pixabay.com/photos/sunrays-trees-forest-fog-sunset-8283601/",
    photographerName: "jplenio",
    licenseLabel: "Pixabay Content License",
    blurColor: "#8d6d5e",
    description: "夜色里带暖光的窗边，适合喝茶和深夜停靠。",
    activitySlug: "tea",
    sortOrder: 4,
    dimensions: ["time_of_day:dusk"],
  },
];

export const citySeeds: CitySeed[] = [
  {
    slug: "beijing",
    name: "北京",
    description: "有一点硬朗，也有很稳的烟火气。",
    snacks: [
      {
        slug: "tang-huoshao",
        name: "糖火烧",
        unitLabel: "份",
        priceCents: 700,
        description: "芝麻与糖香都很有存在感。",
        sortOrder: 1,
      },
      {
        slug: "douzhi-jiaoquan",
        name: "豆汁焦圈",
        unitLabel: "套",
        priceCents: 1200,
        description: "有点挑人，但很北京。",
        sortOrder: 2,
      },
    ],
  },
  {
    slug: "shanghai",
    name: "上海",
    description: "节奏快，但也懂得给自己留一口热气。",
    snacks: [
      {
        slug: "shengjian",
        name: "生煎包",
        unitLabel: "份",
        priceCents: 1500,
        description: "底脆汁多，很适合给下午回血。",
        sortOrder: 1,
      },
      {
        slug: "xiaolongbao",
        name: "小笼包",
        unitLabel: "笼",
        priceCents: 1800,
        description: "温吞吞地提醒你慢一点。",
        sortOrder: 2,
      },
    ],
  },
  {
    slug: "guangzhou",
    name: "广州",
    description: "热气蒸腾，日常里自带安抚感。",
    snacks: [
      {
        slug: "changfen",
        name: "肠粉",
        unitLabel: "份",
        priceCents: 1200,
        description: "顺滑、温热、很会照顾情绪。",
        sortOrder: 1,
      },
      {
        slug: "xiagao",
        name: "虾饺",
        unitLabel: "笼",
        priceCents: 2200,
        description: "透明皮里藏着很认真的鲜味。",
        sortOrder: 2,
      },
    ],
  },
  {
    slug: "chengdu",
    name: "成都",
    description: "对慢有天然的理解，也对快乐很认真。",
    snacks: [
      {
        slug: "bingfen",
        name: "冰粉",
        unitLabel: "碗",
        priceCents: 1000,
        description: "凉快、轻盈，很适合缝隙时刻。",
        sortOrder: 1,
      },
      {
        slug: "chuanchuan",
        name: "串串",
        unitLabel: "把",
        priceCents: 1800,
        description: "热闹里也能找到自己的节奏。",
        sortOrder: 2,
      },
    ],
  },
];
