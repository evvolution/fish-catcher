import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const REGION_SOURCE = "https://unpkg.com/chinese_regions@0.5.5/out/all.min.json";
const REGION_AUTHORITY_SOURCE = "https://www.mca.gov.cn/mzsj/xzqh/2025/202401xzqh.html";

const topCities = [
  [1, "shanghai", "上海市"],
  [2, "beijing", "北京市"],
  [3, "shenzhen", "深圳市"],
  [4, "chongqing", "重庆市"],
  [5, "guangzhou", "广州市"],
  [6, "suzhou", "苏州市"],
  [7, "chengdu", "成都市"],
  [8, "hangzhou", "杭州市"],
  [9, "wuhan", "武汉市"],
  [10, "nanjing", "南京市"],
  [11, "ningbo", "宁波市"],
  [12, "tianjin", "天津市"],
  [13, "qingdao", "青岛市"],
  [14, "wuxi", "无锡市"],
  [15, "changsha", "长沙市"],
  [16, "zhengzhou", "郑州市"],
  [17, "fuzhou", "福州市"],
  [18, "jinan", "济南市"],
  [18, "hefei", "合肥市"],
  [20, "xian", "西安市"],
  [21, "quanzhou", "泉州市"],
  [22, "foshan", "佛山市"],
  [23, "nantong", "南通市"],
  [24, "dongguan", "东莞市"],
  [25, "yantai", "烟台市"],
  [26, "changzhou", "常州市"],
  [27, "tangshan", "唐山市"],
  [28, "wenzhou", "温州市"],
  [29, "dalian", "大连市"],
  [30, "xuzhou", "徐州市"],
  [31, "shenyang", "沈阳市"],
  [32, "xiamen", "厦门市"],
  [33, "shaoxing", "绍兴市"],
  [34, "shijiazhuang", "石家庄市"],
  [35, "kunming", "昆明市"],
  [36, "weifang", "潍坊市"],
  [37, "nanchang", "南昌市"],
  [38, "yangzhou", "扬州市"],
  [39, "yancheng", "盐城市"],
  [40, "changchun", "长春市"],
  [41, "jiaxing", "嘉兴市"],
  [42, "yulin", "榆林市"],
  [43, "jinhua", "金华市"],
  [44, "taizhou-js", "泰州市"],
  [45, "taizhou-zj", "台州市"],
  [46, "linyi", "临沂市"],
  [47, "yichang", "宜昌市"],
  [48, "huizhou", "惠州市"],
  [49, "nanning", "南宁市"],
  [50, "harbin", "哈尔滨市"],
];

const cityFoods = {
  shanghai: [["生煎包", "份", 600], ["排骨年糕", "份", 1800]],
  beijing: [["炸酱面", "碗", 1800], ["豆汁焦圈", "套", 1000]],
  shenzhen: [["光明乳鸽", "只", 3800], ["沙井蚝烙", "份", 2600]],
  chongqing: [["重庆小面", "碗", 1200], ["酸辣粉", "碗", 1000]],
  guangzhou: [["猪脚饭", "份", 1800], ["肠粉", "份", 900]],
  suzhou: [["苏式汤面", "碗", 1800], ["海棠糕", "个", 800]],
  chengdu: [["钟水饺", "份", 1600], ["肥肠粉", "碗", 1500]],
  hangzhou: [["葱包桧", "份", 800], ["片儿川", "碗", 2200]],
  wuhan: [["热干面", "碗", 800], ["米酒", "瓶", 600]],
  nanjing: [["鸭血粉丝汤", "碗", 1800], ["牛肉锅贴", "份", 1400]],
  ningbo: [["宁波汤圆", "碗", 1200], ["仓桥面结", "碗", 1600]],
  tianjin: [["煎饼果子", "套", 900], ["锅巴菜", "碗", 1000]],
  qingdao: [["鲅鱼水饺", "份", 2200], ["排骨米饭", "份", 1800]],
  wuxi: [["小笼馒头", "笼", 1600], ["玉兰饼", "个", 800]],
  changsha: [["长沙米粉", "碗", 1200], ["糖油粑粑", "份", 800]],
  zhengzhou: [["胡辣汤", "碗", 900], ["烩面", "碗", 1800]],
  fuzhou: [["鱼丸", "碗", 1200], ["肉燕", "碗", 1500]],
  jinan: [["甜沫", "碗", 700], ["把子肉", "份", 1800]],
  hefei: [["鸭油烧饼", "个", 600], ["三河米饺", "份", 1000]],
  xian: [["肉夹馍", "个", 1200], ["凉皮", "份", 1000]],
  quanzhou: [["面线糊", "碗", 1000], ["土笋冻", "份", 1600]],
  foshan: [["双皮奶", "碗", 1200], ["陈村粉", "份", 1500]],
  nantong: [["曹公面", "碗", 1600], ["蟹黄包", "笼", 2200]],
  dongguan: [["濑粉", "碗", 1400], ["糖不甩", "份", 1000]],
  yantai: [["蓬莱小面", "碗", 1000], ["焖子", "份", 1200]],
  changzhou: [["银丝面", "碗", 1200], ["萝卜干炒饭", "份", 1400]],
  tangshan: [["棋子烧饼", "份", 1000], ["饹馇", "份", 1200]],
  wenzhou: [["糯米饭", "份", 1000], ["鱼丸汤", "碗", 1600]],
  dalian: [["海菜包子", "份", 1400], ["炒焖子", "份", 1200]],
  xuzhou: [["饣它汤", "碗", 800], ["烙馍卷馓子", "份", 1400]],
  shenyang: [["鸡架", "份", 1400], ["老边饺子", "份", 2200]],
  xiamen: [["沙茶面", "碗", 1800], ["土笋冻", "份", 1600]],
  shaoxing: [["臭豆腐", "份", 1000], ["茴香豆", "碟", 800]],
  shijiazhuang: [["牛肉罩饼", "碗", 1800], ["缸炉烧饼", "个", 700]],
  kunming: [["小锅米线", "碗", 1400], ["玫瑰鲜花饼", "个", 800]],
  weifang: [["肉火烧", "个", 1000], ["朝天锅", "份", 2200]],
  nanchang: [["南昌拌粉", "碗", 800], ["瓦罐汤", "罐", 1000]],
  yangzhou: [["扬州炒饭", "份", 1800], ["三丁包", "份", 1000]],
  yancheng: [["鱼汤面", "碗", 1400], ["藕粉圆", "碗", 1000]],
  changchun: [["熏肉大饼", "份", 1600], ["雪衣豆沙", "份", 1800]],
  jiaxing: [["鲜肉粽", "只", 900], ["南湖菱粉糕", "份", 1000]],
  yulin: [["羊杂碎", "碗", 1600], ["拼三鲜", "份", 2200]],
  jinhua: [["金华酥饼", "个", 700], ["兰溪鸡子馃", "个", 1200]],
  "taizhou-js": [["靖江蟹黄汤包", "笼", 2600], ["泰州干丝", "份", 1200]],
  "taizhou-zj": [["食饼筒", "个", 1400], ["姜汤面", "碗", 1600]],
  linyi: [["糁", "碗", 800], ["沂蒙煎饼", "份", 700]],
  yichang: [["萝卜饺子", "份", 800], ["凉虾", "碗", 700]],
  huizhou: [["横沥汤粉", "碗", 1400], ["阿嬷叫", "份", 800]],
  nanning: [["老友粉", "碗", 1200], ["卷筒粉", "份", 900]],
  harbin: [["哈尔滨红肠", "份", 1800], ["锅包肉", "份", 2800]],
};

