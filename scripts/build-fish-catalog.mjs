import { execFile } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { promisify } from "node:util";

import sharp from "sharp";

const projectRoot = process.cwd();
const assetDirectory = path.join(projectRoot, "oss-upload/fish/assets/fishes");
const catalogPath = path.join(projectRoot, "src/lib/fish-species.json");
const refresh = process.argv.includes("--refresh");
const preferFishBase = process.argv.includes("--prefer-fishbase");
const refreshSlugs = new Set(
  process.argv.find((argument) => argument.startsWith("--refresh="))?.slice("--refresh=".length).split(",") ?? [],
);
const userAgent = "FishCatcher/1.0 (https://github.com/evvolution/fish-catcher; local catalog builder)";
const requestIntervalMs = 450;
let nextRequestAt = 0;
const execFileAsync = promisify(execFile);
const backgroundRemovalSource = path.join(projectRoot, "scripts/remove-fish-background.swift");
const backgroundRemovalBinary = path.join(os.tmpdir(), "fish-catcher-remove-background");
let backgroundRemovalReady;

const preferredImageTitles = new Map([
  ["Acanthocybium solandri", "File:Acanthocybium solandri (Cuvier, 1832).jpg"],
  ["Coryphaena hippurus", "File:Dolphinfish (Coryphaena hippurus).jpg"],
  ["Xiphias gladius", "File:Xiphias gladius1.jpg"],
  ["Danio rerio", "File:Zebrafisch.jpg"],
  ["Hypophthalmichthys nobilis", "File:Bighead Carp Juvenile (Hypophthalmichthys nobilis) (1) (51222514651).jpg"],
  ["Siniperca chuatsi", "File:Siniperca chuatsi.jpg"],
  ["Oreochromis niloticus", "File:Tilapia del Nilo (Oreochromis niloticus), cenote El Pit, Yucatán, México, 2025-12-23, DD 02.jpg"],
  ["Psychrolutes marcidus", "File:Two Psychrolutes marcidus.jpg"],
  ["Pethia titteya", "File:Puntius titteya.JPG"],
  ["Macropinna microstoma", "File:Macropinna microstoma illustration.png"],
  ["Amphiprion percula", "File:Amphiprion percula 1.jpg"],
  ["Larimichthys polyactis", "File:Small yellow croaker.jpg"],
  ["Larimichthys crocea", "File:Larimichthys crocea (10.3897-zoologia.35.e25171) Figure 1.jpg"],
  ["Chanos chanos", "File:Poisson lait (Chanos chanos) (Ifremer 00763-87541).jpg"],
  ["Mallotus villosus", "File:Mallotus villosus.jpg"],
  ["Reinhardtius hippoglossoides", "File:Reinhardtius hippoglossoides.jpg"],
  ["Hoplostethus atlanticus", "File:Orange roughy.png"],
  ["Chlamydoselachus anguineus", "File:Chlamydoselachus anguineus NOOA.jpg"],
  ["Mitsukurina owstoni", "File:Mitsukurina owstoni, Pengo.jpg"],
]);

const preferredDirectImages = new Map([
  ["Labroides dimidiatus", directFishBaseImage("Ladim_j0.jpg", "Labroides", "dimidiatus", "Field, R.")],
  ["Larimichthys polyactis", directFishBaseImage("Lapol_u7.jpg", "Larimichthys", "polyactis", "Yau, B.")],
  ["Larimichthys crocea", directFishBaseImage("Lacro_u1.jpg", "Larimichthys", "crocea", "Lai, N.-W.")],
  ["Mallotus villosus", directFishBaseImage("Mavil_f0.jpg", "Mallotus", "villosus", "Armesto, A.")],
]);

