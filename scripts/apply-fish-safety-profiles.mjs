import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const catalogPath = path.join(process.cwd(), "src/lib/fish-species.json");
const reviewedAt = "2026-07-21";
const nationalListUrl =
  "https://www.forestry.gov.cn/sites/main/main/gov/content.jsp?TID=20210205122451967544533";
const citesApprovalUrl = "https://yyj.moa.gov.cn/gzdt/202112/t20211206_6383860.htm";
const citesAppendicesUrl = "https://www.forestry.gov.cn/u/cms/www/202603/07094239sawe.pdf";

const entries = JSON.parse(await fs.readFile(catalogPath, "utf8"));
const catalogSlugs = new Set(entries.map((entry) => entry.slug));

const nationalProtection = new Map([
  [
    "whale-shark",
    profile(
      "NATIONAL_II",
      "《国家重点保护野生动物名录》直接列为国家二级保护野生动物。",
      "国家林业和草原局、农业农村部公告2021年第3号",
      nationalListUrl,
    ),
  ],
  [
    "great-white-shark",
    profile(
      "NATIONAL_II",
      "《国家重点保护野生动物名录》直接列为国家二级保护野生动物。",
      "国家林业和草原局、农业农村部公告2021年第3号",
      nationalListUrl,
    ),
  ],
  [
    "spotted-seahorse",
    profile(
      "WILD_ONLY_NATIONAL_II",
      "海马属所有种被列为国家二级保护野生动物，仅限野外种群。",
      "国家林业和草原局、农业农村部公告2021年第3号",
      nationalListUrl,
    ),
  ],
  [
    "humphead-wrasse",
    profile(
      "WILD_ONLY_NATIONAL_II",
      "波纹唇鱼被列为国家二级保护野生动物，仅限野外种群。",
      "国家林业和草原局、农业农村部公告2021年第3号",
      nationalListUrl,
    ),
  ],
  [
    "white-cloud-minnow",
    profile(
      "WILD_ONLY_NATIONAL_II",
      "唐鱼被列为国家二级保护野生动物，仅限野外种群。",
      "国家林业和草原局、农业农村部公告2021年第3号",
      nationalListUrl,
    ),
  ],
  [
    "west-indian-coelacanth",
    profile(
      "CITES_APPROVED_I",
      "农业农村部公告第491号将矛尾鱼属所有种核准为按国家一级保护野生动物管理。",
      "农业农村部公告第491号",
      citesApprovalUrl,
    ),
  ],
  [
    "arapaima",
    profile(
      "CITES_APPROVED_II",
      "农业农村部公告第491号将巨巴西骨舌鱼核准为按国家二级保护野生动物管理。",
      "农业农村部公告第491号",
      citesApprovalUrl,
    ),
  ],
  [
    "mekong-giant-catfish",
    profile(
      "CITES_APPROVED_II",
      "农业农村部公告第491号将巨无齿𩷶核准为按国家二级保护野生动物管理。",
      "农业农村部公告第491号",
      citesApprovalUrl,
    ),
  ],
  [
    "european-sturgeon",
    profile(
      "WILD_ONLY_CITES_APPROVED_II",
      "农业农村部公告第491号将本种核准为按国家二级保护野生动物管理，仅限野外种群。",
      "农业农村部公告第491号",
      citesApprovalUrl,
    ),
  ],
  [
    "american-paddlefish",
    profile(
      "WILD_ONLY_CITES_APPROVED_II",
      "本种属于公告第491号的鲟形目核准范围，按国家二级保护野生动物管理，仅限野外种群。",
      "农业农村部公告第491号",
      citesApprovalUrl,
    ),
  ],
]);

const citesAppendixI = slugSet(`
  west-indian-coelacanth european-sturgeon mekong-giant-catfish
  largetooth-sawfish smalltooth-sawfish
`);

const citesAppendixII = slugSet(`
  whale-shark great-white-shark scalloped-hammerhead giant-manta-ray shortfin-mako
  tiger-shark bull-shark blacktip-reef-shark whitetip-reef-shark oceanic-whitetip-shark lemon-shark
  american-paddlefish arapaima european-eel humphead-wrasse spotted-seahorse
`);

