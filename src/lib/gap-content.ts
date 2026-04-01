import type {
  ActivityRecord,
  BackgroundRecord,
  CityRecord,
  CopywritingRecord,
  DimensionGroupRecord,
  DimensionOptionRecord,
  ForestCatalog,
} from "@/lib/gap-types";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

type DimensionGroupSeed = {
  key: string;
  label: string;
  kind: "TIME_OF_DAY" | "INDUSTRY" | "MOOD" | "STYLE" | "WEATHER" | "CARD_RARITY" | "GREETING_PHASE";
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

const dimensionGroupSeeds: DimensionGroupSeed[] = [
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
    label: "行业",
    kind: "INDUSTRY",
    description: "给高压职业一点被理解的专属语气。",
    options: [
      { slug: "programmer", label: "程序员", description: "长时间面对屏幕、上下文切换频繁。" },
      { slug: "medical", label: "医护", description: "高压、值班、体力脑力同时在线。" },
      { slug: "teacher", label: "教师", description: "情绪劳动多，需要慢慢回神。" },
      { slug: "delivery", label: "外卖员", description: "奔波、时效、天气都在身上。" },
      { slug: "office", label: "职场人", description: "会议、消息、待办堆叠的日常。" },
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

const activitySeeds: ActivitySeed[] = [
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

const copySeeds: CopySeed[] = [
  {
    slug: "greeting-dawn-01",
    kind: "GREETING",
    title: "清晨问候",
    content: "森林今天醒得比消息列表早一点，你也可以。",
    dimensions: ["time_of_day:dawn", "greeting_phase:opening", "style:tender"],
  },
  {
    slug: "greeting-day-01",
    kind: "GREETING",
    title: "午后问候",
    content: "白天有很多任务，这里先只接住你这个人。",
    dimensions: ["time_of_day:day", "greeting_phase:opening", "style:lucid"],
  },
  {
    slug: "greeting-dusk-01",
    kind: "GREETING",
    title: "傍晚问候",
    content: "傍晚是一天里最适合把自己捡回来的时段。",
    dimensions: ["time_of_day:dusk", "greeting_phase:settling", "style:tender"],
  },
  {
    slug: "greeting-night-01",
    kind: "GREETING",
    title: "深夜问候",
    content: "今天没讲完的话，先在这里放轻一点。",
    dimensions: ["time_of_day:night", "greeting_phase:settling", "style:lucid"],
  },
  {
    slug: "drift-result-01",
    kind: "RESULT",
    activitySlug: "drift",
    title: "无条件基本收入",
    content: "你刚刚为大脑申请了一笔无条件的安静补贴。",
    minDurationSec: 45,
    dimensions: ["style:witty", "mood:reset"],
  },
  {
    slug: "drift-result-02",
    kind: "RESULT",
    activitySlug: "drift",
    title: "主权区域",
    content: "这是你今天为自己争取到的一小块主权区域。",
    minDurationSec: 90,
    dimensions: ["style:lucid", "mood:gather"],
  },
  {
    slug: "drift-result-programmer",
    kind: "RESULT",
    activitySlug: "drift",
    title: "缓存清理",
    content: "你的大脑刚刚完成了一次温柔的缓存清理，不必立刻回到主线程。",
    dimensions: ["industry:programmer", "style:witty", "mood:reset"],
  },
  {
    slug: "tea-result-01",
    kind: "RESULT",
    activitySlug: "tea",
    title: "水文循环",
    content: "你用一杯热气，给自己补了一小段可见的生活。",
    dimensions: ["style:tender", "mood:gather"],
  },
  {
    slug: "tea-result-02",
    kind: "RESULT",
    activitySlug: "tea",
    title: "复活叶片",
    content: "你刚刚用热水复活了一片叶子，也顺手把自己泡松了一点。",
    dimensions: ["style:witty", "mood:breathe"],
  },
  {
    slug: "breathe-result-01",
    kind: "RESULT",
    activitySlug: "breathe",
    title: "空气缓存",
    content: "你刚刚刷新了所在坐标的空气缓存。",
    dimensions: ["style:witty", "mood:breathe"],
  },
  {
    slug: "breathe-result-02",
    kind: "RESULT",
    activitySlug: "breathe",
    title: "情绪交换",
    content: "你和大气完成了一次完整的情绪交换。",
    dimensions: ["style:tender", "mood:reset"],
  },
  {
    slug: "breathe-result-medical",
    kind: "RESULT",
    activitySlug: "breathe",
    title: "值班间隙",
    content: "这几分钟不属于病历、不属于铃声，先完整归还给你。",
    dimensions: ["industry:medical", "style:lucid", "mood:gather"],
  },
  {
    slug: "stroll-result-01",
    kind: "RESULT",
    activitySlug: "stroll",
    title: "脚步接管",
    content: "你把一部分重量交给脚步了，这是很高级的分担。",
    dimensions: ["style:lucid", "mood:gather"],
  },
  {
    slug: "stroll-result-02",
    kind: "RESULT",
    activitySlug: "stroll",
    title: "缓冲路段",
    content: "刚才那段路，没有在赶你，它只是陪你缓冲了一会儿。",
    dimensions: ["style:tender", "mood:wander"],
  },
  {
    slug: "office-result-01",
    kind: "RESULT",
    title: "免打扰权限",
    content: "你刚刚给自己开了一小段免打扰权限，这比秒回更重要。",
    dimensions: ["industry:office", "style:lucid", "mood:reset"],
  },
  {
    slug: "teacher-result-01",
    kind: "RESULT",
    title: "收声时刻",
    content: "在很多声音之后，你终于给自己留出了一点收声的空间。",
    dimensions: ["industry:teacher", "style:tender", "mood:gather"],
  },
  {
    slug: "delivery-result-01",
    kind: "RESULT",
    title: "风停一会",
    content: "你不必一直跟时间赛跑，这一会儿风先替你赶路。",
    dimensions: ["industry:delivery", "style:tender", "mood:breathe"],
  },
  {
    slug: "card-ordinary-01",
    kind: "CARD",
    title: "普通卡 | 缝隙",
    content: "不是每一分钟都要拿去证明自己。",
    dropRate: 20,
    dimensions: ["card_rarity:ordinary", "style:lucid"],
  },
  {
    slug: "card-ordinary-02",
    kind: "CARD",
    title: "普通卡 | 伸个懒腰",
    content: "你在日程的夹缝里，替自己伸了一次懒腰。",
    dropRate: 20,
    dimensions: ["card_rarity:ordinary", "style:tender"],
  },
  {
    slug: "card-glow-01",
    kind: "CARD",
    title: "微光卡 | 主权",
    content: "真正属于你的时刻，哪怕很小，也不是零头。",
    dropRate: 18,
    dimensions: ["card_rarity:glow", "style:lucid"],
  },
  {
    slug: "card-glow-02",
    kind: "CARD",
    title: "微光卡 | 回来",
    content: "如果世界太吵，回来坐一会儿也算一种胜利。",
    dropRate: 18,
    dimensions: ["card_rarity:glow", "style:tender", "time_of_day:night"],
  },
  {
    slug: "guide-onboarding-01",
    kind: "GUIDE",
    title: "森林导语",
    content: "这里不考核你是否高效，只认真对待你有没有在场。",
    dimensions: ["style:lucid"],
  },
];

const backgroundSeeds: BackgroundSeed[] = [
  {
    slug: "mist-lake-dawn",
    title: "雾湖清晨",
    imagePath: "/assets/backgrounds/mist-lake-dawn.jpg",
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
    imagePath: "/assets/backgrounds/forest-light-path.jpg",
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
    imagePath: "/assets/backgrounds/mountain-dusk.jpg",
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
    imagePath: "/assets/backgrounds/tea-window-night.jpg",
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

const citySeeds: CitySeed[] = [
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

export async function ensureGapMomentSeedData() {
  assertGapMomentDelegates();

  const [activityCount, copyCount, backgroundCount, cityCount, groupCount] = await Promise.all([
    prisma.momentActivity.count(),
    prisma.copywritingEntry.count(),
    prisma.backgroundAsset.count(),
    prisma.cityGuide.count(),
    prisma.dimensionGroup.count(),
  ]);

  if (activityCount > 0 && copyCount > 0 && backgroundCount > 0 && cityCount > 0 && groupCount > 0) {
    return;
  }

  await prisma.$transaction(
    async (tx) => {
      for (const activity of activitySeeds) {
      await tx.momentActivity.upsert({
        where: {
          slug: activity.slug,
        },
        update: {
          name: activity.name,
          iconKey: activity.iconKey,
          description: activity.description,
          prompt: activity.prompt,
          colorStart: activity.colorStart,
          colorEnd: activity.colorEnd,
          sortOrder: activity.sortOrder,
          isActive: true,
        },
        create: {
          slug: activity.slug,
          name: activity.name,
          iconKey: activity.iconKey,
          description: activity.description,
          prompt: activity.prompt,
          colorStart: activity.colorStart,
          colorEnd: activity.colorEnd,
          sortOrder: activity.sortOrder,
          isActive: true,
        },
      });
      }

      for (const group of dimensionGroupSeeds) {
      const createdGroup = await tx.dimensionGroup.upsert({
        where: {
          key: group.key,
        },
        update: {
          label: group.label,
          description: group.description,
          kind: group.kind,
          sortOrder: dimensionGroupSeeds.findIndex((item) => item.key === group.key) + 1,
        },
        create: {
          key: group.key,
          label: group.label,
          description: group.description,
          kind: group.kind,
          sortOrder: dimensionGroupSeeds.findIndex((item) => item.key === group.key) + 1,
        },
      });

      for (let index = 0; index < group.options.length; index += 1) {
        const option = group.options[index];
        await tx.dimensionOption.upsert({
          where: {
            groupId_slug: {
              groupId: createdGroup.id,
              slug: option.slug,
            },
          },
          update: {
            label: option.label,
            description: option.description ?? null,
            sortOrder: index + 1,
            isActive: true,
          },
          create: {
            groupId: createdGroup.id,
            slug: option.slug,
            label: option.label,
            description: option.description ?? null,
            sortOrder: index + 1,
            isActive: true,
          },
        });
      }
      }

      for (const city of citySeeds) {
      const createdCity = await tx.cityGuide.upsert({
        where: {
          slug: city.slug,
        },
        update: {
          name: city.name,
          description: city.description,
          sortOrder: citySeeds.findIndex((item) => item.slug === city.slug) + 1,
          isActive: true,
        },
        create: {
          slug: city.slug,
          name: city.name,
          description: city.description,
          sortOrder: citySeeds.findIndex((item) => item.slug === city.slug) + 1,
          isActive: true,
        },
      });

      for (const snack of city.snacks) {
        await tx.citySnack.upsert({
          where: {
            cityId_slug: {
              cityId: createdCity.id,
              slug: snack.slug,
            },
          },
          update: {
            name: snack.name,
            unitLabel: snack.unitLabel,
            priceCents: snack.priceCents,
            description: snack.description ?? null,
            sortOrder: snack.sortOrder,
            isActive: true,
          },
          create: {
            cityId: createdCity.id,
            slug: snack.slug,
            name: snack.name,
            unitLabel: snack.unitLabel,
            priceCents: snack.priceCents,
            description: snack.description ?? null,
            sortOrder: snack.sortOrder,
            isActive: true,
          },
        });
      }
      }

      const activityMap = await buildActivityIdMap(tx);
      const optionMap = await buildDimensionOptionIdMap(tx);

      for (const background of backgroundSeeds) {
      const savedBackground = await tx.backgroundAsset.upsert({
        where: {
          slug: background.slug,
        },
        update: {
          title: background.title,
          imagePath: background.imagePath,
          sourceName: background.sourceName,
          sourcePageUrl: background.sourcePageUrl,
          photographerName: background.photographerName ?? null,
          licenseLabel: background.licenseLabel ?? null,
          blurColor: background.blurColor ?? null,
          description: background.description ?? null,
          activityId: background.activitySlug ? (activityMap.get(background.activitySlug) ?? null) : null,
          sortOrder: background.sortOrder ?? 0,
          isActive: true,
        },
        create: {
          slug: background.slug,
          title: background.title,
          imagePath: background.imagePath,
          sourceName: background.sourceName,
          sourcePageUrl: background.sourcePageUrl,
          photographerName: background.photographerName ?? null,
          licenseLabel: background.licenseLabel ?? null,
          blurColor: background.blurColor ?? null,
          description: background.description ?? null,
          activityId: background.activitySlug ? (activityMap.get(background.activitySlug) ?? null) : null,
          sortOrder: background.sortOrder ?? 0,
          isActive: true,
        },
      });

      await syncBackgroundDimensions(tx, savedBackground.id, background.dimensions ?? [], optionMap);
      }

      for (const copy of copySeeds) {
      const savedCopy = await tx.copywritingEntry.upsert({
        where: {
          slug: copy.slug,
        },
        update: {
          kind: copy.kind,
          title: copy.title,
          content: copy.content,
          notes: copy.notes ?? null,
          activityId: copy.activitySlug ? (activityMap.get(copy.activitySlug) ?? null) : null,
          minDurationSec: copy.minDurationSec ?? null,
          maxDurationSec: copy.maxDurationSec ?? null,
          weight: copy.weight ?? 100,
          dropRate: copy.dropRate ?? 0,
          isActive: true,
        },
        create: {
          slug: copy.slug,
          kind: copy.kind,
          title: copy.title,
          content: copy.content,
          notes: copy.notes ?? null,
          activityId: copy.activitySlug ? (activityMap.get(copy.activitySlug) ?? null) : null,
          minDurationSec: copy.minDurationSec ?? null,
          maxDurationSec: copy.maxDurationSec ?? null,
          weight: copy.weight ?? 100,
          dropRate: copy.dropRate ?? 0,
          isActive: true,
        },
      });

      await syncCopyDimensions(tx, savedCopy.id, copy.dimensions ?? [], optionMap);
      }
    },
    {
      maxWait: 10_000,
      timeout: 30_000,
    },
  );
}

export async function getForestCatalog(): Promise<ForestCatalog> {
  await ensureGapMomentSeedData();

  const [activities, dimensionGroups, backgrounds, copyEntries, cities] = await Promise.all([
    prisma.momentActivity.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        sortOrder: "asc",
      },
    }),
    prisma.dimensionGroup.findMany({
      orderBy: {
        sortOrder: "asc",
      },
      include: {
        options: {
          where: {
            isActive: true,
          },
          orderBy: {
            sortOrder: "asc",
          },
        },
      },
    }),
    prisma.backgroundAsset.findMany({
      where: {
        isActive: true,
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: {
        activity: true,
        dimensions: {
          include: {
            option: {
              include: {
                group: true,
              },
            },
          },
        },
      },
    }),
    prisma.copywritingEntry.findMany({
      where: {
        isActive: true,
      },
      orderBy: [{ kind: "asc" }, { createdAt: "asc" }],
      include: {
        activity: true,
        dimensions: {
          include: {
            option: {
              include: {
                group: true,
              },
            },
          },
        },
      },
    }),
    prisma.cityGuide.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        sortOrder: "asc",
      },
      include: {
        snacks: {
          where: {
            isActive: true,
          },
          orderBy: {
            sortOrder: "asc",
          },
        },
      },
    }),
  ]);

  return {
    activities: activities.map((activity): ActivityRecord => ({
      id: activity.id,
      slug: activity.slug,
      name: activity.name,
      iconKey: activity.iconKey,
      description: activity.description,
      prompt: activity.prompt,
      colorStart: activity.colorStart,
      colorEnd: activity.colorEnd,
    })),
    dimensionGroups: dimensionGroups.map((group): DimensionGroupRecord => ({
      id: group.id,
      key: group.key,
      label: group.label,
      kind: group.kind,
      description: group.description,
      options: group.options.map((option): DimensionOptionRecord => ({
        id: option.id,
        groupKey: group.key,
        groupLabel: group.label,
        kind: group.kind,
        slug: option.slug,
        label: option.label,
        description: option.description,
      })),
    })),
    backgrounds: backgrounds.map((background): BackgroundRecord => ({
      id: background.id,
      slug: background.slug,
      title: background.title,
      imagePath: background.imagePath,
      sourceName: background.sourceName,
      sourcePageUrl: background.sourcePageUrl,
      photographerName: background.photographerName,
      licenseLabel: background.licenseLabel,
      blurColor: background.blurColor,
      description: background.description,
      activitySlug: background.activity?.slug ?? null,
      dimensionOptionIds: background.dimensions.map((entry) => entry.optionId),
      dimensionKeys: groupDimensionKeys(background.dimensions),
    })),
    copyEntries: copyEntries.map((entry): CopywritingRecord => ({
      id: entry.id,
      slug: entry.slug,
      kind: entry.kind,
      title: entry.title,
      content: entry.content,
      notes: entry.notes,
      activitySlug: entry.activity?.slug ?? null,
      minDurationSec: entry.minDurationSec,
      maxDurationSec: entry.maxDurationSec,
      weight: entry.weight,
      dropRate: entry.dropRate,
      dimensionOptionIds: entry.dimensions.map((item) => item.optionId),
      dimensionKeys: groupDimensionKeys(entry.dimensions),
    })),
    cities: cities.map((city): CityRecord => ({
      id: city.id,
      slug: city.slug,
      name: city.name,
      description: city.description,
      snacks: city.snacks.map((snack) => ({
        id: snack.id,
        slug: snack.slug,
        name: snack.name,
        unitLabel: snack.unitLabel,
        priceCents: snack.priceCents,
        description: snack.description,
      })),
    })),
  };
}

export async function getOperatorConsoleData() {
  await ensureGapMomentSeedData();

  const catalog = await getForestCatalog();
  const [allActivities, allBackgrounds, allCopyEntries, allCities] = await Promise.all([
    prisma.momentActivity.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
    prisma.backgroundAsset.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: {
        activity: true,
        dimensions: true,
      },
    }),
    prisma.copywritingEntry.findMany({
      orderBy: [{ kind: "asc" }, { createdAt: "asc" }],
      include: {
        activity: true,
        dimensions: true,
      },
    }),
    prisma.cityGuide.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: {
        snacks: {
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        },
      },
    }),
  ]);

  return {
    catalog,
    activities: allActivities,
    backgrounds: allBackgrounds,
    copyEntries: allCopyEntries,
    cities: allCities,
  };
}