const response = await fetch(REGION_SOURCE);
if (!response.ok) throw new Error(`Region source returned ${response.status}`);
const source = await response.json();

const provincesByCode = new Map(source.province.map((province) => [province.code, province]));
const rankedCitiesByName = new Map(topCities.map(([rank, slug, officialName]) => [officialName, { rank, slug }]));

const cities = source.city.map((city) => {
  const province = provincesByCode.get(city.p_code);
  if (!province) throw new Error(`Missing province for: ${city.name}`);
  const rankedCity = rankedCitiesByName.get(city.name);
  const slug = rankedCity?.slug ?? `region-${city.code}`;

  let districts = source.county
    .filter((county) => county.c_code === city.code)
    .map((county) => ({ code: String(county.code), name: county.name }));
  if (slug === "chongqing") {
    districts = districts
      .filter((district) => !["500105", "500112"].includes(district.code))
      .concat({ code: "500157", name: "两江新区" });
  }
  // ponytail: direct-admin prefectures such as Dongguan have no county layer; keep the city code until town data is added.
  if (!districts.length) districts = [{ code: String(city.code), name: "市辖镇街" }];

  return {
    rank: rankedCity?.rank ?? null,
    slug,
    code: String(city.code),
    name: city.name.replace(/市$/, ""),
    officialName: city.name,
    provinceCode: String(province.code),
    provinceName: province.name,
    districts,
  };
});

const regions = source.province.map((province) => ({
    code: String(province.code),
    name: province.name,
  })).sort((left, right) => Number(left.code) - Number(right.code));

const foods = Object.entries(cityFoods).map(([citySlug, entries]) => ({
  citySlug,
  items: entries.map(([name, unit, priceCents]) => ({ name, unit, priceCents })),
}));

if (regions.length !== 34 || cities.length !== source.city.length || foods.length !== 50 || foods.flatMap((city) => city.items).length !== 100) {
  throw new Error("Regional catalog must contain nationwide divisions, 50 ranked food cities, and 100 local foods");
}

const output = {
  meta: {
    catalogVersion: "2026-07-21",
    administrativeScope: "全国省级、地级、县级行政区划",
    gdpYear: 2025,
    regionSource: REGION_SOURCE,
    regionAuthoritySource: REGION_AUTHORITY_SOURCE,
    regionSourceUpdatedAt: "2026-02-20",
    regionOverrides: ["https://mzj.cq.gov.cn/zwgk_218/zfxxgkml/tzgg/202512/t20251205_15215632.html"],
    gdpSource: "https://finance.sina.com.cn/roll/2026-02-14/doc-inhmtwhu2412359.shtml",
  },
  regions,
  cities,
  foods,
  genericFoods: [
    { name: "饭团", unit: "个", priceCents: 700 },
    { name: "包子", unit: "个", priceCents: 300 },
    { name: "豆浆", unit: "杯", priceCents: 400 },
    { name: "可乐", unit: "瓶", priceCents: 400 },
  ],
};

const target = path.join(process.cwd(), "public/assets/data/regional-catalog.json");
await mkdir(path.dirname(target), { recursive: true });
await writeFile(target, `${JSON.stringify(output, null, 2)}\n`, "utf8");
console.log(`Wrote ${target}: ${regions.length} provinces, ${cities.length} cities, ${cities.flatMap((city) => city.districts).length} districts, ${foods.flatMap((city) => city.items).length} local foods`);
