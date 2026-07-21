export const MOYU_SEMANTIC_VERSION = "1";

export const moyuSemanticValues = {
  scene: [
    "nature",
    "solitude",
    "journey",
    "home",
    "companionship",
    "memory",
    "threshold",
    "spiritual",
    "human_world",
    "inner_world",
  ],
  emotionalCore: [
    "serenity",
    "tenderness",
    "longing",
    "melancholy",
    "wonder",
    "joy",
    "resilience",
    "freedom",
    "belonging",
    "mortality",
    "relief",
  ],
  psychologicalNeed: [
    "rest",
    "comfort",
    "release",
    "connection",
    "perspective",
    "renewal",
    "meaning",
    "courage",
    "permission",
  ],
  literaryGesture: ["witness", "soothe", "accompany", "invite", "reframe", "awaken", "affirm", "open"],
  energy: ["still", "soft", "flowing", "bright", "grounded", "open"],
} as const;

type Scene = (typeof moyuSemanticValues.scene)[number];
type EmotionalCore = (typeof moyuSemanticValues.emotionalCore)[number];
type PsychologicalNeed = (typeof moyuSemanticValues.psychologicalNeed)[number];
type LiteraryGesture = (typeof moyuSemanticValues.literaryGesture)[number];
type Energy = (typeof moyuSemanticValues.energy)[number];
export type MoyuActivitySlug = "drift" | "tea" | "breathe" | "stroll";

export type MoyuSemanticAnalysis = {
  version: typeof MOYU_SEMANTIC_VERSION;
  scenes: Scene[];
  emotionalCores: EmotionalCore[];
  psychologicalNeed: PsychologicalNeed;
  literaryGesture: LiteraryGesture;
  energy: Energy;
  confidence: "contextual" | "medium" | "high";
};

type AnalyzeInput = {
  content: string;
  title?: string;
  activitySlug: MoyuActivitySlug;
};

const sceneSignals: Record<Scene, RegExp> = {
  nature:
    /\b(?:mountain|river|forest|tree|flower|wind|rain|sea|sky|moon|sun|star|bird|spring|autumn|cloud|field|garden|water|rock|bee)\w*\b|山|水|江|河|海|林|樹|树|花|草|雲|云|風|风|月|日|星|泉|鳥|鸟|春|秋|野|石|cielo|mar|río|rio|monte|árbol|arbol|flor|viento|lluvia|luna|sol|estrella|jardín|jardin|roca|abeja/giu,
  solitude:
    /\b(?:alone|lonely|solitude|silence|silent|quiet|empty|stillness)\b|獨|独|孤|寂|靜|静|空山|無人|无人|silencio|soledad|solo|sola|vacío|vacio/giu,
  journey:
    /\b(?:road|path|journey|walk|wander|travell?er|return|voyage|footstep|shore)\w*\b|路|行|徑|径|舟|船|歸|归|還|还|游|旅|步|camino|viaje|andar|volver|regreso|sendero|viajero/giu,
  home:
    /\b(?:home|house|room|window|door|fire|hearth|cup|tea|wine|garden|bed)\w*\b|家|室|廬|庐|窗|門|门|燈|灯|爐|炉|茶|酒|庭|牀|床|casa|hogar|ventana|puerta|fuego|vino|jardín|jardin|cama/giu,
  companionship:
    /\b(?:friend|guest|lover|beloved|mother|father|child|children|together|companion|we|us|you)\b|友|客|君|相逢|同|共|親|亲|兒|儿|故人|行人|遊人|游人|人語|人语|amor|amigo|amiga|juntos|contigo|niño|niña/giu,
  memory:
    /\b(?:remember|memory|past|old|once|again|former|yesterday|childhood)\w*\b|憶|忆|故|昔|舊|旧|曾|夢|梦|往|recuerdo|memoria|pasado|ayer|antaño|antano/giu,
  threshold:
    /\b(?:dawn|dusk|night|morning|evening|autumn|spring|rain|storm|snow|sunset|twilight)\w*\b|晨|暮|夕|夜|秋|春|雨|雪|霞|曉|晓|noche|alba|tarde|otoño|otono|primavera|lluvia|tormenta|crepúsculo|crepusculo/giu,
  spiritual:
    /\b(?:soul|god|heaven|eternal|truth|spirit|infinite|sacred|divine|prayer)\w*\b|天地|天道|道|神|真意|精神|無形|无形|alma|dios|cielo|etern|verdad|espíritu|espiritu|divino|oración|oracion/giu,
  human_world:
    /\b(?:city|street|market|work|labou?r|king|war|world|crowd|office)\w*\b|城|市|塵|尘|車|车|馬|马|人間|人间|世|市井|mundo|ciudad|calle|trabajo|guerra|multitud/giu,
  inner_world:
    /\b(?:heart|mind|dream|thought|desire|feeling|conscience)\w*\b|心|夢|梦|思|意|情|懷|怀|念|alma|corazón|corazon|sueño|sueno|pensamiento|deseo/giu,
};