const toxicityProfiles = new Map([
  ["red-lionfish", hazard("VENOMOUS", "背鳍、臀鳍和腹鳍毒棘可造成剧痛和全身反应；鱼肉并非因此有毒，但必须由熟悉结构的人去棘处理。")],
  ["foxface-rabbitfish", hazard("VENOMOUS", "背鳍、腹鳍和臀鳍硬棘带毒，活鱼或未处理整鱼可造成疼痛性刺伤。")],
  ["bluespotted-ribbontail-ray", hazard("VENOMOUS", "尾部毒棘可造成严重刺伤；危险来自尾棘，不等于肌肉组织有毒。")],
  ["southern-stingray", hazard("VENOMOUS", "尾部毒棘可造成严重刺伤；处理活体或整鱼时不要接近尾部。")],
  ["spotted-eagle-ray", hazard("VENOMOUS", "尾部具有一至多枚毒棘，刺伤可能严重；食用前须专业去棘处理。")],
  ["cownose-ray", hazard("VENOMOUS", "尾部毒棘可造成疼痛性伤害；危险主要发生在捕捞和处理阶段。")],
  ["long-spine-porcupinefish", hazard("TOXIC_TISSUE", "内脏、性腺和其他组织可能含河鲀毒素类神经毒素，普通烹调不能可靠去除，切勿自行加工食用。")],
  ["spotted-boxfish", hazard("TOXIC_TISSUE", "皮肤黏液可释放箱鲀毒素，且缺少可靠的家庭食用处理依据，不应自行试食。")],
  ["yellow-boxfish", hazard("TOXIC_TISSUE", "皮肤黏液可释放箱鲀毒素，且缺少可靠的家庭食用处理依据，不应自行试食。")],
  ["greenland-shark", hazard("TOXIC_TISSUE", "鲜肉含高水平三甲胺氧化物，未经长期规范处理可引起中毒，不适合家庭自行加工。")],
  ["electric-eel", hazard("ELECTRIC", "可产生强电击并导致跌倒、溺水或心肺风险；这属于活体接触危险，不是食源性毒素。")],
  ["marbled-electric-ray", hazard("ELECTRIC", "电器官可放电，处理活体时有电击风险；这不等于鱼肉含毒。")],
  ["alligator-gar", hazard("TOXIC_PART", "卵有毒，不可食用；鱼肉需去除卵和内脏后充分加热。")],
  ["common-carp", hazard("TOXIC_PART", "鱼肉可食，但鱼胆含耐热胆汁毒素，生熟均不可食用。")],
  ["grass-carp", hazard("TOXIC_PART", "鱼肉可食，但鱼胆含耐热胆汁毒素，生熟均不可食用。")],
  ["silver-carp", hazard("TOXIC_PART", "鱼肉可食，但鱼胆含耐热胆汁毒素，生熟均不可食用。")],
  ["bighead-carp", hazard("TOXIC_PART", "鱼肉可食，但鱼胆含耐热胆汁毒素，生熟均不可食用。")],
  ["black-carp", hazard("TOXIC_PART", "鱼肉可食，但鱼胆含耐热胆汁毒素，生熟均不可食用。")],
  ["european-eel", hazard("TOXIC_PART", "生血和未熟组织含热不稳定毒性蛋白；不可生食，必须彻底加热。")],
  ["japanese-eel", hazard("TOXIC_PART", "生血和未熟组织含热不稳定毒性蛋白；不可生食，必须彻底加热。")],
  ["american-eel", hazard("TOXIC_PART", "生血和未熟组织含热不稳定毒性蛋白；不可生食，必须彻底加热。")],
]);

const ciguateraRisk = slugSet(`
  blue-barred-parrotfish titan-triggerfish queen-triggerfish great-barracuda giant-trevally
  giant-moray giant-grouper northern-red-snapper humphead-wrasse
`);

for (const slug of ciguateraRisk) {
  toxicityProfiles.set(
    slug,
    hazard(
      "CIGUATERA_RISK",
      slug === "giant-moray"
        ? "大型热带礁区个体可能富集耐热雪卡毒素，且鳗形鱼生血也不宜接触或食用；来源不明时不要食用。"
        : "大型热带礁区个体可能经食物链富集耐热雪卡毒素，是否含毒无法凭外观或彻底加热判断。",
    ),
  );
}

