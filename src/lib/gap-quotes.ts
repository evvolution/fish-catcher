import { analyzeGapSemantics, semanticDimensionRefs } from "@/lib/gap-semantics";

export type GapQuoteSeed = {
  slug: string;
  kind: "RESULT" | "CARD";
  title: string;
  content: string;
  activitySlug: "drift" | "tea" | "breathe" | "stroll";
  notes: string;
  dropRate?: number;
  dimensions: string[];
};

const ctext = "原文核对：中国哲学书电子化计划 https://ctext.org/";
const wikisource = "原文核对：维基文库 https://zh.wikisource.org/";

// ponytail: 这批内容只收录公版古典原句；升级路径是后台导入已购授权的现代语料。
export const gapQuoteSeeds: GapQuoteSeed[] = [
  quote("drift-01", "RESULT", "《庄子·齐物论》", "天地与我并生，而万物与我为一。", "drift", ctext, "glow"),
  quote("drift-02", "RESULT", "《庄子·天下》", "独与天地精神往来。", "drift", ctext, "glow"),
  quote("drift-03", "RESULT", "《道德经》", "致虚极，守静笃。", "drift", ctext, "ordinary"),
  quote("drift-04", "RESULT", "《道德经》", "万物并作，吾以观复。", "drift", ctext, "ordinary"),
  quote("drift-05", "RESULT", "《道德经》", "大音希声，大象无形。", "drift", ctext, "glow"),
  quote("drift-06", "RESULT", "陶渊明《饮酒·其五》", "采菊东篱下，悠然见南山。", "drift", wikisource, "ordinary"),
  quote("drift-07", "RESULT", "陶渊明《饮酒·其五》", "此中有真意，欲辨已忘言。", "drift", wikisource, "glow"),
  quote("drift-08", "RESULT", "王维《终南别业》", "行到水穷处，坐看云起时。", "drift", wikisource, "glow"),
  quote("drift-09", "RESULT", "王维《鸟鸣涧》", "人闲桂花落，夜静春山空。", "drift", wikisource, "ordinary"),
  quote("drift-10", "RESULT", "王维《鸟鸣涧》", "月出惊山鸟，时鸣春涧中。", "drift", wikisource, "ordinary"),
  quote("drift-11", "CARD", "《庄子·人间世》", "虚室生白，吉祥止止。", "drift", ctext, "glow"),
  quote("drift-12", "CARD", "《庄子·人间世》", "乘物以游心。", "drift", ctext, "ordinary"),
  quote("drift-13", "CARD", "《庄子·天道》", "朴素而天下莫能与之争美。", "drift", ctext, "glow"),
  quote("drift-14", "CARD", "《道德经》", "不出户，知天下；不窥牖，见天道。", "drift", ctext, "ordinary"),
  quote("drift-15", "CARD", "《道德经》", "知者不言，言者不知。", "drift", ctext, "ordinary"),
  quote("drift-16", "CARD", "王维《鹿柴》", "空山不见人，但闻人语响。", "drift", wikisource, "ordinary"),
  quote("drift-17", "CARD", "王维《竹里馆》", "深林人不知，明月来相照。", "drift", wikisource, "glow"),
  quote("drift-18", "CARD", "王维《终南别业》", "偶然值林叟，谈笑无还期。", "drift", wikisource, "ordinary"),
  quote("drift-19", "CARD", "陶渊明《饮酒·其五》", "结庐在人境，而无车马喧。", "drift", wikisource, "ordinary"),
  quote("drift-20", "CARD", "陶渊明《饮酒·其五》", "山气日夕佳，飞鸟相与还。", "drift", wikisource, "glow"),

  quote("tea-01", "RESULT", "苏轼《望江南·超然台作》", "且将新火试新茶，诗酒趁年华。", "tea", wikisource, "glow"),
  quote("tea-02", "RESULT", "杜耒《寒夜》", "寒夜客来茶当酒，竹炉汤沸火初红。", "tea", wikisource, "ordinary"),
  quote("tea-03", "RESULT", "白居易《山泉煎茶有怀》", "无由持一碗，寄与爱茶人。", "tea", wikisource, "ordinary"),
  quote("tea-04", "RESULT", "白居易《山泉煎茶有怀》", "坐酌泠泠水，看煎瑟瑟尘。", "tea", wikisource, "ordinary"),
  quote("tea-05", "RESULT", "陆游《临安春雨初霁》", "矮纸斜行闲作草，晴窗细乳戏分茶。", "tea", wikisource, "glow"),
  quote("tea-06", "RESULT", "苏轼《浣溪沙》", "酒困路长惟欲睡，日高人渴漫思茶。", "tea", wikisource, "ordinary"),
  quote("tea-07", "RESULT", "张可久《人月圆·山中书事》", "松花酿酒，春水煎茶。", "tea", wikisource, "glow"),
  quote("tea-08", "RESULT", "钱起《与赵莒茶宴》", "竹下忘言对紫茶，全胜羽客醉流霞。", "tea", wikisource, "ordinary"),
  quote("tea-09", "RESULT", "纳兰性德《浣溪沙》", "被酒莫惊春睡重，赌书消得泼茶香。", "tea", wikisource, "glow"),
  quote("tea-10", "RESULT", "白居易《问刘十九》", "晚来天欲雪，能饮一杯无？", "tea", wikisource, "ordinary"),
  quote("tea-11", "CARD", "白居易《问刘十九》", "绿蚁新醅酒，红泥小火炉。", "tea", wikisource, "ordinary"),
  quote("tea-12", "CARD", "陶渊明《归去来兮辞》", "倚南窗以寄傲，审容膝之易安。", "tea", wikisource, "glow"),
  quote("tea-13", "CARD", "陶渊明《归去来兮辞》", "引壶觞以自酌，眄庭柯以怡颜。", "tea", wikisource, "ordinary"),
  quote("tea-14", "CARD", "陶渊明《归去来兮辞》", "悦亲戚之情话，乐琴书以消忧。", "tea", wikisource, "glow"),
  quote("tea-15", "CARD", "杜耒《寒夜》", "寻常一样窗前月，才有梅花便不同。", "tea", wikisource, "ordinary"),
  quote("tea-16", "CARD", "陆游《幽居初夏》", "叹息老来交旧尽，睡来谁共午瓯茶。", "tea", wikisource, "ordinary"),
  quote("tea-17", "CARD", "查为仁《莲坡诗话》", "竹雨松风琴韵，茶烟梧月书声。", "tea", wikisource, "glow"),
  quote("tea-18", "CARD", "苏轼《望江南·超然台作》", "休对故人思故国，且将新火试新茶。", "tea", wikisource, "ordinary"),
  quote("tea-19", "CARD", "苏轼《定风波》", "回首向来萧瑟处，归去，也无风雨也无晴。", "tea", wikisource, "glow"),
  quote("tea-20", "CARD", "苏轼《浣溪沙》", "人间有味是清欢。", "tea", wikisource, "glow"),

  quote("breathe-01", "RESULT", "《庄子·知北游》", "天地有大美而不言。", "breathe", ctext, "glow"),
  quote("breathe-02", "RESULT", "孟浩然《宿建德江》", "野旷天低树，江清月近人。", "breathe", wikisource, "ordinary"),
  quote("breathe-03", "RESULT", "王维《汉江临泛》", "江流天地外，山色有无中。", "breathe", wikisource, "glow"),
  quote("breathe-04", "RESULT", "王维《山居秋暝》", "明月松间照，清泉石上流。", "breathe", wikisource, "ordinary"),
  quote("breathe-05", "RESULT", "陶渊明《归去来兮辞》", "云无心以出岫，鸟倦飞而知还。", "breathe", wikisource, "glow"),
  quote("breathe-06", "RESULT", "陶渊明《归去来兮辞》", "木欣欣以向荣，泉涓涓而始流。", "breathe", wikisource, "ordinary"),
  quote("breathe-07", "RESULT", "谢朓《晚登三山还望京邑》", "余霞散成绮，澄江静如练。", "breathe", wikisource, "glow"),
  quote("breathe-08", "RESULT", "王维《终南山》", "白云回望合，青霭入看无。", "breathe", wikisource, "ordinary"),
  quote("breathe-09", "RESULT", "王勃《滕王阁序》", "落霞与孤鹜齐飞，秋水共长天一色。", "breathe", wikisource, "glow"),
  quote("breathe-10", "RESULT", "杜甫《水槛遣心》", "细雨鱼儿出，微风燕子斜。", "breathe", wikisource, "ordinary"),
  quote("breathe-11", "CARD", "杜甫《江亭》", "水流心不竞，云在意俱迟。", "breathe", wikisource, "glow"),
  quote("breathe-12", "CARD", "韦庄《菩萨蛮》", "春水碧于天，画船听雨眠。", "breathe", wikisource, "ordinary"),
  quote("breathe-13", "CARD", "辛弃疾《西江月·夜行黄沙道中》", "明月别枝惊鹊，清风半夜鸣蝉。", "breathe", wikisource, "ordinary"),
  quote("breathe-14", "CARD", "王维《秋夜独坐》", "雨中山果落，灯下草虫鸣。", "breathe", wikisource, "glow"),
  quote("breathe-15", "CARD", "张孝祥《念奴娇·过洞庭》", "素月分辉，明河共影，表里俱澄澈。", "breathe", wikisource, "glow"),
  quote("breathe-16", "CARD", "苏轼《前赤壁赋》", "清风徐来，水波不兴。", "breathe", wikisource, "ordinary"),
  quote("breathe-17", "CARD", "苏轼《前赤壁赋》", "浩浩乎如冯虚御风，而不知其所止。", "breathe", wikisource, "glow"),
  quote("breathe-18", "CARD", "苏轼《记承天寺夜游》", "庭下如积水空明，水中藻荇交横。", "breathe", wikisource, "ordinary"),
  quote("breathe-19", "CARD", "范仲淹《岳阳楼记》", "长烟一空，皓月千里，浮光跃金，静影沉璧。", "breathe", wikisource, "glow"),
  quote("breathe-20", "CARD", "《道德经》", "飘风不终朝，骤雨不终日。", "breathe", ctext, "ordinary"),

  quote("stroll-01", "RESULT", "苏轼《定风波》", "莫听穿林打叶声，何妨吟啸且徐行。", "stroll", wikisource, "glow"),
  quote("stroll-02", "RESULT", "苏轼《定风波》", "竹杖芒鞋轻胜马，谁怕？一蓑烟雨任平生。", "stroll", wikisource, "glow"),
  quote("stroll-03", "RESULT", "陆游《游山西村》", "山重水复疑无路，柳暗花明又一村。", "stroll", wikisource, "ordinary"),
  quote("stroll-04", "RESULT", "常建《题破山寺后禅院》", "曲径通幽处，禅房花木深。", "stroll", wikisource, "ordinary"),
  quote("stroll-05", "RESULT", "王籍《入若耶溪》", "蝉噪林逾静，鸟鸣山更幽。", "stroll", wikisource, "glow"),
  quote("stroll-06", "RESULT", "王维《归嵩山作》", "流水如有意，暮禽相与还。", "stroll", wikisource, "ordinary"),
  quote("stroll-07", "RESULT", "孟浩然《过故人庄》", "绿树村边合，青山郭外斜。", "stroll", wikisource, "ordinary"),
  quote("stroll-08", "RESULT", "杨万里《宿新市徐公店》", "儿童急走追黄蝶，飞入菜花无处寻。", "stroll", wikisource, "ordinary"),
  quote("stroll-09", "RESULT", "辛弃疾《鹧鸪天·博山寺作》", "一松一竹真朋友，山鸟山花好弟兄。", "stroll", wikisource, "glow"),
  quote("stroll-10", "RESULT", "白居易《钱塘湖春行》", "最爱湖东行不足，绿杨阴里白沙堤。", "stroll", wikisource, "ordinary"),
  quote("stroll-11", "CARD", "陶渊明《归园田居·其一》", "久在樊笼里，复得返自然。", "stroll", wikisource, "glow"),
  quote("stroll-12", "CARD", "陶渊明《归园田居·其一》", "开荒南野际，守拙归园田。", "stroll", wikisource, "ordinary"),
  quote("stroll-13", "CARD", "王士祯《题秋江独钓图》", "一蓑一笠一扁舟，一丈丝纶一寸钩。", "stroll", wikisource, "ordinary"),
  quote("stroll-14", "CARD", "贺铸《青玉案》", "一川烟草，满城风絮，梅子黄时雨。", "stroll", wikisource, "glow"),
  quote("stroll-15", "CARD", "朱熹《观书有感·其二》", "向来枉费推移力，此日中流自在行。", "stroll", wikisource, "glow"),
  quote("stroll-16", "CARD", "苏轼《临江仙·送钱穆父》", "人生如逆旅，我亦是行人。", "stroll", wikisource, "ordinary"),
  quote("stroll-17", "CARD", "苏轼《水调歌头·黄州快哉亭赠张偓佺》", "一点浩然气，千里快哉风。", "stroll", wikisource, "glow"),
  quote("stroll-18", "CARD", "辛弃疾《西江月·遣兴》", "昨夜松边醉倒，问松我醉何如。", "stroll", wikisource, "ordinary"),
  quote("stroll-19", "CARD", "杨万里《闲居初夏午睡起》", "日长睡起无情思，闲看儿童捉柳花。", "stroll", wikisource, "ordinary"),
  quote("stroll-20", "CARD", "欧阳修《丰乐亭游春》", "游人不管春将老，来往亭前踏落花。", "stroll", wikisource, "glow"),
];

function quote(
  id: string,
  kind: "RESULT" | "CARD",
  title: string,
  content: string,
  activitySlug: GapQuoteSeed["activitySlug"],
  notes: string,
  rarity: "ordinary" | "glow",
): GapQuoteSeed {
  const moodByActivity = {
    drift: "wander",
    tea: "gather",
    breathe: "breathe",
    stroll: "reset",
  } as const;

  const semantics = analyzeGapSemantics({ content, title, activitySlug });

  return {
    slug: `quote-${id}`,
    kind,
    title,
    content,
    activitySlug,
    notes,
    dropRate: kind === "CARD" ? (rarity === "glow" ? 16 : 24) : undefined,
    dimensions: [
      rarity === "glow" ? "style:tender" : "style:lucid",
      `mood:${moodByActivity[activitySlug]}`,
      ...(kind === "CARD" ? [`card_rarity:${rarity}`] : []),
      ...semanticDimensionRefs(semantics),
    ],
  };
}