const emotionalSignals: Record<EmotionalCore, RegExp> = {
  serenity:
    /\b(?:calm|quiet|peace|still|gentle|serene|silence|tranquil)\w*\b|靜|静|寂|閒|闲|悠然|澄|清|徐|安|silencio|calma|paz|seren|tranquil/giu,
  tenderness:
    /\b(?:love|beloved|dear|kiss|tender|gentle|soft|care|compassion)\w*\b|愛|爱|憐|怜|親|亲|溫|温|柔|情|amor|querid|beso|ternura|dulce|corazón|corazon/giu,
  longing:
    /\b(?:longing|yearn|wish|miss|return|far|await|desire|absence)\w*\b|思|懷|怀|望|歸|归|故|遠|远|待|寄|無由|无由|añor|anor|deseo|volver|lejos|espera|ausencia|quiero|busco|venir|partir|distancia|patria/giu,
  melancholy:
    /\b(?:sorrow|grief|tear|weep|sad|lonely|dark|wither|loss|regret)\w*\b|愁|悲|淚|泪|孤|恨|落|衰|萧瑟|蕭瑟|嘆|叹|悔|怨|不成|dolor|triste|llanto|soledad|pena|lamento/giu,
  wonder:
    /\b(?:wonder|beauty|beautiful|infinite|star|heaven|miracle|mystery|vast|light|divine)\w*\b|大美|天地|星|月|光|浩浩|蒼|苍|奇|真意|belleza|infinito|estrella|cielo|misterio|milagro|divin/giu,
  joy:
    /\b(?:joy|smile|laugh|spring|bloom|dance|delight|happy|glad)\w*\b|樂|乐|喜|笑|春|花|欣欣|童|怡|alegría|alegria|risa|primavera|flor|feliz/giu,
  resilience:
    /\b(?:courage|endure|strength|strong|stand|fearless|brave|struggle|rise|survive|hope|power)\w*\b|何妨|誰怕|谁怕|任平生|堅|坚|志|不競|不竞|復得|复得|自在|有力|valor|fuerza|resist|lucha|levanta|firme|esperanza|poder/giu,
  freedom:
    /\b(?:free|freedom|fly|open|wander|liberty|boundless)\w*\b|自由|飛|飞|遊|游|無心|无心|自在|libre|libertad|volar|abierto/giu,
  belonging:
    /\b(?:home|together|friend|companion|belong|return|family|kin)\w*\b|家|共|同|歸|归|還|还|友|親|亲|相與|相与|hogar|juntos|amigo|familia|regreso/giu,
  mortality:
    /\b(?:death|die|time|age|autumn|fade|old|end|mortal|grave)\w*\b|死|生|年|歲|岁|老|秋|暮|逝|終|终|無常|无常|muerte|morir|tiempo|edad|otoño|otono|final/giu,
  relief:
    /\b(?:breathe|breath|relief|release|rest|clear|fresh|ease|unburden)\w*\b|喘|息|休|清風|清风|豁|解|放|鬆|松|歇|respira|alivio|descanso|libera|claro/giu,
};

