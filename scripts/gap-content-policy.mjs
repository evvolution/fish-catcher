const blockedChinesePoliticalPatterns = [
  ["近现代中国党政人物", /毛[泽澤]东|周恩来|刘少奇|劉少奇|朱德|邓小平|鄧小平|陈云|陳雲|林彪|江青|康生|华国锋|華國鋒|胡耀邦|赵紫阳|趙紫陽|江泽民|江澤民|胡锦涛|胡錦濤|习近平|習近平|李克强|李克強|李强|李強|王沪宁|王滬寧|蔡奇|丁薛祥|李希|温家宝|溫家寶|朱[镕鎔]基|李鹏|李鵬|薄熙来|薄熙來|周永康|令计划|令計劃/iu],
  ["近现代中国政治与军事人物", /彭德怀|彭德懷|叶剑英|葉劍英|贺龙|賀龍|陈毅|陳毅|罗荣桓|羅榮桓|徐向前|聂荣臻|聶榮臻|袁世凯|袁世凱|孙中山|孫中山|蒋介石|蔣介石|蒋经国|蔣經國/iu],
  ["台湾政治人物", /李登辉|李登輝|陈水扁|陳水扁|马英九|馬英九|蔡英文|赖清德|賴清德/iu],
  ["香港政治人物", /黄之锋|黃之鋒|黎智英|戴耀廷|林郑月娥|林鄭月娥|李家超/iu],
  ["政治活动与异议人物", /刘晓波|劉曉波|艾未未|魏京生|王丹|柴玲|吾尔开希|吾爾開希|陈光诚|陳光誠|郭文贵|郭文貴|张展|張展/iu],
  ["民族与分离主义政治人物", /达赖喇嘛|達賴喇嘛|丹增嘉措|热比娅|熱比婭|伊力哈木/iu],
  ["英文政治人物名", /\b(?:mao zedong|mao tse-tung|zhou enlai|deng xiaoping|jiang zemin|hu jintao|xi jinping|liu xiaobo|ai weiwei|chiang kai-shek|sun yat-sen|tsai ing-wen|lai ching-te|joshua wong|jimmy lai|dalai lama)\b/iu],
  ["明显中国政治议题", /中国共产党|中國共產黨|中共|国民党|國民黨|人民解放军|人民解放軍|六四|天安门事件|天安門事件|文化大革命|文革|大跃进|大躍進|反右|白纸运动|白紙運動|香港国安法|香港國安法|台独|台獨|藏独|藏獨|疆独|疆獨/iu],
  ["英文中国政治议题", /\b(?:chinese communist party|kuomintang|people's liberation army|tiananmen|cultural revolution|great leap forward|hong kong protests?|taiwan independence)\b/iu],
];

const approvedEastAsiaSources = [
  "https://github.com/chinese-poetry/chinese-poetry/blob/master/%E8%92%99%E5%AD%A6/tangshisanbaishou.json",
  "https://github.com/chinese-poetry/chinese-poetry/blob/master/%E8%AF%97%E7%BB%8F/shijing.json",
];

export function findBlockedChinesePoliticalReference(value) {
  const normalized = String(value ?? "").normalize("NFKC");
  return blockedChinesePoliticalPatterns.find(([, pattern]) => pattern.test(normalized))?.[0] ?? null;
}

export function isGapCopyCandidateAllowed(entry) {
  return !findBlockedChinesePoliticalReference(searchableText(entry));
}

export function assertGapCopyPolicy(entry) {
  const blockedCategory = findBlockedChinesePoliticalReference(searchableText(entry));
  if (blockedCategory) throw new Error(`${entry.slug ?? entry.title ?? "copy"} contains ${blockedCategory}`);

  if (entry.region === "east_asia") {
    if (entry.era !== "ancient") throw new Error(`${entry.slug ?? entry.title} is not approved ancient East Asian copy`);
    if (!approvedEastAsiaSources.includes(entry.sourceUrl)) {
      throw new Error(`${entry.slug ?? entry.title} uses an unapproved East Asian source`);
    }
  }
}

function searchableText(entry) {
  return [entry.author, entry.work, entry.title, entry.content, entry.notes, entry.sourceUrl].filter(Boolean).join("\n");
}