async function buildActivityIdMap(tx: Prisma.TransactionClient) {
  const items = await tx.momentActivity.findMany();
  return new Map(items.map((item) => [item.slug, item.id]));
}

async function buildDimensionOptionIdMap(tx: Prisma.TransactionClient) {
  const items = await tx.dimensionOption.findMany({
    include: {
      group: true,
    },
  });

  return new Map(items.map((item) => [`${item.group.key}:${item.slug}`, item.id]));
}

async function syncCopyDimensions(
  tx: Prisma.TransactionClient,
  copyId: string,
  dimensionRefs: string[],
  optionMap: Map<string, string>,
) {
  const optionIds = dimensionRefs
    .map((item) => optionMap.get(item))
    .filter((item): item is string => Boolean(item));

  await tx.copywritingEntryDimension.deleteMany({
    where: {
      copywritingEntryId: copyId,
    },
  });

  if (optionIds.length === 0) {
    return;
  }

  await tx.copywritingEntryDimension.createMany({
    data: optionIds.map((optionId) => ({
      copywritingEntryId: copyId,
      optionId,
    })),
  });
}

async function syncBackgroundDimensions(
  tx: Prisma.TransactionClient,
  backgroundId: string,
  dimensionRefs: string[],
  optionMap: Map<string, string>,
) {
  const optionIds = dimensionRefs
    .map((item) => optionMap.get(item))
    .filter((item): item is string => Boolean(item));

  await tx.backgroundAssetDimension.deleteMany({
    where: {
      backgroundAssetId: backgroundId,
    },
  });

  if (optionIds.length === 0) {
    return;
  }

  await tx.backgroundAssetDimension.createMany({
    data: optionIds.map((optionId) => ({
      backgroundAssetId: backgroundId,
      optionId,
    })),
  });
}

function groupDimensionKeys(
  items: Array<{
    option: {
      slug: string;
      group: {
        key: string;
      };
    };
  }>,
) {
  return items.reduce<Record<string, string[]>>((accumulator, entry) => {
    const groupKey = entry.option.group.key;
    accumulator[groupKey] ??= [];
    accumulator[groupKey].push(entry.option.slug);
    return accumulator;
  }, {});
}

function assertGapMomentDelegates() {
  const prismaRecord = prisma as unknown as Record<string, unknown>;
  const requiredDelegates = [
    "momentActivity",
    "copywritingEntry",
    "backgroundAsset",
    "cityGuide",
    "dimensionGroup",
    "dimensionOption",
    "citySnack",
  ] as const;
  const missing = requiredDelegates.filter((key) => !prismaRecord[key]);

  if (missing.length === 0) {
    return;
  }

  throw new Error(
    `Prisma Client is out of date for Gap Moment models (${missing.join(", ")}). Run "npm run prisma:generate" and restart Next.js dev server.`,
  );
}