const speciesSeeds = [
  fish("ocellaris-clownfish", "公子小丑鱼", "Ocellaris clownfish", "Amphiprion ocellaris", "珊瑚礁", "与海葵共生，常以小群守在宿主周围，摄食浮游动物和藻类。", "东印度洋至西太平洋的浅海珊瑚礁。", "借海葵触手安家的橙白色小鱼。"),
  fish("blue-tang", "蓝倒吊", "Blue tang", "Paracanthurus hepatus", "珊瑚礁", "白天结群啃食藻类，受惊时会钻入珊瑚缝隙并竖起尾柄棘。", "印度洋—太平洋热带珊瑚礁。", "以亮蓝身体和黄色尾鳍闻名的刺尾鱼。"),
  fish("yellow-tang", "黄高鳍刺尾鱼", "Yellow tang", "Zebrasoma flavescens", "珊瑚礁", "日间沿礁面刮食丝状藻，夜间躲入岩缝并让体色变暗。", "中西太平洋，夏威夷群岛尤其常见。", "通体明黄、擅长清理礁石藻类的鱼。"),
  fish("emperor-angelfish", "主刺盖鱼", "Emperor angelfish", "Pomacanthus imperator", "珊瑚礁", "多独居或成对活动，以海绵、被囊动物和少量藻类为食。", "红海、印度洋至太平洋热带礁区。", "幼鱼与成鱼花纹截然不同的大型神仙鱼。"),
  fish("moorish-idol", "镰鱼", "Moorish idol", "Zanclus cornutus", "珊瑚礁", "常成对巡游礁坡，以海绵和附着生物为食，游动范围较大。", "热带印度洋和太平洋。", "有黑白黄条纹与长背鳍丝的礁区鱼。"),
  fish("mandarinfish", "花斑连鳍䲗", "Mandarinfish", "Synchiropus splendidus", "珊瑚礁", "黄昏最活跃，在碎珊瑚间缓慢觅食小型甲壳动物，繁殖时成对上浮。", "西太平洋，从菲律宾到澳大利亚北部。", "体表像彩绘织锦的小型底栖鱼。"),
  fish("red-lionfish", "魔鬼蓑鲉", "Red lionfish", "Pterois volitans", "珊瑚礁", "伏击小鱼和甲壳动物，张开大胸鳍围堵猎物，背鳍棘带毒。", "原产印度洋—太平洋，已入侵西大西洋。", "外形华丽却带有毒棘的礁区捕食者。"),
  fish("blue-barred-parrotfish", "青点鹦嘴鱼", "Blue-barred parrotfish", "Scarus ghobban", "珊瑚礁", "用喙状齿刮取礁面藻类，咬碎珊瑚基质并产生细沙。", "印度洋—太平洋及东太平洋热带海域。", "能把礁石慢慢咬成沙的鹦嘴鱼。"),
  fish("threadfin-butterflyfish", "丝蝴蝶鱼", "Threadfin butterflyfish", "Chaetodon auriga", "珊瑚礁", "常成对觅食珊瑚虫、小型无脊椎动物和藻类，对领地较敏感。", "红海至中太平洋热带礁区。", "尾部黑眼斑能迷惑捕食者的蝴蝶鱼。"),
  fish("longfin-bannerfish", "马夫鱼", "Longfin bannerfish", "Heniochus acuminatus", "珊瑚礁", "常成群在礁缘活动，以浮游动物和底栖小动物为食。", "印度洋—西太平洋。", "背鳍像白色长旗一样飘动的鱼。"),
  fish("bluestreak-cleaner-wrasse", "裂唇鱼", "Bluestreak cleaner wrasse", "Labroides dimidiatus", "珊瑚礁", "经营固定清洁站，啄食其他鱼体表的寄生虫和坏死组织。", "红海、印度洋至西太平洋珊瑚礁。", "靠为大鱼清洁身体换取食物的小鱼。"),
  fish("royal-gramma", "皇家丝隆头鱼", "Royal gramma", "Gramma loreto", "珊瑚礁", "躲在洞穴和礁壁下方，常以腹部朝向基质，捕食微小浮游生物。", "加勒比海和西大西洋热带礁区。", "前紫后黄、喜欢倒悬在岩壁旁的小鱼。"),
  fish("banggai-cardinalfish", "考氏鳍竺鲷", "Banggai cardinalfish", "Pterapogon kauderni", "珊瑚礁", "小群栖息，常依附海胆长棘避敌，由雄鱼口孵鱼卵。", "印度尼西亚邦盖群岛狭小海域。", "分布极窄、由父亲含卵育幼的鱼。"),
  fish("orange-spotted-filefish", "长吻鼻鱼", "Orange-spotted filefish", "Oxymonacanthus longirostris", "珊瑚礁", "细长吻部专门啄食鹿角珊瑚息肉，通常成对活动。", "印度洋—西太平洋健康珊瑚礁。", "把珊瑚虫当主食的精细食客。"),
  fish("clown-triggerfish", "花斑拟鳞鲀", "Clown triggerfish", "Balistoides conspicillum", "珊瑚礁", "独居且有领地性，用强壮牙齿咬碎海胆、甲壳类和软体动物。", "印度洋—太平洋热带礁区。", "黑底白点、腹部黄斑醒目的大型鳞鲀。"),
  fish("titan-triggerfish", "褐拟鳞鲀", "Titan triggerfish", "Balistoides viridescens", "珊瑚礁", "翻动砂砾寻找无脊椎动物，繁殖季会猛烈守护扇形巢区。", "红海至中太平洋。", "体格强壮、护巢时格外警觉的鳞鲀。"),
  fish("long-spine-porcupinefish", "六斑二齿鲀", "Long-spine porcupinefish", "Diodon holocanthus", "珊瑚礁", "夜间捕食甲壳类和贝类，遇险会吞水膨胀并竖起长棘。", "全球热带和亚热带海域。", "能把自己鼓成带刺圆球的河豚近亲。"),
  fish("spotted-boxfish", "粒突箱鲀", "Spotted boxfish", "Ostracion meleagris", "珊瑚礁", "缓慢巡游礁面，吹开砂粒寻找底栖小动物，硬质骨甲保护身体。", "印度洋—太平洋热带海域。", "身体像硬盒、游姿轻缓的箱鲀。"),
  fish("leafy-seadragon", "叶海龙", "Leafy seadragon", "Phycodurus eques", "海草床", "靠叶片状附肢伪装，在海草间吸食糠虾，雄性携卵。", "澳大利亚南部温带近岸。", "看起来像一束漂流海藻的海龙。"),
  fish("common-seadragon", "草海龙", "Common seadragon", "Phyllopteryx taeniolatus", "海草床", "缓慢游动并依靠伪装接近小型甲壳动物，雄鱼在尾部孵卵。", "澳大利亚南部沿岸。", "身上带有海草状飘带的温带海龙。"),
  fish("spotted-seahorse", "三斑海马", "Spotted seahorse", "Hippocampus kuda", "海草床", "以卷曲尾巴固定在海草上，吸食浮游甲壳类，由雄性育儿袋孵幼。", "印度洋—西太平洋浅海、河口和海草床。", "能直立游泳并由雄性怀孕的海马。"),
  fish("ocean-sunfish", "翻车鱼", "Ocean sunfish", "Mola mola", "远洋", "随洋流巡游并潜入深水觅食水母和软体动物，也会到海面晒太阳。", "全球温带和热带海洋。", "成年后像一枚巨大圆盘的硬骨鱼。"),
  fish("great-barracuda", "大魣", "Great barracuda", "Sphyraena barracuda", "礁区与近海", "多单独伏击，凭爆发速度追捕鱼类，幼鱼常栖息红树林和海草床。", "全球热带和亚热带海域。", "牙齿锋利、起步迅猛的近海猎手。"),
  fish("giant-trevally", "无斑鲹", "Giant trevally", "Caranx ignobilis", "礁区与近海", "强势追逐鱼类和甲壳动物，也会利用礁岸浪涌协同捕猎。", "印度洋—太平洋热带和亚热带海域。", "礁区食物网顶层的高速鲹鱼。"),
  fish("wahoo", "刺鲅", "Wahoo", "Acanthocybium solandri", "远洋", "独游或小群高速巡航，以鲭鱼、飞鱼和鱿鱼为食。", "全球热带和亚热带外海。", "流线身体适合高速追猎的远洋鱼。"),
  fish("mahi-mahi", "鲯鳅", "Mahi-mahi", "Coryphaena hippurus", "远洋", "生长迅速，常追随漂浮物捕食飞鱼、鱿鱼和甲壳动物。", "全球热带、亚热带和暖温带外海。", "离水后会迅速褪色的蓝绿远洋鱼。"),
  fish("atlantic-bluefin-tuna", "大西洋蓝鳍金枪鱼", "Atlantic bluefin tuna", "Thunnus thynnus", "远洋", "持续高速洄游，能维持高于海水的体温并追捕群游鱼类。", "大西洋及地中海。", "横跨大洋、肌肉产热能力突出的金枪鱼。"),
  fish("swordfish", "剑鱼", "Swordfish", "Xiphias gladius", "远洋", "昼夜垂直迁移，以长吻击伤鱼群和鱿鱼，眼部有专门加热组织。", "全球热带至温带海洋。", "长着剑状上颌的深潜远洋猎手。"),
  fish("sailfish", "平鳍旗鱼", "Sailfish", "Istiophorus platypterus", "远洋", "展开巨大背鳍围拢小鱼，再用长吻快速拍击猎物。", "印度洋和太平洋热带、亚热带海域。", "背鳍像船帆、冲刺速度很快的旗鱼。"),
  fish("atlantic-flyingfish", "大西洋飞鱼", "Atlantic flyingfish", "Cheilopogon melanurus", "远洋表层", "受惊时高速冲出水面，以扩大的胸鳍滑翔逃避捕食者。", "大西洋热带和亚热带表层水域。", "能借风在海面上方滑翔数十米的鱼。"),
  fish("whale-shark", "鲸鲨", "Whale shark", "Rhincodon typus", "远洋与近海", "张口滤食浮游生物和小鱼，会随季节性食物聚集进行长距离迁移。", "全球热带和暖温带海域。", "现存体型最大的鱼类，却主要滤食微小生物。"),
  fish("great-white-shark", "大白鲨", "Great white shark", "Carcharodon carcharias", "近海与远洋", "依靠敏锐感官伏击鱼类和海兽，幼体与成体会进行跨洋迁移。", "全球温带及部分亚热带沿岸和外海。", "拥有锯齿状牙齿的大型恒温鲨鱼。"),
  fish("scalloped-hammerhead", "路氏双髻鲨", "Scalloped hammerhead", "Sphyrna lewini", "近海与远洋", "白天常在海山附近结群，夜间分散捕食鱼、鱿鱼和鳐。", "全球热带和暖温带海域。", "头部横展有助于感知电信号的鲨鱼。"),
  fish("zebra-shark", "豹纹鲨", "Zebra shark", "Stegostoma tigrinum", "珊瑚礁", "夜间贴着海底寻找贝类和甲壳动物，白天常停卧休息。", "印度洋—西太平洋热带浅海。", "幼鱼有条纹、成鱼变为斑点的底栖鲨。"),
  fish("giant-manta-ray", "双吻前口蝠鲼", "Giant oceanic manta ray", "Mobula birostris", "远洋与近海", "以头鳍引导水流滤食浮游生物，常到清洁站，也会远距离迁移。", "全球热带、亚热带及暖温带海域。", "翼展可达数米、以浮游生物为食的大型鳐。"),
  fish("bluespotted-ribbontail-ray", "蓝斑条尾魟", "Bluespotted ribbontail ray", "Taeniura lymma", "珊瑚礁", "白天躲在礁洞，涨潮时进入沙地捕食蠕虫、虾蟹和小鱼。", "印度洋—西太平洋热带礁区。", "背部布满电蓝色圆斑的小型魟鱼。"),
  fish("atlantic-tarpon", "大西洋大海鲢", "Atlantic tarpon", "Megalops atlanticus", "河口与近海", "会上浮吞气辅助呼吸，幼鱼利用缺氧湿地避开捕食者，成鱼洄游近海。", "大西洋两岸热带和亚热带水域。", "银色大鳞、能够直接吞咽空气的大鱼。"),
  fish("west-indian-coelacanth", "矛尾鱼", "West Indian Ocean coelacanth", "Latimeria chalumnae", "深海岩礁", "夜间离开洞穴缓慢漂游，依靠叶状偶鳍控制姿态并伏击猎物。", "西印度洋非洲东岸和科摩罗附近深水。", "曾被认为灭绝、保留古老体型特征的活化石。"),
  fish("arapaima", "巨骨舌鱼", "Arapaima", "Arapaima gigas", "热带河湖", "必须定期到水面呼吸空气，旱季在泛滥平原水体捕食鱼和小动物。", "南美洲亚马孙河流域。", "依靠空气呼吸生存的巨型淡水鱼。"),
  fish("alligator-gar", "鳄雀鳝", "Alligator gar", "Atractosteus spatula", "大型河湖", "伏击鱼类和水鸟，可用鳔呼吸空气，耐受低氧和一定盐度。", "北美洲密西西比河流域及墨西哥湾沿岸。", "长吻布满牙齿、覆盖硬质菱鳞的古老鱼。"),
  fish("european-sturgeon", "欧洲鲟", "European sturgeon", "Acipenser sturio", "河口与近海", "成鱼生活海中并溯河产卵，用口部触须在底层寻找无脊椎动物。", "欧洲大西洋沿岸，现存种群极为零散。", "生命周期连接海洋与河流的大型鲟鱼。"),
  fish("american-paddlefish", "美国匙吻鲟", "American paddlefish", "Polyodon spathula", "大型河流", "张口游泳滤食浮游动物，长吻分布电感受器帮助探测食物。", "北美洲密西西比河水系。", "拥有桨形长吻的滤食性淡水鱼。"),
  fish("bowfin", "弓鳍鱼", "Bowfin", "Amia calva", "沼泽与缓流", "伏击鱼类和甲壳动物，能利用血管丰富的鳔呼吸空气并耐受低氧。", "北美洲东部河湖和湿地。", "现生弓鳍鱼类唯一代表之一。"),
  fish("west-african-lungfish", "非洲肺鱼", "West African lungfish", "Protopterus annectens", "沼泽与河漫滩", "干季钻入泥中结茧夏眠，以肺呼吸，雨季恢复活动。", "西非和中非淡水流域。", "能在干泥中沉睡数月等待雨季的鱼。"),
  fish("electric-eel", "电鳗", "Electric eel", "Electrophorus electricus", "浑浊河流", "频繁上浮呼吸空气，用弱电导航和交流，也能释放强电制服猎物。", "南美洲圭亚那地盾北部水系。", "实际上属于裸背电鳗目而非真正鳗鱼。"),
  fish("red-bellied-piranha", "红腹食人鱼", "Red-bellied piranha", "Pygocentrus nattereri", "热带河湖", "常成群活动，以鱼、无脊椎动物和腐肉为食，也会摄食植物。", "南美洲亚马孙、巴拉圭等流域。", "红色腹部醒目、行为比传说更复杂的群游鱼。"),
  fish("tambaqui", "短盖巨脂鲤", "Tambaqui", "Colossoma macropomum", "泛滥森林", "洪水季进入森林吞食果实和种子，枯水季退回河道。", "南美洲亚马孙和奥里诺科流域。", "能帮助热带森林传播种子的巨型脂鲤。"),
  fish("silver-arowana", "双须骨舌鱼", "Silver arowana", "Osteoglossum bicirrhosum", "热带河流", "在水面下巡游，会跃出水面捕捉昆虫，由雄鱼口孵幼鱼。", "南美洲亚马孙、奥亚波克和鲁普努尼水系。", "像银色长带、善于跃水捕食的鱼。"),
  fish("red-discus", "盘丽鱼", "Red discus", "Symphysodon discus", "黑水河湾", "成对繁殖并照护幼鱼，仔鱼会啄食亲鱼皮肤分泌的营养黏液。", "亚马孙河流域黑水支流和泛滥森林。", "身体扁圆、双亲共同育幼的慈鲷。"),
  fish("freshwater-angelfish", "大神仙鱼", "Freshwater angelfish", "Pterophyllum scalare", "缓流与水草区", "借高而扁的身体穿行水草，成对守护附着在叶片上的卵。", "南美洲亚马孙、奥里诺科和圭亚那水系。", "长鳍展开如翅的南美慈鲷。"),
  fish("oscar", "图丽鱼", "Oscar", "Astronotus ocellatus", "热带河湖", "机会主义捕食鱼、昆虫和甲壳动物，会守护清理出的产卵地。", "南美洲亚马孙和奥里诺科流域。", "聪明、领地性明显的大型慈鲷。"),
  fish("neon-tetra", "霓虹脂鲤", "Neon tetra", "Paracheirodon innesi", "黑水溪流", "成群在阴暗水层捕食微小无脊椎动物，蓝色侧线有助于同伴识别。", "南美洲亚马孙上游黑水支流。", "一条蓝光横贯身体的微型群游鱼。"),
  fish("cardinal-tetra", "阿氏霓虹脂鲤", "Cardinal tetra", "Paracheirodon axelrodi", "黑水溪流", "数十至数百尾结群，在落叶和沉木间摄食小型生物。", "南美洲奥里诺科和尼格罗河上游。", "红色腹线贯穿全身的霓虹脂鲤。"),
  fish("guppy", "孔雀花鳉", "Guppy", "Poecilia reticulata", "溪流与池塘", "卵胎生、繁殖快，摄食藻类和小型无脊椎动物，对环境适应力强。", "原产南美洲东北部和加勒比，现广泛引入全球。", "尾鳍花纹多变、适应城市水体的小鱼。"),
  fish("siamese-fighting-fish", "五彩搏鱼", "Siamese fighting fish", "Betta splendens", "浅水湿地", "用迷鳃直接呼吸空气，雄鱼筑泡巢并守护卵，对同类雄鱼有强领地性。", "东南亚湄公河与湄南河流域低地。", "能在稻田浅水中呼吸空气的斗鱼。"),
  fish("zebrafish", "斑马鱼", "Zebrafish", "Danio rerio", "溪流与稻田", "日间群游，杂食微小动物和藻类，繁殖周期短。", "南亚恒河—布拉马普特拉等流域。", "条纹清晰、广泛用于生命科学研究的小鱼。"),
  fish("goldfish", "金鱼", "Goldfish", "Carassius auratus", "池塘与缓流", "杂食并在底层翻找食物，耐受温度变化，人工选育形成大量体型。", "野生祖先来自东亚，现随养殖遍布世界。", "由东亚鲫类长期驯化形成的观赏鱼。"),
  fish("common-carp", "鲤", "Common carp", "Cyprinus carpio", "河湖与池塘", "在底泥中拱食昆虫、软体动物和植物，耐受浑水与低氧。", "原生欧亚大陆，现被引入世界多地。", "与人类养殖历史非常悠久的大型鲤科鱼。"),
  fish("grass-carp", "草鱼", "Grass carp", "Ctenopharyngodon idella", "大型河湖", "幼鱼杂食，成鱼主要啃食高等水生植物，繁殖期在流水中漂流孵化。", "东亚大江河流域，已被广泛引种。", "以水草为主食的快速生长鲤科鱼。"),
  fish("silver-carp", "鲢", "Silver carp", "Hypophthalmichthys molitrix", "大型河流", "用鳃耙滤食浮游植物，受惊时常跃出水面，卵在流水中发育。", "东亚河流，现广泛引入欧亚与美洲。", "靠滤食浮游植物生活的群游大鱼。"),
  fish("bighead-carp", "鳙", "Bighead carp", "Hypophthalmichthys nobilis", "大型河流", "滤食较大的浮游动物和藻类，常在水体中上层活动。", "东亚河流，已被引入世界多地。", "头部宽大、以浮游动物为主食的鲤科鱼。"),
  fish("black-carp", "青鱼", "Black carp", "Mylopharyngodon piceus", "大型河湖", "成年后用强壮咽齿压碎螺和贝类，繁殖依赖温暖流水。", "中国东部至越南北部河流，部分地区有引种。", "专门处理硬壳软体动物的大型鲤科鱼。"),
  fish("mandarin-fish", "鳜", "Mandarin fish", "Siniperca chuatsi", "河湖与水库", "隐伏在水草或岩石旁伏击小鱼，幼鱼很早就转为肉食。", "中国、俄罗斯远东和朝鲜半岛淡水流域。", "花纹斑驳、擅长静伏突袭的东亚鱼。"),
  fish("asian-swamp-eel", "黄鳝", "Asian swamp eel", "Monopterus albus", "稻田与沼泽", "夜间在泥洞中捕食小动物，可用口腔和皮肤辅助呼吸并耐受低氧。", "东亚、东南亚和南亚淡水湿地。", "身体细长、能在泥中呼吸的合鳃鱼。"),
  fish("pond-loach", "泥鳅", "Pond loach", "Misgurnus anguillicaudatus", "池塘与稻田", "钻入软泥寻找底栖食物，缺氧时会到水面吞气并用肠道呼吸。", "东亚淡水低地，已被引入其他地区。", "能靠肠道辅助呼吸的小型底栖鱼。"),
  fish("channel-catfish", "斑点叉尾鮰", "Channel catfish", "Ictalurus punctatus", "河流与水库", "夜间依靠触须和味觉寻找鱼、昆虫和腐屑，常在洞穴内产卵。", "北美洲中部和东部，已广泛养殖。", "触须敏锐、适应浑水环境的北美鲶鱼。"),
  fish("wels-catfish", "欧洲巨鲶", "Wels catfish", "Silurus glanis", "大型河湖", "夜间伏击鱼类、两栖类和水鸟，偏爱温暖缓流与深水洞穴。", "欧洲中东部至西亚，已扩散到西欧多地。", "欧洲体型最大的淡水鱼之一。"),
  fish("mekong-giant-catfish", "湄公河巨鲶", "Mekong giant catfish", "Pangasianodon gigas", "大型河流", "幼体取食浮游动物，成体偏植物食并进行长距离洄游繁殖。", "湄公河流域。", "无牙而温和、处境极危的巨型鲶鱼。"),
  fish("redtail-catfish", "红尾鲶", "Redtail catfish", "Phractocephalus hemioliopterus", "热带大河", "夜间沿底层巡游，以鱼、蟹和落入水中的果实为食。", "亚马孙、奥里诺科和埃塞奎博河流域。", "尾鳍鲜红、头部宽大的南美鲶鱼。"),
  fish("rainbow-trout", "虹鳟", "Rainbow trout", "Oncorhynchus mykiss", "冷水河湖", "在清凉富氧水中捕食昆虫和小鱼，部分种群会入海后回河产卵。", "原产北太平洋沿岸，现广泛引种。", "体侧带粉红彩带的冷水鲑科鱼。"),
  fish("atlantic-salmon", "大西洋鲑", "Atlantic salmon", "Salmo salar", "河流与海洋", "幼鱼在河中成长后入海，成熟时依靠嗅觉返回出生河流繁殖。", "北大西洋两岸及其入海河流。", "能多次往返海洋与故乡河流的鲑鱼。"),
  fish("sockeye-salmon", "红鲑", "Sockeye salmon", "Oncorhynchus nerka", "河流、湖泊与海洋", "海中主要滤食浮游甲壳类，洄游产卵时身体转红、头部变绿。", "北太平洋及白令海沿岸河流。", "繁殖季颜色变化最醒目的太平洋鲑。"),
  fish("chinook-salmon", "帝王鲑", "Chinook salmon", "Oncorhynchus tshawytscha", "河流与海洋", "幼鱼入海后快速生长，成鱼可溯游很远返回上游产卵。", "北太平洋亚洲与北美沿岸。", "太平洋鲑中平均体型最大的一种。"),
  fish("brown-trout", "褐鳟", "Brown trout", "Salmo trutta", "冷水河湖", "领地性强，伏击昆虫和小鱼；既有终生淡水型，也有入海型。", "原产欧洲、北非和西亚，现被引入全球。", "生活史非常灵活的欧亚鳟鱼。"),
  fish("arctic-char", "北极红点鲑", "Arctic char", "Salvelinus alpinus", "寒带河湖与海洋", "耐受极低水温，部分种群季节性入海觅食，再回淡水繁殖。", "环北极地区。", "分布纬度最北的淡水鱼之一。"),
  fish("northern-pike", "白斑狗鱼", "Northern pike", "Esox lucius", "湖泊与缓流", "静伏水草边缘，以突然加速捕食鱼类、蛙和小型水鸟。", "北半球欧亚大陆和北美洲北部。", "长吻尖牙、擅长伏击的淡水猎手。"),
  fish("muskellunge", "北美狗鱼", "Muskellunge", "Esox masquinongy", "湖泊与大河", "多独居，在水草和落差边缘伏击鱼类，成长缓慢且寿命较长。", "北美洲五大湖和密西西比上游水系。", "体型巨大的北美狗鱼。"),
  fish("largemouth-bass", "大口黑鲈", "Largemouth bass", "Micropterus salmoides", "湖泊与缓流", "藏身水草和木障伏击鱼、蛙与甲壳类，雄鱼守巢护幼。", "原产北美洲东部，现广泛引入。", "嘴裂延伸至眼后的著名游钓鱼。"),
  fish("smallmouth-bass", "小口黑鲈", "Smallmouth bass", "Micropterus dolomieu", "清澈河湖", "偏好砾石和岩石水域，主动追逐小鱼和螯虾，雄鱼护巢。", "原产北美洲中东部，已扩散至多地。", "适应清凉流水、爆发力强的太阳鱼科鱼。"),
  fish("european-perch", "河鲈", "European perch", "Perca fluviatilis", "河湖", "幼鱼群游捕食无脊椎动物，成鱼转向小鱼并常协同围猎。", "欧洲和北亚淡水水系。", "带有深色竖纹和红色腹鳍的河鲈。"),
  fish("zander", "梭鲈", "Zander", "Sander lucioperca", "大型河湖", "黄昏和夜间借高感光眼睛追捕鱼类，偏好浑浊而富氧的水体。", "欧洲中东部至西亚，已被引入西欧。", "兼具梭形身体与犬齿的夜行捕食鱼。"),
  fish("nile-tilapia", "尼罗罗非鱼", "Nile tilapia", "Oreochromis niloticus", "热带河湖", "杂食藻类和碎屑，由雌鱼把受精卵和仔鱼含在口中保护。", "非洲尼罗河及多处热带水系，广泛养殖。", "适应力强、由母鱼口孵后代的慈鲷。"),
  fish("atlantic-cod", "大西洋鳕", "Atlantic cod", "Gadus morhua", "大陆架海域", "成群在近底层迁移，捕食鱼、甲壳类和软体动物，季节性进入产卵场。", "北大西洋两岸及北冰洋边缘。", "曾支撑北大西洋沿岸数百年渔业的鳕鱼。"),
  fish("haddock", "黑线鳕", "Haddock", "Melanogrammus aeglefinus", "大陆架海域", "在砂砾海底寻找小型底栖动物，体侧黑线和肩部黑斑明显。", "北大西洋寒温带海域。", "以肩部指纹状黑斑著称的鳕科鱼。"),
  fish("pacific-halibut", "太平洋庸鲽", "Pacific halibut", "Hippoglossus stenolepis", "大陆架与斜坡", "幼鱼随成长迁向深水，成鱼贴底伏击鱼类和章鱼并季节性洄游。", "北太平洋和白令海。", "双眼位于右侧的大型比目鱼。"),
  fish("european-flounder", "欧洲川鲽", "European flounder", "Platichthys flesus", "河口与近海", "埋伏在沙泥底捕食蠕虫和甲壳类，可进入低盐甚至淡水区域。", "欧洲沿岸、波罗的海和黑海部分水域。", "能深入河口淡水的底栖比目鱼。"),
  fish("european-plaice", "欧鲽", "European plaice", "Pleuronectes platessa", "砂质海底", "白天常半埋沙中，夜间寻找贝类、蠕虫和甲壳动物。", "东北大西洋和邻近海域。", "眼侧带有橙红圆斑的右眼鲽。"),
  fish("atlantic-mackerel", "大西洋鲭", "Atlantic mackerel", "Scomber scombrus", "近海表层", "大群高速游动并季节性洄游，滤食浮游生物也追捕小鱼。", "北大西洋两岸及地中海。", "背部波纹明显、没有鱼鳔的鲭鱼。"),
  fish("atlantic-herring", "大西洋鲱", "Atlantic herring", "Clupea harengus", "近海与大陆架", "形成巨大鱼群滤食浮游动物，昼夜在不同水层垂直移动。", "北大西洋及北冰洋边缘。", "连接浮游生物与大型捕食者的关键群游鱼。"),
  fish("european-anchovy", "欧洲鳀", "European anchovy", "Engraulis encrasicolus", "近海与河口", "结群滤食浮游生物，也捕捉微小甲壳类，能适应较大盐度变化。", "东大西洋、地中海、黑海及邻近水域。", "身体细长、上颌明显延长的小型群游鱼。"),
  fish("japanese-sardine", "远东拟沙丁鱼", "Japanese sardine", "Sardinops melanostictus", "近海表层", "大群随水温和浮游生物季节变化迁移，是许多海鸟和大鱼的食物。", "西北太平洋，从日本近海到东海。", "种群数量会随海洋年代际变化剧烈波动的鱼。"),
  fish("angler", "鮟鱇", "Angler", "Lophius piscatorius", "大陆架海底", "半埋海底，用头顶诱饵吸引鱼类靠近，再以巨大口腔吞食。", "东北大西洋、地中海和黑海部分海域。", "把第一背鳍变成钓竿的伏击鱼。"),
  fish("atlantic-wolffish", "大西洋狼鱼", "Atlantic wolffish", "Anarhichas lupus", "冷水岩礁", "用强壮犬齿和臼齿咬碎海胆、蟹和贝类，雄鱼会守护卵团。", "北大西洋寒冷近底层海域。", "牙齿突出却会认真护卵的冷水鱼。"),
  fish("antarctic-toothfish", "南极犬牙鱼", "Antarctic toothfish", "Dissostichus mawsoni", "极地深海", "体内抗冻蛋白避免血液结冰，成鱼捕食鱼和鱿鱼并在深水活动。", "南极大陆架和南大洋。", "依靠抗冻蛋白生活在零下海水中的大鱼。"),
  fish("smooth-head-blobfish", "水滴鱼", "Smooth-head blobfish", "Psychrolutes marcidus", "深海海底", "贴近深海底层生活，低密度胶质身体可在高压环境下节省游动能量。", "澳大利亚东南部、塔斯马尼亚和新西兰附近深海。", "离开高压深海后外形才会明显塌软的鱼。"),
  fish("common-fangtooth", "角高体金眼鲷", "Common fangtooth", "Anoplogaster cornuta", "深海中层", "昼夜垂直迁移，凭巨大牙齿捕捉鱼和甲壳类，幼体栖息更浅。", "全球热带至温带深海。", "身体不大却拥有比例惊人长牙的深海鱼。"),
  fish("sloanes-viperfish", "斯氏蝰鱼", "Sloane's viperfish", "Chauliodus sloani", "深海中层", "夜间上浮追捕小鱼，以发光器伪装轮廓并用长牙困住猎物。", "全球热带和温带深海。", "口中长牙无法完全闭合的发光猎手。"),
  fish("humpback-anglerfish", "约氏黑角鮟鱇", "Humpback anglerfish", "Melanocetus johnsonii", "深海中层", "雌鱼用发光诱饵吸引猎物，雄鱼体型很小并依靠寻找雌鱼完成繁殖。", "全球深海，尤见于热带和温带洋区。", "在无光层点亮一盏诱饵灯的鮟鱇。"),
  fish("giant-oarfish", "皇带鱼", "Giant oarfish", "Regalecus glesne", "深海中层", "以垂直姿态缓慢悬游，摄食磷虾和小鱼，身体呈极长带状。", "全球热带至温带外海。", "可能启发海蛇传说的超长银色鱼。"),
  fish("barreleye", "太平洋桶眼鱼", "Barreleye", "Macropinna microstoma", "深海中层", "透明头罩内的管状眼可向上或向前转动，常从管水母附近截取猎物。", "北太平洋温带深海。", "拥有透明头部和可旋转绿色眼睛的鱼。"),
  fish("coral-beauty-angelfish", "二色刺尻鱼", "Coral beauty angelfish", "Centropyge bispinosa", "珊瑚礁", "多在礁缝附近成小群活动，啄食藻类和附着小生物。", "印度洋至西太平洋热带礁区。", "蓝紫与橙红交错的小型神仙鱼。"),
  fish("flame-angelfish", "火焰刺尻鱼", "Flame angelfish", "Centropyge loricula", "珊瑚礁", "常由一尾雄鱼带领数尾雌鱼，在岩缝间取食藻类和小型甲壳动物。", "热带太平洋中西部岛礁。", "像一小簇火焰穿过珊瑚缝隙的鱼。"),
  fish("queen-angelfish", "女王神仙鱼", "Queen angelfish", "Holacanthus ciliaris", "珊瑚礁", "成鱼多成对巡游，以海绵为主食，幼鱼会为其他鱼清洁体表。", "西大西洋热带海域和加勒比海。", "额头带蓝色冠斑的大型神仙鱼。"),
  fish("copperband-butterflyfish", "钻嘴鱼", "Copperband butterflyfish", "Chelmon rostratus", "珊瑚礁与河口", "用细长吻部伸进石缝，夹取小型甲壳动物、蠕虫和珊瑚虫。", "印度洋东部至西太平洋浅海。", "长吻与铜色竖纹构成精巧轮廓的蝴蝶鱼。"),
  fish("raccoon-butterflyfish", "月斑蝴蝶鱼", "Raccoon butterflyfish", "Chaetodon lunula", "珊瑚礁", "黄昏后更活跃，成对或成群寻找珊瑚虫、蠕虫和其他底栖小动物。", "印度洋至太平洋热带礁区。", "眼部黑带像浣熊面罩的蝴蝶鱼。"),
  fish("powder-blue-tang", "白胸刺尾鱼", "Powder blue tang", "Acanthurus leucosternon", "珊瑚礁", "白天在浅礁成群刮食藻膜，领地争夺时会展示尾柄棘。", "印度洋热带岛礁。", "粉蓝身体配上黑色面罩的刺尾鱼。"),
  fish("achilles-tang", "橙斑刺尾鱼", "Achilles tang", "Acanthurus achilles", "浪区珊瑚礁", "偏爱水流强劲、含氧充足的外礁，以岩面短藻为食。", "中太平洋热带岛屿周边。", "黑色身体后方点着橙色水滴斑的鱼。"),
  fish("foxface-rabbitfish", "狐蓝子鱼", "Foxface rabbitfish", "Siganus vulpinus", "珊瑚礁与潟湖", "成对啃食藻类，受惊时体色变暗并竖起带毒背鳍棘。", "西太平洋热带浅海。", "有狐狸般尖吻和黑白面纹的植食鱼。"),
  fish("percula-clownfish", "眼斑双锯鱼", "Percula clownfish", "Amphiprion percula", "珊瑚礁", "与特定海葵共生，由群体中体型最大的个体担任雌鱼。", "新几内亚至澳大利亚东北部礁区。", "黑边更浓、体型小巧的经典小丑鱼。"),
  fish("tomato-clownfish", "白条双锯鱼", "Tomato clownfish", "Amphiprion frenatus", "珊瑚礁", "以海葵为中心建立领地，成鱼通常只保留头后一道白带。", "西太平洋热带沿岸。", "通体番茄红、性格鲜明的小丑鱼。"),
  fish("yellowtail-damselfish", "副金翅雀鲷", "Yellowtail damselfish", "Chrysiptera parasema", "珊瑚礁", "在枝状珊瑚附近小群活动，摄食浮游动物和底栖藻类。", "西太平洋从菲律宾到所罗门群岛。", "蓝色身体拖着明黄尾鳍的小雀鲷。"),
  fish("sergeant-major", "条纹豆娘鱼", "Sergeant major", "Abudefduf saxatilis", "珊瑚礁与岩岸", "日间成群觅食浮游生物，繁殖时雄鱼守护附着在岩面的卵。", "热带和亚热带大西洋。", "五道黑纹像军士徽章一样醒目的鱼。"),
  fish("blue-green-chromis", "蓝绿光鳃鱼", "Blue-green chromis", "Chromis viridis", "珊瑚礁", "大群悬游在枝状珊瑚上方捕食浮游动物，受惊便迅速缩回礁枝。", "印度洋至西太平洋热带海域。", "像一群浅蓝绿色碎光停在珊瑚上方。"),
  fish("pajama-cardinalfish", "睡衣天竺鲷", "Pajama cardinalfish", "Sphaeramia nematoptera", "潟湖与珊瑚礁", "白天躲在枝状珊瑚间，夜晚外出捕食小型甲壳动物，雄鱼口孵。", "西太平洋和澳大利亚北部。", "圆点、红眼和竖带像拼花睡衣的鱼。"),
  fish("flame-hawkfish", "火焰尖吻鲈", "Flame hawkfish", "Neocirrhites armatus", "珊瑚礁", "没有鳔，常停栖在珊瑚高处观察，再短距离扑向小型甲壳动物。", "中西太平洋珊瑚礁。", "会像鸟一样蹲守枝头的鲜红小鱼。"),
  fish("longnose-hawkfish", "长吻尖吻鲈", "Longnose hawkfish", "Oxycirrhites typus", "珊瑚礁", "以胸鳍支撑在柳珊瑚上，用长吻捕捉经过的小虾。", "印度洋至太平洋热带礁区。", "红色格纹和细长吻部很有辨识度的鱼。"),
  fish("striped-frogfish", "条纹躄鱼", "Striped frogfish", "Antennarius striatus", "沙地与礁区", "用胸鳍在海底行走，并摇动拟饵吸引猎物进入吞吸范围。", "全球热带和亚热带浅海。", "善于变色、把自己藏成海绵或海藻的伏击者。"),
  fish("yellow-boxfish", "米点箱鲀", "Yellow boxfish", "Ostracion cubicus", "珊瑚礁与潟湖", "幼鱼躲在礁缝，成鱼吹动砂粒寻找底栖动物，受压时可释放毒素。", "印度洋至太平洋热带海域。", "幼体像一枚带黑点的黄色小方盒。"),
  fish("queen-triggerfish", "姬鳞鲀", "Queen triggerfish", "Balistes vetula", "珊瑚礁", "用强齿搬动石块、咬碎海胆和贝壳，睡眠时以背棘卡住岩缝。", "热带大西洋。", "鳍缘蓝紫、体态华丽的大型鳞鲀。"),
  fish("humphead-wrasse", "波纹唇鱼", "Humphead wrasse", "Cheilinus undulatus", "珊瑚礁", "白天独自巡游，咬食软体动物、甲壳动物和棘冠海星，夜晚卧入礁洞。", "红海至太平洋中部珊瑚礁。", "额头隆起、可长到很大的隆头鱼。"),
  fish("cobia", "军曹鱼", "Cobia", "Rachycentron canadum", "近海与远洋", "常伴随鲨鱼、鳐和漂浮物游动，捕食蟹、鱿鱼和鱼类。", "全球热带和暖温带海域。", "黑色侧带让幼鱼看起来像一条长形䲟鱼。"),
  fish("atlantic-bonito", "大西洋狐鲣", "Atlantic bonito", "Sarda sarda", "近海表层", "成群高速追逐沙丁鱼和鳀鱼，季节性靠近沿岸产卵。", "大西洋两岸、地中海和黑海。", "背部斜纹明显的快速鲭科鱼。"),
  fish("skipjack-tuna", "鲣", "Skipjack tuna", "Katsuwonus pelamis", "远洋", "庞大鱼群在表层追捕小鱼、鱿鱼和甲壳动物，全年快速生长繁殖。", "全球热带和暖温带外海。", "腹部带数道深色纵纹的群游金枪鱼。"),
  fish("yellowfin-tuna", "黄鳍金枪鱼", "Yellowfin tuna", "Thunnus albacares", "远洋", "在温暖外海成群高速巡游，常与海豚或漂浮物附近的鱼群相伴。", "全球热带和亚热带海洋。", "黄色镰形鳍在蓝色海水中格外醒目。"),
  fish("albacore", "长鳍金枪鱼", "Albacore", "Thunnus alalunga", "远洋", "进行跨洋洄游，以小鱼、头足类和甲壳动物为食，胸鳍尤其修长。", "全球热带至温带外海。", "以一对长胸鳍识别的中型金枪鱼。"),
  fish("blue-marlin", "大西洋蓝枪鱼", "Blue marlin", "Makaira nigricans", "远洋", "多独游于暖海，用长吻击散鱼群，也捕食鱿鱼和大型远洋鱼。", "大西洋热带和暖温带水域。", "雌鱼远大于雄鱼的蓝色远洋猎手。"),
  fish("black-marlin", "立翅旗鱼", "Black marlin", "Istiompax indica", "远洋与陆架外缘", "胸鳍不能贴伏体侧，常在近岸暖流中追逐金枪鱼和鲭鱼。", "印度洋和太平洋热带海域。", "体格粗壮、胸鳍像固定翼展开的大型旗鱼。"),
  fish("white-marlin", "白枪鱼", "White marlin", "Kajikia albida", "远洋", "在表层和跃温层附近追食小型金枪鱼、鲯鳅和鱿鱼。", "大西洋热带至温带海域。", "背部深蓝、体侧带淡色纵纹的枪鱼。"),
  fish("striped-marlin", "条纹四鳍旗鱼", "Striped marlin", "Kajikia audax", "远洋", "常在水面附近追猎沙丁鱼，兴奋时体侧蓝色条纹会变得明亮。", "印度洋和太平洋热带至温带水域。", "会点亮身体条纹的远洋旗鱼。"),
  fish("atlantic-pomfret", "大西洋乌鲂", "Atlantic pomfret", "Brama brama", "远洋中层", "昼夜在不同水层间移动，以鱼、鱿鱼和甲壳动物为食。", "大西洋、印度洋和南太平洋温带外海。", "身体高扁、鳍色深暗的远洋鱼。"),
  fish("tiger-shark", "鼬鲨", "Tiger shark", "Galeocerdo cuvier", "近海与远洋", "夜间巡游，以鱼、海龟和甲壳动物等多样食物为食，幼体条纹更明显。", "全球热带和暖温带海域。", "背部暗纹随年龄渐淡的大型鲨鱼。"),
  fish("bull-shark", "公牛鲨", "Bull shark", "Carcharhinus leucas", "沿岸与河流", "能调节体内盐分，常进入河口甚至淡水河段捕食。", "全球热带和亚热带沿岸及部分大河。", "少数能长期进入淡水的大型鲨鱼之一。"),
  fish("blacktip-reef-shark", "乌翅真鲨", "Blacktip reef shark", "Carcharhinus melanopterus", "浅海珊瑚礁", "在很浅的礁坪巡游，主要捕食鱼和头足类，背鳍尖端呈黑色。", "印度洋至太平洋热带礁区。", "经常让黑色背鳍划过浅水面的礁鲨。"),
  fish("whitetip-reef-shark", "灰三齿鲨", "Whitetip reef shark", "Triaenodon obesus", "珊瑚礁", "白天成群卧在洞穴，夜间用细长身体钻入礁缝寻找章鱼和鱼。", "印度洋至太平洋热带礁区。", "可以静卧海底呼吸的白鳍尖礁鲨。"),
  fish("oceanic-whitetip-shark", "长鳍真鲨", "Oceanic whitetip shark", "Carcharhinus longimanus", "热带远洋", "以宽大的圆头胸鳍节能巡航，会调查船只和任何可能的食物来源。", "全球热带和亚热带外海。", "各鳍白色圆尖十分醒目的远洋鲨。"),
  fish("nurse-shark", "铰口鲨", "Nurse shark", "Ginglymostoma cirratum", "礁区与沙底", "白天常成堆休息，夜间用强力吸力从缝隙吸出甲壳动物和软体动物。", "西大西洋和东太平洋热带沿岸。", "口部生有触须、性情沉稳的底栖鲨。"),
  fish("lemon-shark", "柠檬鲨", "Lemon shark", "Negaprion brevirostris", "红树林与浅海", "幼鲨利用红树林育幼场，成鱼夜间捕食鱼和甲壳动物。", "西大西洋和东太平洋热带、亚热带沿岸。", "黄褐体色能融入沙底的大型真鲨。"),
  fish("shortfin-mako", "尖吻鲭鲨", "Shortfin mako", "Isurus oxyrinchus", "远洋", "能够维持部分肌肉温度并高速追捕鱼和鱿鱼，有时跃出水面。", "全球热带至温带外海。", "流线如鱼雷、速度极快的鲭鲨。"),
  fish("greenland-shark", "小头睡鲨", "Greenland shark", "Somniosus microcephalus", "北极深海", "缓慢游动并摄食鱼和腐肉，生长极慢、寿命可能跨越数个世纪。", "北大西洋和北冰洋寒冷深水。", "已知寿命最长的脊椎动物候选者之一。"),
  fish("largetooth-sawfish", "锯鳐", "Largetooth sawfish", "Pristis pristis", "河口与近岸", "用布满感受器和齿突的锯状吻部探测、击打猎物，幼体可进入淡水。", "热带大西洋、印度洋和太平洋的零散区域。", "像带着一把长锯游动的鳐类。"),
  fish("smalltooth-sawfish", "小齿锯鳐", "Smalltooth sawfish", "Pristis pectinata", "浅海与红树林", "锯吻能感知埋在沙中的猎物，也可横扫鱼群。", "现主要见于西大西洋少数沿岸。", "锯齿细密、依赖浅水育幼场的锯鳐。"),
  fish("southern-stingray", "南方魟", "Southern stingray", "Hypanus americanus", "沙地与海草床", "白天常埋入沙中，只露出眼和喷水孔，夜间寻找贝类和甲壳动物。", "西大西洋热带海域和加勒比海。", "像一张菱形毯子贴着海底滑行的魟。"),
  fish("marbled-electric-ray", "大理石电鳐", "Marbled electric ray", "Torpedo marmorata", "岩礁与沙底", "伏击鱼类并用发电器官释放电脉冲制伏猎物或防御。", "东北大西洋和地中海。", "体表大理石花纹下藏着发电器官的鳐。"),
  fish("spotted-eagle-ray", "斑点鹰魟", "Spotted eagle ray", "Aetobatus narinari", "近海礁区", "用扁平齿板压碎贝类和蟹，常在水层中挥动胸鳍并跃出海面。", "热带大西洋海域。", "蓝黑背部洒满白点、像鸟翼飞行的鳐。"),
  fish("cownose-ray", "牛鼻鲼", "Cownose ray", "Rhinoptera bonasus", "沿岸与河口", "大群季节性迁移，用头鳍搅动海底寻找蛤蜊和甲壳动物。", "西大西洋沿岸。", "额部双叶像牛鼻、喜欢成群迁徙的鳐。"),
  fish("harlequin-rasbora", "黑斑三角波鱼", "Harlequin rasbora", "Trigonostigma heteromorpha", "森林溪流", "成群在柔软酸性水中活动，卵会黏在宽叶植物背面。", "马来半岛、苏门答腊及周边地区。", "身体后半有黑色三角斑的群游小鱼。"),
  fish("cherry-barb", "樱桃无须魮", "Cherry barb", "Pethia titteya", "林下溪流", "在植物茂密的缓流中小群觅食，雄鱼繁殖期会变成深樱红色。", "斯里兰卡西南部淡水。", "色泽温暖、性情温和的小型鲤科鱼。"),
  fish("tiger-barb", "四带无须魮", "Tiger barb", "Puntigrus tetrazona", "热带溪流", "活跃结群，杂食昆虫、藻类和碎屑，群体太小时容易追咬长鳍鱼。", "苏门答腊、婆罗洲等东南亚水域。", "橙金身体上排列四道黑带的鱼。"),
  fish("white-cloud-minnow", "唐鱼", "White Cloud Mountain minnow", "Tanichthys albonubes", "山地溪流", "耐受偏凉水温，成群捕食小型无脊椎动物并啄食藻类。", "中国华南及越南北部少数溪流。", "来自白云山记忆的小型冷水观赏鱼。"),
  fish("japanese-medaka", "青鳉", "Japanese medaka", "Oryzias latipes", "稻田与缓流", "常在水面群游，耐受温度和盐度变化，雌鱼短暂携卵后附着水草。", "日本、朝鲜半岛和中国东部部分水域。", "体型细小、长期用于发育研究的鱼。"),
  fish("kuhli-loach", "库勒潘鳅", "Kuhli loach", "Pangio kuhlii", "林下溪流", "夜间从落叶和软泥中寻找小型动物，白天常成群躲藏。", "马来半岛和印度尼西亚淡水。", "黄黑环纹让身体像一条细小蛇形丝带。"),
  fish("clown-loach", "大刺色鳅", "Clown loach", "Chromobotia macracanthus", "大型河流", "群居且会发出咔哒声，用口下触须翻找蜗牛、昆虫和植物残屑。", "苏门答腊和婆罗洲河流。", "橙色身体配三道黑带的大型鳅鱼。"),
  fish("peppered-corydoras", "花斑兵鲶", "Peppered corydoras", "Corydoras paleatus", "缓流与池塘", "成群在底层用触须翻找食物，偶尔冲到水面吞气辅助呼吸。", "南美洲拉普拉塔河下游水系。", "披着骨板、像小队巡逻的底栖鲶鱼。"),
  fish("bristlenose-pleco", "布氏无齿甲鲶", "Bristlenose pleco", "Ancistrus cirrhosus", "河流岩底", "吸附在木石表面刮食藻膜，雄鱼吻部触须发达并在洞穴守卵。", "南美洲巴拉那河流域。", "鼻端长着柔软触须的甲鲶。"),
  fish("common-pleco", "下口鲶", "Common pleco", "Hypostomus plecostomus", "热带河流", "夜间刮食藻类和腐屑，甲片保护身体，也能吞气应对缺氧。", "南美洲圭亚那地区淡水。", "腹面吸盘能让它贴住急流岩石。"),
  fish("blue-ram", "荷兰凤凰鱼", "Blue ram", "Mikrogeophagus ramirezi", "热带缓流", "成对占据小领地，在平石或浅坑产卵并共同照护幼鱼。", "南美洲奥里诺科河流域草原水体。", "蓝色亮点密布的小型慈鲷。"),
  fish("convict-cichlid", "黑带丽体鱼", "Convict cichlid", "Amatitlania nigrofasciata", "溪流与湖泊", "配偶共同守巢，面对远大于自己的入侵者也会积极驱赶。", "中美洲从危地马拉到哥斯达黎加。", "黑白竖纹像旧式囚衣、护幼勇敢的慈鲷。"),
  fish("jack-dempsey", "八带丽体鱼", "Jack Dempsey", "Rocio octofasciata", "湿地与缓流", "黄昏捕食昆虫、甲壳动物和小鱼，繁殖时双亲共同守护领地。", "墨西哥南部至洪都拉斯淡水。", "深色身体闪着蓝绿色斑点的大型慈鲷。"),
  fish("frontosa", "横带驼背非鲫", "Frontosa", "Cyphotilapia frontosa", "深水岩岸", "缓慢结群，清晨捕食从浅水返回的小鱼，成鱼额部隆起。", "非洲坦噶尼喀湖特有。", "蓝白宽纹和高额让它显得沉静庄重。"),
  fish("electric-yellow-cichlid", "淡黑镊丽鱼", "Electric yellow cichlid", "Labidochromis caeruleus", "湖泊岩岸", "在岩缝中啄食小型无脊椎动物和藻类，由雌鱼口孵后代。", "非洲马拉维湖北部和中部。", "亮黄色身体配黑色鳍缘的岩栖慈鲷。"),
  fish("european-eel", "欧洲鳗鲡", "European eel", "Anguilla anguilla", "河流与海洋", "幼体进入欧洲淡水生长多年，成熟后横渡大西洋前往马尾藻海繁殖。", "欧洲、北非淡水与东北大西洋。", "一生完成跨洋往返的神秘降河洄游鱼。"),
  fish("japanese-eel", "日本鳗鲡", "Japanese eel", "Anguilla japonica", "河流与海洋", "在东亚河口和淡水生长，成熟后游向西太平洋深海产卵。", "东亚沿岸与西北太平洋。", "以海洋出生、河川成长的方式连接两种水域。"),
  fish("american-eel", "美洲鳗鲡", "American eel", "Anguilla rostrata", "河流与海洋", "透明柳叶状幼体随洋流抵达美洲，成鱼多年后返回马尾藻海。", "北美洲东部、加勒比与西北大西洋。", "分布跨越寒温带到热带的降河洄游鳗。"),
  fish("giant-moray", "爪哇裸胸鳝", "Giant moray", "Gymnothorax javanicus", "珊瑚礁", "白天将身体藏在礁洞，只露头部换水呼吸，夜间捕食鱼和章鱼。", "红海至太平洋中部热带礁区。", "体型巨大、常与石斑鱼协同捕猎的海鳝。"),
  fish("giant-gourami", "大丝足鲈", "Giant gourami", "Osphronemus goramy", "河湖与沼泽", "用迷鳃呼吸空气，杂食水生植物和小动物，成鱼会营造植物巢。", "东南亚淡水，已被广泛养殖。", "额头圆隆、能长到很大的丝足鲈。"),
  fish("kissing-gourami", "吻鲈", "Kissing gourami", "Helostoma temminckii", "沼泽与缓流", "用特殊唇齿刮取藻类，两尾鱼面对面推挤看似接吻，实为社交较量。", "东南亚淡水低地。", "厚唇动作让它获得“接吻鱼”名字。"),
  fish("paradise-fish", "圆尾斗鱼", "Paradise fish", "Macropodus opercularis", "池塘与稻田", "能直接呼吸空气，雄鱼筑泡巢护卵，对同类有明显领地行为。", "中国东部至越南北部。", "红蓝条纹飘动、很早进入欧洲水族箱的鱼。"),
  fish("northern-snakehead", "乌鳢", "Northern snakehead", "Channa argus", "河湖与湿地", "用鳃上器官呼吸空气，伏击鱼蛙，双亲会共同守护漂浮幼鱼群。", "东亚淡水，已在部分地区形成引入种群。", "头形似蛇、能耐受低氧的大型鱼。"),
  fish("giant-snakehead", "小盾鳢", "Giant snakehead", "Channa micropeltes", "大型河湖", "幼鱼红黑成群并由亲鱼护卫，成年后成为强壮的鱼食性捕食者。", "东南亚河流与湖泊。", "成长过程中体色彻底改变的巨型鳢鱼。"),
  fish("burbot", "江鳕", "Burbot", "Lota lota", "寒冷河湖", "夜间贴底捕食鱼和无脊椎动物，在隆冬冰下集群产卵。", "北半球高纬度淡水。", "唯一终生生活在淡水中的鳕形目鱼类。"),
  fish("tench", "丁鱥", "Tench", "Tinca tinca", "静水与水草区", "在泥底寻找昆虫和软体动物，耐受浑浊、低氧和较高水温。", "欧洲和西亚，已被引入其他地区。", "橄榄绿色身体覆盖细小鳞片的鲤科鱼。"),
  fish("common-roach", "湖拟鲤", "Common roach", "Rutilus rutilus", "河湖", "成群摄食水生植物、昆虫和软体动物，对多种水体条件适应力强。", "欧洲和西亚淡水。", "红色眼睛和腹鳍是它醒目的识别点。"),
  fish("common-bream", "欧鳊", "Common bream", "Abramis brama", "大型河湖", "成群在软底吸食昆虫幼虫、贝类和植物材料，成鱼身体高而侧扁。", "欧洲和西亚低地水域。", "银灰色高体适合在缓流中稳定巡游。"),
  fish("ide", "雅罗鱼", "Ide", "Leuciscus idus", "河流与湖泊", "幼鱼群游，成鱼杂食昆虫、甲壳动物和小鱼，繁殖时进入浅滩。", "欧洲至西伯利亚淡水。", "能在河流和半咸水之间活动的鲤科鱼。"),
  fish("golden-mahseer", "金吉罗", "Golden mahseer", "Tor putitora", "山地大河", "沿喜马拉雅河流季节性迁移，在急流和深潭间觅食植物与小动物。", "南亚喜马拉雅山麓水系。", "金色大鳞闪耀、力量强劲的大型鲤科鱼。"),
  fish("pacific-cod", "太平洋鳕", "Pacific cod", "Gadus macrocephalus", "冷水大陆架", "贴近海底成群活动，捕食鱼、蟹和虾，冬季向浅水聚集产卵。", "北太平洋沿岸和白令海。", "下颌触须帮助它在浑暗海底找食物。"),
  fish("alaska-pollock", "黄线狭鳕", "Alaska pollock", "Gadus chalcogrammus", "冷水中层", "形成巨大鱼群并昼夜垂直移动，摄食磷虾和小鱼。", "北太平洋和白令海。", "支撑庞大海洋食物网与渔业的群游鳕鱼。"),
  fish("european-hake", "欧洲无须鳕", "European hake", "Merluccius merluccius", "大陆架与陆坡", "白天停在近底层，夜间上浮捕食鱼和鱿鱼，存在随成长加深的迁移。", "东北大西洋和地中海。", "口裂大、身体修长的夜行捕食鱼。"),
  fish("northern-red-snapper", "北方红笛鲷", "Northern red snapper", "Lutjanus campechanus", "礁区与陆架", "幼鱼生活在沙泥底，成鱼聚集在礁石和沉船周围捕食鱼虾。", "墨西哥湾和美国东南大西洋沿岸。", "通体玫瑰红、依恋海底结构的笛鲷。"),
  fish("giant-grouper", "鞍带石斑鱼", "Giant grouper", "Epinephelus lanceolatus", "珊瑚礁与河口", "独居伏击鱼、龙虾和小型鳐，幼体也会利用红树林。", "印度洋至太平洋热带沿岸。", "珊瑚礁中体型最大的硬骨鱼之一。"),
  fish("european-seabass", "欧洲舌齿鲈", "European seabass", "Dicentrarchus labrax", "河口与近海", "幼鱼进入河口和潟湖，成鱼夜间捕食鱼虾并沿海岸迁移。", "东北大西洋、地中海和黑海。", "银灰体色和双背鳍构成利落轮廓的海鲈。"),
  fish("gilthead-seabream", "金头鲷", "Gilthead seabream", "Sparus aurata", "海草床与河口", "用臼齿压碎贝类和甲壳动物，额间金色横带十分醒目。", "东北大西洋和地中海。", "会随成长发生性别转换的海鲷。"),
  fish("red-seabream", "真鲷", "Red seabream", "Pagrus major", "岩礁与陆架", "幼鱼在浅海活动，成鱼迁往较深水层，以甲壳动物、贝类和小鱼为食。", "西北太平洋，从日本到南海北部。", "粉红体色在东亚饮食与庆典中常被视为吉兆。"),
  fish("yellow-croaker", "小黄鱼", "Yellow croaker", "Larimichthys polyactis", "近海泥沙底", "成群季节性洄游，利用发声肌与鳔产生声音并进行交流。", "黄海、渤海和东海。", "会在浑水中发出咕咕声的石首鱼。"),
  fish("large-yellow-croaker", "大黄鱼", "Large yellow croaker", "Larimichthys crocea", "近海与河口", "夜间或浑水中成群活动，同样能用鳔发声，繁殖季靠近沿岸。", "中国东海和南海北部。", "金黄色体侧与会发声的鳔是它的特点。"),
  fish("largehead-hairtail", "白带鱼", "Largehead hairtail", "Trichiurus lepturus", "大陆架水层", "常以头向上的姿态停留，夜间追捕小鱼、虾和鱿鱼，幼鱼会垂直迁移。", "全球热带和温带大陆架海域。", "没有尾鳍、像银色长带一样游动的鱼。"),
  fish("japanese-amberjack", "五条鰤", "Japanese amberjack", "Seriola quinqueradiata", "近海与外海", "幼鱼跟随漂流海藻，成鱼成群追捕沙丁鱼和鯷鱼并季节性南北迁移。", "西北太平洋。", "不同成长阶段在日本拥有不同名字的洄游鱼。"),
  fish("milkfish", "遮目鱼", "Milkfish", "Chanos chanos", "潟湖与河口", "幼鱼进入红树林和半咸水育幼场，以藻类和有机碎屑为食。", "印度洋和太平洋热带海域。", "银色叉尾、长期被东南亚沿海养殖的古老鱼种。"),
  fish("flathead-grey-mullet", "鲻", "Flathead grey mullet", "Mugil cephalus", "河口与近海", "成群刮食底层藻膜和碎屑，能在海水、半咸水与淡水间移动。", "全球热带至温带沿岸。", "宽扁头部适合在浅水底层取食。"),
  fish("capelin", "毛鳞鱼", "Capelin", "Mallotus villosus", "寒冷海域", "大群在近岸或海底产卵，是鳕鱼、鲸和海鸟的重要食物。", "北大西洋、北冰洋和北太平洋。", "身形不大却支撑北方海洋食物网的鱼。"),
  fish("greenland-halibut", "马舌鲽", "Greenland halibut", "Reinhardtius hippoglossoides", "寒冷深海", "比多数鲽鱼更常离开海底游动，捕食鱼、虾和鱿鱼。", "北大西洋、北冰洋和北太平洋深水。", "左眼迁移不完全、身体两侧都较深色的鲽鱼。"),
  fish("patagonian-toothfish", "小鳞犬牙南极鱼", "Patagonian toothfish", "Dissostichus eleginoides", "南方深海", "幼鱼生活较浅，成鱼下潜到深水捕食鱼和鱿鱼，生长缓慢。", "南大洋亚南极岛屿和南美洲南部外海。", "生活在寒冷深海、可长到很大的南极鱼。"),
  fish("sablefish", "裸盖鱼", "Sablefish", "Anoplopoma fimbria", "北太平洋深海", "幼鱼在近岸表层，成长后迁到陆坡深水，以鱼和水母等为食。", "北太平洋，从日本到加利福尼亚。", "皮肤深黑、体内富含油脂的长寿鱼。"),
  fish("orange-roughy", "大西洋胸棘鲷", "Orange roughy", "Hoplostethus atlanticus", "深海山脊", "在海山附近聚集捕食浮游甲壳动物和小鱼，生长慢且寿命很长。", "全球温带深海。", "鲜橙体色与极慢生命节奏形成反差的深海鱼。"),
  fish("spotted-lanternfish", "斑点灯笼鱼", "Spotted lanternfish", "Myctophum punctatum", "深海中层", "夜间上浮摄食浮游动物，腹部发光器帮助隐去向下的轮廓。", "大西洋及邻近海域。", "用一列列发光器融入微弱天光的鱼。"),
  fish("pelican-eel", "宽咽鱼", "Pelican eel", "Eurypharynx pelecanoides", "深海中层", "巨大口囊可以张开包住猎物，细长尾端有发光器用于诱引或交流。", "全球热带和温带深海。", "嘴像鹈鹕囊袋、身体细如长鞭的鱼。"),
  fish("black-swallower", "黑叉齿龙䲢", "Black swallower", "Chiasmodon niger", "深海中层", "依靠可扩张胃部吞下比自身更大的鱼，平时在黑暗水层伏击。", "全球热带和亚热带深海。", "胃袋像弹性行囊一样夸张的深海捕食者。"),
  fish("cookiecutter-shark", "雪茄达摩鲨", "Cookiecutter shark", "Isistius brasiliensis", "深海与远洋", "夜间上浮，用吸盘状嘴附着大型动物并旋转切下一块圆形组织。", "全球热带和亚热带外海。", "会在鲸和大鱼身上留下圆形咬痕的小鲨鱼。"),
  fish("frilled-shark", "皱鳃鲨", "Frilled shark", "Chlamydoselachus anguineus", "大陆坡深海", "身体柔长，以多排三叉牙齿抓住鱿鱼和鱼，六对鳃裂边缘呈褶皱。", "大西洋和太平洋零散深水区域。", "保留许多古老形态、像鳗一样游动的鲨鱼。"),
  fish("goblin-shark", "欧氏尖吻鲛", "Goblin shark", "Mitsukurina owstoni", "深海陆坡", "长吻布满电感受器，发现猎物后下颌会迅速向前弹出。", "全球温带和热带深海的零散记录。", "粉灰身体和可弹射下颌构成罕见轮廓的鲨。"),
];