const defaultsByActivity: Record<
  MoyuActivitySlug,
  { scenes: [Scene, Scene]; emotionalCores: [EmotionalCore, EmotionalCore]; need: PsychologicalNeed; gesture: LiteraryGesture; energy: Energy }
> = {
  drift: {
    scenes: ["inner_world", "solitude"],
    emotionalCores: ["serenity", "wonder"],
    need: "permission",
    gesture: "witness",
    energy: "still",
  },
  tea: {
    scenes: ["home", "companionship"],
    emotionalCores: ["tenderness", "belonging"],
    need: "comfort",
    gesture: "soothe",
    energy: "soft",
  },
  breathe: {
    scenes: ["nature", "threshold"],
    emotionalCores: ["relief", "wonder"],
    need: "release",
    gesture: "open",
    energy: "open",
  },
  stroll: {
    scenes: ["journey", "nature"],
    emotionalCores: ["freedom", "resilience"],
    need: "perspective",
    gesture: "invite",
    energy: "flowing",
  },
};

export const moyuSemanticPreferencesByActivity: Record<
  MoyuActivitySlug,
  {
    scene: readonly Scene[];
    emotional_core: readonly EmotionalCore[];
    psychological_need: readonly PsychologicalNeed[];
    literary_gesture: readonly LiteraryGesture[];
    energy: readonly Energy[];
  }
> = {
  drift: {
    scene: ["inner_world", "solitude", "spiritual"],
    emotional_core: ["serenity", "wonder", "freedom"],
    psychological_need: ["permission", "rest", "perspective"],
    literary_gesture: ["witness", "reframe", "awaken"],
    energy: ["still", "soft"],
  },
  tea: {
    scene: ["home", "companionship", "memory"],
    emotional_core: ["tenderness", "belonging", "serenity", "longing", "melancholy"],
    psychological_need: ["comfort", "connection", "rest"],
    literary_gesture: ["soothe", "accompany"],
    energy: ["soft", "still"],
  },
  breathe: {
    scene: ["nature", "threshold", "spiritual"],
    emotional_core: ["relief", "wonder", "freedom", "serenity"],
    psychological_need: ["release", "renewal", "perspective"],
    literary_gesture: ["open", "awaken"],
    energy: ["open", "bright"],
  },
  stroll: {
    scene: ["journey", "nature", "human_world"],
    emotional_core: ["freedom", "resilience", "joy", "wonder"],
    psychological_need: ["perspective", "renewal", "courage"],
    literary_gesture: ["invite", "affirm", "awaken"],
    energy: ["flowing", "bright", "grounded"],
  },
};

// ponytail: 这是面向当前中英西公版诗歌的可审计词汇评分器；若扩到当代口语或万级语料，升级为人工复核的嵌入/模型分类管线，但保留同一标签契约。
export function analyzeMoyuSemantics({ content, title = "", activitySlug }: AnalyzeInput): MoyuSemanticAnalysis {
  const contentText = content.normalize("NFKC").toLowerCase();
  const sceneText = `${content} ${title}`.normalize("NFKC").toLowerCase();
  const defaults = defaultsByActivity[activitySlug];
  const scenes = rankLabels(sceneText, sceneSignals, defaults.scenes, 2);
  const emotionalCores = rankLabels(
    contentText,
    emotionalSignals,
    inferEmotionalDefaults(scenes.labels, contentText, activitySlug),
    2,
  );
  const weakestSignal = Math.min(scenes.maxSignal, emotionalCores.maxSignal);

  return {
    version: MOYU_SEMANTIC_VERSION,
    scenes: scenes.labels,
    emotionalCores: emotionalCores.labels,
    psychologicalNeed: inferNeed(scenes.labels, emotionalCores.labels, activitySlug),
    literaryGesture: inferGesture(scenes.labels, emotionalCores.labels, activitySlug),
    energy: inferEnergy(scenes.labels, emotionalCores.labels, activitySlug),
    confidence: weakestSignal >= 2 ? "high" : weakestSignal >= 1 ? "medium" : "contextual",
  };
}