const commonlyEdible = slugSet(`
  red-lionfish blue-barred-parrotfish titan-triggerfish great-barracuda giant-trevally wahoo mahi-mahi
  atlantic-bluefin-tuna swordfish sailfish atlantic-flyingfish alligator-gar american-paddlefish arapaima
  tambaqui common-carp grass-carp silver-carp bighead-carp black-carp mandarin-fish asian-swamp-eel pond-loach
  channel-catfish wels-catfish mekong-giant-catfish redtail-catfish rainbow-trout atlantic-salmon sockeye-salmon
  chinook-salmon brown-trout arctic-char northern-pike muskellunge largemouth-bass smallmouth-bass european-perch
  zander nile-tilapia atlantic-cod haddock pacific-halibut european-flounder european-plaice atlantic-mackerel
  atlantic-herring european-anchovy japanese-sardine angler atlantic-wolffish antarctic-toothfish foxface-rabbitfish
  queen-triggerfish cobia atlantic-bonito skipjack-tuna yellowfin-tuna albacore blue-marlin black-marlin white-marlin
  striped-marlin atlantic-pomfret tiger-shark bull-shark blacktip-reef-shark whitetip-reef-shark oceanic-whitetip-shark
  nurse-shark lemon-shark shortfin-mako bluespotted-ribbontail-ray southern-stingray spotted-eagle-ray cownose-ray
  european-eel japanese-eel american-eel giant-moray giant-gourami kissing-gourami northern-snakehead giant-snakehead
  burbot tench common-roach common-bream ide golden-mahseer pacific-cod alaska-pollock european-hake northern-red-snapper
  giant-grouper european-seabass gilthead-seabream red-seabream yellow-croaker large-yellow-croaker largehead-hairtail
  japanese-amberjack milkfish flathead-grey-mullet capelin greenland-halibut patagonian-toothfish sablefish orange-roughy
`);

const largePredatorFood = slugSet(`
  atlantic-bluefin-tuna swordfish sailfish yellowfin-tuna albacore blue-marlin black-marlin white-marlin striped-marlin
  tiger-shark bull-shark blacktip-reef-shark whitetip-reef-shark oceanic-whitetip-shark nurse-shark lemon-shark
  shortfin-mako antarctic-toothfish patagonian-toothfish orange-roughy
`);

const neverRecommend = new Map([
  ["long-spine-porcupinefish", "可能含强效神经毒素，且不在我国有条件放开的两种养殖河鲀产品范围内，勿自行加工或食用。"],
  ["spotted-boxfish", "皮肤黏液具有毒性且不是常规食用鱼，不建议食用。"],
  ["yellow-boxfish", "皮肤黏液具有毒性且不是常规食用鱼，不建议食用。"],
  ["greenland-shark", "鲜肉具有中毒风险，传统处理周期长且技术要求高，不建议自行食用。"],
  ["electric-eel", "活体有强电危险，也不是中国常规食用水产品，不建议自行捕捞或处理。"],
  ["marbled-electric-ray", "活体有电击风险，也不是中国常规食用水产品，不建议自行捕捞或处理。"],
]);

for (const set of [citesAppendixI, citesAppendixII, ciguateraRisk, commonlyEdible, largePredatorFood]) {
  assertKnownSlugs(set);
}
assertKnownSlugs(nationalProtection.keys());
assertKnownSlugs(toxicityProfiles.keys());
assertKnownSlugs(neverRecommend.keys());