if (speciesSeeds.length !== 200 || new Set(speciesSeeds.map((entry) => entry.slug)).size !== 200) {
  throw new Error(`Expected 200 unique fish species, received ${speciesSeeds.length}.`);
}

if (new Set(speciesSeeds.map((entry) => entry.scientificName)).size !== speciesSeeds.length) {
  throw new Error("Fish scientific names must be unique.");
}

await fs.mkdir(assetDirectory, { recursive: true });
const previousEntries = await readPreviousCatalog();
const previousBySlug = new Map(previousEntries.map((entry) => [entry.slug, entry]));

const catalog = [];
for (let index = 0; index < speciesSeeds.length; index += 1) {
  const seed = speciesSeeds[index];
  const outputPath = path.join(assetDirectory, `${seed.slug}.webp`);
  const existing = previousBySlug.get(seed.slug);

  if (!refresh && !refreshSlugs.has(seed.slug) && existing?.imageSourcePageUrl && (await fileExists(outputPath))) {
    if (!(await hasTransparentPixels(outputPath))) await normalizeTransparentFish(outputPath, outputPath);
    catalog.push({ ...seed, ...pickImageMetadata(existing), sortOrder: index + 1 });
    continue;
  }

  const fishBaseImage = preferFishBase
    ? preferredDirectImages.get(seed.scientificName) ?? (await findFishBaseImage(seed.scientificName))
    : null;
  if (preferFishBase && !fishBaseImage && existing) {
    process.stdout.write(`${String(index + 1).padStart(3, "0")} ${seed.scientificName} (kept existing)\n`);
    catalog.push({ ...seed, ...pickImageMetadata(existing), sortOrder: index + 1 });
    continue;
  }
  const image =
    fishBaseImage ?? imageFromFrozenSource(seed.scientificName, existing) ?? (await findCommonsImage(seed.scientificName));
  const response = await fetchImage(image);
  const bytes = Buffer.from(await response.arrayBuffer());
  const sourcePath = path.join(os.tmpdir(), `fish-catcher-source-${randomUUID()}`);
  await fs.writeFile(sourcePath, bytes);
  try {
    await normalizeTransparentFish(sourcePath, outputPath);
  } finally {
    await fs.rm(sourcePath, { force: true });
  }

  process.stdout.write(`${String(index + 1).padStart(3, "0")} ${seed.scientificName}\n`);
  catalog.push({
    ...seed,
    imagePath: `/assets/fishes/${seed.slug}.webp`,
    imageSourceName: image.sourceName ?? "Wikimedia Commons",
    imageSourcePageUrl: image.descriptionUrl,
    imageAuthor: image.author ?? (stripHtml(image.metadata.Artist?.value) || null),
    licenseLabel:
      image.licenseLabel ?? image.metadata.LicenseShortName?.value ?? image.metadata.UsageTerms?.value ?? null,
    sortOrder: index + 1,
  });
  // ponytail: sequential checkpointing is deliberately slower; it avoids redownloading a large catalog after one remote failure.
  await fs.writeFile(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
}

await fs.writeFile(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
console.log(`fish catalog: ${catalog.length} records, ${assetDirectory}`);

async function hasTransparentPixels(filePath) {
  const metadata = await sharp(filePath).metadata();
  if (!metadata.hasAlpha) return false;
  return !(await sharp(filePath).stats()).isOpaque;
}

async function normalizeTransparentFish(inputPath, outputPath) {
  await ensureBackgroundRemover();

  const token = randomUUID();
  const alphaPath = path.join(os.tmpdir(), `fish-catcher-alpha-${token}.png`);
  const finalPath = path.join(os.tmpdir(), `fish-catcher-final-${token}.webp`);

  try {
    await execFileAsync(backgroundRemovalBinary, [inputPath, alphaPath]);
    const foreground = await sharp(alphaPath)
      .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 8 })
      .resize(840, 520, { fit: "inside", withoutEnlargement: false })
      .modulate({ brightness: 0.94, saturation: 0.88 })
      .png()
      .toBuffer();

    await sharp({
      create: {
        width: 960,
        height: 640,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([{ input: foreground, gravity: "center" }])
      .webp({ quality: 80, alphaQuality: 92, effort: 5 })
      .toFile(finalPath);
    await fs.rename(finalPath, outputPath);
  } finally {
    await Promise.all([fs.rm(alphaPath, { force: true }), fs.rm(finalPath, { force: true })]);
  }
}

async function ensureBackgroundRemover() {
  if (process.platform !== "darwin") {
    throw new Error("Transparent fish generation currently uses macOS Vision and must run on macOS 14 or newer.");
  }

  backgroundRemovalReady ??= execFileAsync("xcrun", [
    "swiftc",
    backgroundRemovalSource,
    "-O",
    "-o",
    backgroundRemovalBinary,
  ]);
  await backgroundRemovalReady;
}

function fish(slug, commonNameZh, commonNameEn, scientificName, habitatLabel, habits, distribution, summary) {
  return {
    slug,
    commonNameZh,
    commonNameEn,
    scientificName,
    habitatLabel,
    habits,
    distribution,
    summary,
    sourceName: "FishBase",
    sourcePageUrl: `https://www.fishbase.se/summary/${scientificName.replaceAll(" ", "-")}.html`,
    imagePath: `/assets/fishes/${slug}.webp`,
  };
}

function directFishBaseImage(filename, genus, species, author) {
  return {
    url: `https://www.fishbase.se/images/species/${filename}`,
    descriptionUrl: `https://www.fishbase.se/FieldGuide/FieldGuideSummary.php?genusname=${genus}&speciesname=${species}`,
    sourceName: "FishBase",
    author,
    licenseLabel: "FishBase photo terms",
    metadata: {},
  };
}

async function findCommonsImage(scientificName) {
  const directImage = preferredDirectImages.get(scientificName);
  if (directImage) return directImage;
  const preferredTitle = preferredImageTitles.get(scientificName);
  if (preferredTitle) return getCommonsFileImage(preferredTitle);

  let candidates = await searchCommonsImages(`\"${scientificName}\"`, scientificName);
  if (!candidates.length) candidates = await searchCommonsImages(scientificName, scientificName);
  if (!candidates[0]) throw new Error(`No Wikimedia Commons image found for ${scientificName}.`);
  return candidates[0];
}

async function findFishBaseImage(scientificName) {
  const [genus, species] = scientificName.split(" ");
  if (!genus || !species) return null;

  const descriptionUrl =
    `https://www.fishbase.se/FieldGuide/FieldGuideSummary.php?genusname=${encodeURIComponent(genus)}` +
    `&speciesname=${encodeURIComponent(species)}`;
  const response = await fetchWithRetry(descriptionUrl);
  const html = await response.text();
  const imagePath = html.match(/(?:\.\.\/)?images\/species\/[^"']+\.(?:jpg|jpeg|png)/i)?.[0];
  if (!imagePath) return null;

  const author = html.match(/photo by[\s\S]{0,180}?<font[^>]*>([^<]+)<\/font>/i)?.[1]?.trim() || null;
  return {
    url: new URL(imagePath.replace(/^\.\./, ""), "https://www.fishbase.se/").toString(),
    descriptionUrl,
    sourceName: "FishBase",
    author,
    licenseLabel: "FishBase photo terms",
    metadata: {},
  };
}

function imageFromFrozenSource(scientificName, existing) {
  if (!existing?.imageSourcePageUrl) return null;

  const directImage = preferredDirectImages.get(scientificName);
  if (directImage) return directImage;

  const pageUrl = new URL(existing.imageSourcePageUrl);
  const filePrefix = "/wiki/File:";
  if (pageUrl.hostname !== "commons.wikimedia.org" || !pageUrl.pathname.startsWith(filePrefix)) return null;

  const filename = decodeURIComponent(pageUrl.pathname.slice(filePrefix.length)).replaceAll(" ", "_");
  const hash = createHash("md5").update(filename).digest("hex");
  const encodedFilename = encodeURIComponent(filename);
  const thumbnailFilename = filename.toLowerCase().endsWith(".svg")
    ? `960px-${encodedFilename}.png`
    : `960px-${encodedFilename}`;
  const uploadRoot = `https://upload.wikimedia.org/wikipedia/commons/${hash[0]}/${hash.slice(0, 2)}/${encodedFilename}`;

  return {
    url: `https://upload.wikimedia.org/wikipedia/commons/thumb/${hash[0]}/${hash.slice(0, 2)}/${encodedFilename}/${thumbnailFilename}`,
    fallbackUrl: uploadRoot,
    descriptionUrl: existing.imageSourcePageUrl,
    sourceName: existing.imageSourceName,
    author: existing.imageAuthor,
    licenseLabel: existing.licenseLabel,
    metadata: {},
  };
}

async function fetchImage(image) {
  try {
    return await fetchWithRetry(image.url);
  } catch (error) {
    if (!image.fallbackUrl) throw error;
    return fetchWithRetry(image.fallbackUrl);
  }
}

async function getCommonsFileImage(title) {
  const params = new URLSearchParams({
    action: "query",
    titles: title,
    prop: "imageinfo",
    iiprop: "url|mime|extmetadata",
    iiurlwidth: "960",
    format: "json",
    origin: "*",
  });
  const response = await fetchWithRetry(`https://commons.wikimedia.org/w/api.php?${params}`);
  const payload = await response.json();
  const page = Object.values(payload.query?.pages ?? {})[0];
  const info = page?.imageinfo?.[0];
  if (!info?.thumburl) throw new Error(`Preferred Wikimedia Commons image is unavailable: ${title}.`);
  return { url: info.thumburl, descriptionUrl: info.descriptionurl, metadata: info.extmetadata ?? {} };
}

async function searchCommonsImages(searchQuery, scientificName) {
  const params = new URLSearchParams({
    action: "query",
    generator: "search",
    gsrsearch: searchQuery,
    gsrnamespace: "6",
    gsrlimit: "12",
    prop: "imageinfo",
    iiprop: "url|mime|extmetadata",
    iiurlwidth: "960",
    format: "json",
    origin: "*",
  });
  const response = await fetchWithRetry(`https://commons.wikimedia.org/w/api.php?${params}`);
  const payload = await response.json();
  const pages = Object.values(payload.query?.pages ?? {});
  return pages
    .map((page) => ({ page, info: page.imageinfo?.[0] }))
    .filter(({ info }) => info?.thumburl && ["image/jpeg", "image/png", "image/webp"].includes(info.mime))
    .map(({ page, info }) => ({
      url: info.thumburl,
      descriptionUrl: info.descriptionurl,
      metadata: info.extmetadata ?? {},
      score: imageScore(scientificName, page.title, info.extmetadata ?? {}, page.index ?? 99),
    }))
    .sort((left, right) => right.score - left.score);
}

function imageScore(scientificName, title, metadata, searchIndex) {
  const text = `${title} ${stripHtml(metadata.ImageDescription?.value)} ${metadata.Categories?.value ?? ""}`.toLowerCase();
  const normalizedName = scientificName.toLowerCase();
  let score = 100 - searchIndex;
  if (text.includes(normalizedName)) score += 120;
  if (/quality images|featured pictures|valued images/.test(text)) score += 35;
  if (/specimen|museum|dead fish|illustration|drawing|distribution map|x-ray|fossil/.test(text)) score -= 90;
  return score;
}

async function fetchWithRetry(url, attempts = 5) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const waitMs = Math.max(0, nextRequestAt - Date.now());
      if (waitMs) await new Promise((resolve) => setTimeout(resolve, waitMs));
      nextRequestAt = Date.now() + requestIntervalMs;
      const response = await fetch(url, { headers: { "user-agent": userAgent } });
      if (!response.ok) {
        const error = new Error(`${response.status} ${response.statusText}`);
        error.status = response.status;
        error.retryAfter = Number(response.headers.get("retry-after")) || 0;
        throw error;
      }
      return response;
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        const cooldownMs = error.status === 429 ? Math.max(error.retryAfter * 1_000, attempt * 4_000) : attempt * 750;
        await new Promise((resolve) => setTimeout(resolve, cooldownMs));
      }
    }
  }
  throw new Error(`Failed to fetch ${url}: ${lastError}`);
}

async function readPreviousCatalog() {
  try {
    return JSON.parse(await fs.readFile(catalogPath, "utf8"));
  } catch {
    return [];
  }
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function pickImageMetadata(entry) {
  return {
    imagePath: entry.imagePath,
    imageSourceName: entry.imageSourceName,
    imageSourcePageUrl: entry.imageSourcePageUrl,
    imageAuthor: entry.imageAuthor ?? null,
    licenseLabel: entry.licenseLabel ?? null,
  };
}

function stripHtml(value = "") {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}