function inferEmotionalDefaults(
  scenes: Scene[],
  text: string,
  activitySlug: MoyuActivitySlug,
): [EmotionalCore, EmotionalCore] {
  if (scenes.includes("memory")) return ["longing", "belonging"];
  if (scenes.includes("home") || scenes.includes("companionship")) return ["tenderness", "belonging"];
  if (scenes.includes("spiritual")) return ["wonder", "serenity"];
  if (scenes.includes("journey")) return ["freedom", "resilience"];
  if (scenes.includes("solitude")) return ["serenity", "melancholy"];
  if (scenes.includes("threshold")) {
    return /autumn|night|dusk|old|秋|夜|暮|夕|otoño|otono|noche/iu.test(text)
      ? ["melancholy", "mortality"]
      : ["wonder", "serenity"];
  }
  if (scenes.includes("nature")) return ["wonder", "serenity"];
  if (scenes.includes("inner_world")) return ["longing", "serenity"];
  if (scenes.includes("human_world")) return ["resilience", "belonging"];
  return [...defaultsByActivity[activitySlug].emotionalCores];
}

export function semanticDimensionRefs(analysis: MoyuSemanticAnalysis) {
  return [
    ...analysis.scenes.map((value) => `scene:${value}`),
    ...analysis.emotionalCores.map((value) => `emotional_core:${value}`),
    `psychological_need:${analysis.psychologicalNeed}`,
    `literary_gesture:${analysis.literaryGesture}`,
    `energy:${analysis.energy}`,
  ];
}

export function scoreMoyuSemanticActivityFit(analysis: MoyuSemanticAnalysis, activitySlug: MoyuActivitySlug) {
  const preference = moyuSemanticPreferencesByActivity[activitySlug];
  return (
    overlapCount(analysis.scenes, preference.scene) * 8 +
    overlapCount(analysis.emotionalCores, preference.emotional_core) * 10 +
    Number(preference.psychological_need.includes(analysis.psychologicalNeed)) * 9 +
    Number(preference.literary_gesture.includes(analysis.literaryGesture)) * 6 +
    Number(preference.energy.includes(analysis.energy)) * 7
  );
}

function overlapCount(actual: readonly string[], desired: readonly string[]) {
  return actual.filter((value) => desired.includes(value)).length;
}

function rankLabels<T extends string>(
  text: string,
  signals: Record<T, RegExp>,
  defaults: readonly [T, T],
  limit: number,
) {
  const ranked = (Object.entries(signals) as Array<[T, RegExp]>)
    .map(([label, pattern]) => ({ label, score: Math.min(countSignalMatches(text, pattern), 6) }))
    .filter((entry) => entry.score > 0)
    .toSorted((left, right) => right.score - left.score || left.label.localeCompare(right.label));
  const primaryScore = ranked[0]?.score ?? 0;
  const labels = ranked
    .filter((entry, index) => index === 0 || entry.score >= Math.max(1, Math.ceil(primaryScore / 2)))
    .slice(0, limit)
    .map((entry) => entry.label);

  for (const fallback of defaults) {
    if (labels.length >= Math.max(1, limit - 1)) break;
    if (!labels.includes(fallback)) labels.push(fallback);
  }

  return { labels: labels.slice(0, limit), maxSignal: primaryScore };
}

function countSignalMatches(text: string, pattern: RegExp) {
  pattern.lastIndex = 0;
  return [...text.matchAll(pattern)].filter((match) => {
    if (/\p{Script=Han}/u.test(match[0])) return true;
    const start = match.index ?? 0;
    const before = start > 0 ? text[start - 1] ?? "" : "";
    const after = text[start + match[0].length] ?? "";
    return !/\p{L}/u.test(before) && !/\p{L}/u.test(after);
  }).length;
}