for (const entry of entries) {
  const protection = nationalProtection.get(entry.slug) ??
    profile(
      "NONE",
      "未在2021年《国家重点保护野生动物名录》或农业农村部公告第491号已核准条目中命中；仍须遵守地方名录、禁渔期（区）和合法来源要求。",
      "国家重点保护野生动物名录（2021）及农业农村部公告第491号",
      nationalListUrl,
    );
  const citesAppendix = citesAppendixI.has(entry.slug) ? "I" : citesAppendixII.has(entry.slug) ? "II" : "NONE";
  const toxicity = toxicityProfiles.get(entry.slug) ??
    hazard(
      "NONE_KNOWN",
      "未见该物种以天然食源性毒素著称；这不等于可以生食，仍需防范寄生虫、细菌、过敏和环境污染物。",
    );
  const edibility = buildEdibility(entry.slug, protection.status, toxicity);

  Object.assign(entry, {
    chinaProtectionStatus: protection.status,
    chinaProtectionNote: protection.note,
    chinaProtectionBasis: protection.basis,
    chinaProtectionSourceUrl: protection.sourceUrl,
    citesAppendix,
    citesNote:
      citesAppendix === "NONE"
        ? "未在2026年3月5日起生效的CITES附录中命中；进出口时仍应复核后续修订和商品编码。"
        : `列入2026年3月5日起生效的CITES附录${citesAppendix}；跨境贸易及相关运输须遵守公约和中国进出口许可要求。`,
    citesSourceUrl: citesAppendicesUrl,
    threeHaveStatus: "NOT_APPLICABLE",
    threeHaveNote: "现行“三有”名录全称为《有重要生态、科学、社会价值的陆生野生动物名录》，鱼类属于水生动物，因此该项不适用。",
    toxicityStatus: toxicity.status,
    toxicityNote: toxicity.note,
    edibilityStatus: edibility.status,
    edibilityNote: edibility.note,
    legalReviewedAt: reviewedAt,
  });
}

await fs.writeFile(catalogPath, `${JSON.stringify(entries, null, 2)}\n`);

const nationalCount = entries.filter((entry) => entry.chinaProtectionStatus !== "NONE").length;
const citesCount = entries.filter((entry) => entry.citesAppendix !== "NONE").length;
console.log(`fish safety profiles: ${entries.length} records, ${nationalCount} national-managed, ${citesCount} CITES-listed`);

function buildEdibility(slug, protectionStatus, toxicity) {
  if (["NATIONAL_II", "CITES_APPROVED_I", "CITES_APPROVED_II"].includes(protectionStatus)) {
    return edible("LEGAL_PROHIBITED", "属于按国家重点保护野生动物管理的物种，不得作为食物食用；救护、科研等例外不构成餐饮来源。 ");
  }

  if (["WILD_ONLY_NATIONAL_II", "WILD_ONLY_CITES_APPROVED_II"].includes(protectionStatus)) {
    return edible(
      "WILD_ONLY_PROHIBITED",
      "野外种群禁止食用；人工繁育个体也必须核验许可、专用标识和可追溯来源，不能仅凭物种名称判断合法。",
    );
  }

  const never = neverRecommend.get(slug);
  if (never) return edible("NOT_RECOMMENDED", never);

  if (!commonlyEdible.has(slug)) {
    return edible(
      "NOT_RECOMMENDED",
      "不是中国常规食用水产品，缺少可靠的家庭加工与食用依据；不要自行捕捞、试毒或生食。",
    );
  }

  if (toxicity.status !== "NONE_KNOWN") {
    return edible("CONDITIONAL", `${toxicity.note} 仅选择合法、可追溯来源并由专业人员处理。`);
  }

  if (largePredatorFood.has(slug)) {
    return edible(
      "CONDITIONAL",
      "鱼肉可食，但大型肉食性鱼可能富集汞等污染物，不宜高频大量食用；孕妇、儿童等敏感人群应遵循当地膳食建议。",
    );
  }

  return edible(
    "EDIBLE",
    "鱼肉可食用；应选择合法、可追溯来源，冷藏保鲜并充分加热。可食用不等于允许自行捕捞。",
  );
}

function profile(status, note, basis, sourceUrl) {
  return { status, note, basis, sourceUrl };
}

function hazard(status, note) {
  return { status, note };
}

function edible(status, note) {
  return { status, note: note.trim() };
}

function slugSet(value) {
  return new Set(value.trim().split(/\s+/));
}

function assertKnownSlugs(slugs) {
  for (const slug of slugs) {
    if (!catalogSlugs.has(slug)) throw new Error(`Unknown fish slug in safety profile: ${slug}`);
  }
}