function inferNeed(scenes: Scene[], emotions: EmotionalCore[], activitySlug: MoyuActivitySlug): PsychologicalNeed {
  if (emotions.includes("melancholy")) return "comfort";
  if (emotions.includes("longing") || emotions.includes("belonging") || emotions.includes("tenderness")) return "connection";
  if (
    activitySlug === "drift" &&
    scenes.some((scene) => ["inner_world", "solitude", "spiritual"].includes(scene)) &&
    emotions.some((emotion) => ["serenity", "wonder"].includes(emotion))
  ) {
    return "permission";
  }
  if (
    activitySlug === "breathe" &&
    scenes.some((scene) => ["nature", "threshold"].includes(scene)) &&
    emotions.some((emotion) => ["wonder", "serenity", "relief", "freedom"].includes(emotion))
  ) {
    return "release";
  }
  if (emotions.includes("resilience")) return "courage";
  if (emotions.includes("mortality")) return "meaning";
  if (emotions.includes("relief") || emotions.includes("freedom")) return "release";
  if (emotions.includes("joy")) return "renewal";
  if (emotions.includes("wonder") || scenes.includes("spiritual")) return "perspective";
  if (emotions.includes("serenity")) return activitySlug === "drift" ? "permission" : "rest";
  return defaultsByActivity[activitySlug].need;
}

function inferGesture(scenes: Scene[], emotions: EmotionalCore[], activitySlug: MoyuActivitySlug): LiteraryGesture {
  if (emotions.includes("melancholy") || emotions.includes("longing")) return "accompany";
  if (
    activitySlug === "drift" &&
    scenes.some((scene) => ["inner_world", "solitude", "spiritual"].includes(scene)) &&
    emotions.some((emotion) => ["serenity", "wonder"].includes(emotion))
  ) {
    return "witness";
  }
  if (
    activitySlug === "breathe" &&
    scenes.some((scene) => ["nature", "threshold"].includes(scene)) &&
    emotions.some((emotion) => ["wonder", "serenity", "relief", "freedom"].includes(emotion))
  ) {
    return "open";
  }
  if (emotions.includes("resilience")) return "affirm";
  if (emotions.includes("mortality")) return "reframe";
  if (emotions.includes("wonder")) return "awaken";
  if (emotions.includes("relief")) return "open";
  if (emotions.includes("freedom") || emotions.includes("joy")) return "invite";
  if (emotions.includes("tenderness") || emotions.includes("belonging")) return "soothe";
  if (emotions.includes("serenity")) return activitySlug === "drift" ? "witness" : "soothe";
  return defaultsByActivity[activitySlug].gesture;
}

function inferEnergy(scenes: Scene[], emotions: EmotionalCore[], activitySlug: MoyuActivitySlug): Energy {
  if (emotions.includes("melancholy") || emotions.includes("longing") || emotions.includes("tenderness")) return "soft";
  if (
    activitySlug === "drift" &&
    scenes.some((scene) => ["inner_world", "solitude", "spiritual"].includes(scene))
  ) {
    return "still";
  }
  if (
    activitySlug === "breathe" &&
    scenes.some((scene) => ["nature", "threshold"].includes(scene)) &&
    emotions.some((emotion) => ["wonder", "serenity", "relief", "freedom"].includes(emotion))
  ) {
    return "open";
  }
  if (activitySlug === "stroll" && scenes.includes("journey")) return "flowing";
  if (emotions.includes("resilience")) return "grounded";
  if (emotions.includes("joy") || emotions.includes("wonder")) return "bright";
  if (emotions.includes("freedom") || emotions.includes("relief")) return activitySlug === "stroll" ? "flowing" : "open";
  if (emotions.includes("serenity") || emotions.includes("mortality")) return "still";
  return defaultsByActivity[activitySlug].energy;
}
