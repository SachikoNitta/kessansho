// 実在の議員の名簿（基本属性）を、公式の公開情報から決まった手順で読み取る純粋な関数。
// AI は使わない。import-roster.js とテストが共有する。

export const BLOCKS = {
  北海道: ["北海道"],
  東北: ["青森", "岩手", "宮城", "秋田", "山形", "福島"],
  北関東: ["茨城", "栃木", "群馬", "埼玉"],
  南関東: ["千葉", "神奈川", "山梨"],
  東京: ["東京"],
  北陸信越: ["新潟", "富山", "石川", "福井", "長野"],
  東海: ["岐阜", "静岡", "愛知", "三重"],
  近畿: ["滋賀", "京都", "大阪", "兵庫", "奈良", "和歌山"],
  中国: ["鳥取", "島根", "岡山", "広島", "山口"],
  四国: ["徳島", "香川", "愛媛", "高知"],
  九州: ["福岡", "佐賀", "長崎", "熊本", "大分", "宮崎", "鹿児島", "沖縄"],
};
export const NATIONAL = "全国（参院比例）";

const ERAS = { 明治: 1868, 大正: 1912, 昭和: 1926, 平成: 1989, 令和: 2019 };
const DIGITS = { 〇: 0, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };

// 漢数字（〜九十九）を数にする。「元」は1
export function kanjiNumber(s) {
  if (/^\d+$/.test(s)) return Number(s);
  if (s === "元") return 1;
  let n = 0;
  let cur = 0;
  for (const ch of s) {
    if (ch === "十") { n += (cur || 1) * 10; cur = 0; } else if (ch in DIGITS) cur = DIGITS[ch];
    else return NaN;
  }
  return n + cur;
}

// 経歴の書き出しから生年（月・日がわかればそれも）を読む。
// 「昭和二十九年六月」「昭和40年8月18日」「昭和三十六年生まれ」「1967年11月28日」→ "1954-06" / "1965-08-18" / "1961" / "1967-11-28"
export function parseBirth(text) {
  const t = String(text).normalize("NFKC").slice(0, 60);
  const pad = (n) => String(n).padStart(2, "0");
  const N = "[元〇一二三四五六七八九十\\d]+";
  const era = t.match(new RegExp(`(明治|大正|昭和|平成|令和)(${N})年(?:(${N})月(?:(${N})日)?)?`));
  const west = t.match(/(19\d{2}|20\d{2})年(?:(\d{1,2})月(?:(\d{1,2})日)?)?/);
  const pick = [era && { i: era.index, y: ERAS[era[1]] + kanjiNumber(era[2]) - 1, mo: era[3] && kanjiNumber(era[3]), d: era[4] && kanjiNumber(era[4]) },
    west && { i: west.index, y: Number(west[1]), mo: west[2] && Number(west[2]), d: west[3] && Number(west[3]) }]
    .filter(Boolean).sort((a, b) => a.i - b.i)[0];
  if (!pick || !Number.isFinite(pick.y)) return null;
  if (!(pick.mo >= 1 && pick.mo <= 12)) return String(pick.y);
  return pick.d ? `${pick.y}-${pad(pick.mo)}-${pad(pick.d)}` : `${pick.y}-${pad(pick.mo)}`;
}

export function regionOf(house, district) {
  const d = String(district).normalize("NFKC");
  if (house === "参議院" && /^比例/.test(d)) return NATIONAL;
  const block = d.match(/\(比\)\s*(\S+)/)?.[1];
  if (block && BLOCKS[block]) return block;
  for (const [b, prefs] of Object.entries(BLOCKS)) {
    if (prefs.some((p) => d.startsWith(p))) return b;
  }
  return null;
}

// 経歴の文から「議員になる前の主な職業」を推し量る（目安）。
// 当選より前の部分で、最後に出てくる職業の手がかりを採る。
const CAREER_RULES = [
  ["官僚", /(省|庁)(に)?入(省|庁)|(大蔵|財務|通商産業|経済産業|外務|総務|自治|厚生労働|厚生|労働|国土交通|建設|運輸|農林水産|防衛|文部科学|文部|郵政|環境)省|警察庁|内閣府|国税庁/g],
  ["弁護士", /弁護士/g],
  ["医師・医療", /医師|歯科医|看護師|薬剤師|病院/g],
  ["地方議員・首長", /(都|道|府|県|市|区|町|村)議会議員|(都|府|県|市|区|町|村)議(?!会|員|長)|知事|市長|区長|町長|村長/g],
  ["議員秘書", /秘書/g],
  ["メディア", /新聞|放送|テレビ|アナウンサー|記者|キャスター|ジャーナリスト/g],
  ["労働組合", /労働組合|労組|自治労|日教組|UAゼンセン|基幹労連|電力総連|自動車総連/g],
  ["教育・研究", /教授|准教授|講師|助教|教諭|教員|研究員|研究所/g],
  ["民間企業", /株式会社|\(株\)|銀行|入社|商事|証券|保険|電機|自動車|電力|会社員|会社役員|代表取締役|経営/g],
];
export function classifyCareer(text) {
  const t = String(text).normalize("NFKC");
  const cut = t.search(/当選|初当選/);
  const before = cut > 0 ? t.slice(0, cut) : t;
  let best = { career: "その他", at: -1 };
  for (const [career, re] of CAREER_RULES) {
    for (const m of before.matchAll(re)) if (m.index > best.at) best = { career, at: m.index };
  }
  return best.career;
}

// かなは「ひらがな・空白なし」にそろえて比べる
export const normKana = (s) => String(s ?? "").normalize("NFKC").replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60)).replace(/[\s　・]+/g, "");
export const normName = (s) => String(s ?? "").normalize("NFKC").replace(/[\s　]+/g, "").replace(/君$/, "");

const strip = (html) => html
  .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
  .replace(/<[^>]+>/g, " ")
  .replace(/&nbsp;/g, " ")
  .replace(/&amp;/g, "&")
  .replace(/\s+/g, " ")
  .trim();

// 衆議院「議員一覧」（あ行〜わ行の各ページ）の表を読む
export function parseShugiinList(html, baseUrl) {
  const rows = [];
  const re = /<TR VALIGN = top>([\s\S]*?)<\/TR>/gi;
  for (const [, tr] of html.matchAll(re)) {
    const tds = [...tr.matchAll(/<TD[^>]*>([\s\S]*?)<\/TD>/gi)].map((m) => m[1]);
    if (tds.length < 5) continue;
    const href = tds[0].match(/href='([^']+)'/i)?.[1];
    const name = strip(tds[0]).replace(/君$/, "").trim();
    if (!href || !name) continue;
    const termsText = strip(tds[4]).normalize("NFKC");
    rows.push({
      name: name.replace(/\s+/g, " "),
      kana: strip(tds[1]).replace(/\s+/g, " "),
      kaiha: strip(tds[2]),
      district: strip(tds[3]).normalize("NFKC").replace(/\s+/g, ""),
      terms: Number(termsText.match(/^\d+/)?.[0] ?? NaN),
      termsOther: Number(termsText.match(/参(\d+)/)?.[1] ?? 0),
      profileUrl: new URL(href, baseUrl).href,
    });
  }
  return rows;
}

// 衆議院の議員の紹介ページから、生年月と経歴の文を読む
export function parseShugiinProfile(html) {
  const text = strip(html);
  const from = text.search(/(明治|大正|昭和|平成)[元〇一二三四五六七八九十]+年/);
  const to = text.search(/（令和\S+現在）/);
  const bio = from >= 0 ? text.slice(from, to > from ? to : undefined).trim() : "";
  return { birth: parseBirth(bio), bio };
}

// 衆議院「会派名及び会派別所属議員数」：会派名・略称・人数・うち女性
export function parseShugiinKaiha(html) {
  const text = strip(html);
  const out = [];
  const re = /(\S+?)(?:\s+([^\s\d]\S*?))?\s+(\d+)（(\d+)）/g;
  const start = text.indexOf("所属議員数", text.indexOf("会派略称"));
  for (const m of text.slice(start).matchAll(re)) {
    if (m[1] === "計" || m[2] === "計") break;
    out.push({ name: m[1], abbr: m[2] ?? m[1], seats: Number(m[3]), women: Number(m[4]) });
  }
  return out;
}

// ---- 経歴の文から読む切り口（どれも「経歴に書かれている範囲」の目安） ----

// 衆議院議員総選挙・参議院議員通常選挙の回次 → 年
export const SHU_ELECTIONS = { 30: 1963, 31: 1967, 32: 1969, 33: 1972, 34: 1976, 35: 1979, 36: 1980, 37: 1983, 38: 1986, 39: 1990, 40: 1993, 41: 1996, 42: 2000, 43: 2003, 44: 2005, 45: 2009, 46: 2012, 47: 2014, 48: 2017, 49: 2021, 50: 2024, 51: 2026 };
export const SAN_ELECTIONS = { 10: 1974, 11: 1977, 12: 1980, 13: 1983, 14: 1986, 15: 1989, 16: 1992, 17: 1995, 18: 1998, 19: 2001, 20: 2004, 21: 2007, 22: 2010, 23: 2013, 24: 2016, 25: 2019, 26: 2022, 27: 2025 };

// 衆議院の紹介ページの末尾「当選十四回（38 39 … 51）参二回（24 26）」から当選した年を読む
export function electionYears(bio) {
  const t = String(bio).normalize("NFKC");
  const years = [];
  // 「48繰49」「43補44」のように繰上当選・補欠選挙の印が付くこともある
  const shu = t.match(/当選[〇一二三四五六七八九十\d]+回\(([^)]+)\)/);
  const san = t.match(/参[〇一二三四五六七八九十\d]+回\(([^)]+)\)/);
  for (const n of shu?.[1].match(/\d+/g) ?? []) if (SHU_ELECTIONS[n]) years.push(SHU_ELECTIONS[n]);
  for (const n of san?.[1].match(/\d+/g) ?? []) if (SAN_ELECTIONS[n]) years.push(SAN_ELECTIONS[n]);
  return years.sort((a, b) => a - b);
}

export function electedBy(house, district) {
  const d = String(district).normalize("NFKC");
  if (house === "衆議院") return /^\(比\)/.test(d) ? "衆・比例代表" : "衆・小選挙区";
  return /^比例/.test(d) ? "参・比例代表" : "参・選挙区";
}

// 大臣（国務大臣・総理）の経験。副大臣・大臣政務官・政務次官は一段下として分ける
export function ministerialLevel(bio) {
  const t = String(bio).normalize("NFKC");
  for (const m of t.matchAll(/大臣/g)) {
    const before = t[m.index - 1];
    const after = t.slice(m.index + 2, m.index + 5);
    if (before === "副" || /^(政務官|補佐官|秘書官|官)/.test(after)) continue;
    return "大臣の経験あり";
  }
  if (/副大臣|大臣政務官|政務次官/.test(t)) return "副大臣・政務官の経験あり";
  return "経歴に記載なし";
}

// 最初に出てくる「〇〇大学」（大学院・附属校は除く）。「東大」「法政大卒」のような略し方も読む
const SHORT = { 東大: "東京大学", 京大: "京都大学", 早大: "早稲田大学", 慶大: "慶應義塾大学", 阪大: "大阪大学", 一橋大: "一橋大学", 東北大: "東北大学", 九大: "九州大学", 名大: "名古屋大学", 北大: "北海道大学", 日大: "日本大学", 明大: "明治大学", 中大: "中央大学", 法大: "法政大学", 立大: "立教大学", 上智大: "上智大学", 同大: "同志社大学", 立命大: "立命館大学", 関大: "関西大学", 学大: null };
export function university(bio) {
  const t = String(bio).normalize("NFKC").replace(/慶応/g, "慶應");
  const trim = (s) => s.replace(/^.*(年|月|日(?!本)|[、。をにてでがはも・])/, "").replace(/^(国立|私立|県立|都立|市立)/, "");
  const full = [...t.matchAll(/([一-龥ぁ-んァ-ヶー・]+?大学)(?!院|附属|付属|校)/g)].map((m) => ({ i: m.index, name: m[1].endsWith("お茶の水女子大学") ? "お茶の水女子大学" : trim(m[1]) })).filter((x) => x.name.length >= 3);
  const short = [...t.matchAll(/([一-龥]{1,6}?大)(?=[一-龥]{0,4}(学部|卒|中退))/g)].map((m) => {
    const k = trim(m[1]);
    return { i: m.index, name: k in SHORT ? SHORT[k] : `${k}学` };
  }).filter((x) => x.name && x.name.length >= 3 && !/大学$/.test(x.name) === false);
  const first = [...full, ...short].sort((a, b) => a.i - b.i)[0];
  return first?.name ?? null;
}

export function studiedAbroad(bio) {
  return /留学|ハーバード|スタンフォード|コロンビア大学|ペンシルベニア|ジョージタウン|オックスフォード|ケンブリッジ|ロンドン大学|ロンドン・スクール|プリンストン|イェール|エール大学|マサチューセッツ|カリフォルニア大学|ジョンズ・?ホプキンス|北京大学|清華大学|ソウル大学|行政学院|INSEAD|University|College|MBA|(米国|英国|仏国|アメリカ|イギリス|フランス|ドイツ|カナダ|オーストラリア|中国|韓国)[^、。○]{0,20}(大学|大学院)/i.test(String(bio).normalize("NFKC"));
}

const PREFS = Object.values(BLOCKS).flat();
// 生まれた都道府県（経歴の書き出しの「〇〇県…生まれ」から）
export function birthPrefecture(bio) {
  const head = String(bio).normalize("NFKC").slice(0, 50);
  if (!/生まれ|生る|に生/.test(head)) return null;
  let best = null;
  for (const p of PREFS) {
    const i = head.indexOf(p);
    if (i >= 0 && (best === null || i < best.i)) best = { p, i };
  }
  if (best) return best.p;
  return /(米国|アメリカ|中国|韓国|台湾|ブラジル|英国|旧満州|満州|朝鮮)/.test(head) ? "海外" : null;
}

// 選挙区（比例はブロック）の中で生まれたか
export function hometown(house, district, birthPref) {
  const d = String(district).normalize("NFKC");
  if (house === "参議院" && /^比例/.test(d)) return "対象外（参院比例）";
  if (!birthPref) return "出生地の記載なし";
  if (birthPref === "海外") return "海外生まれ";
  const block = d.match(/\(比\)\s*(\S+)/)?.[1];
  const area = block ? BLOCKS[block] ?? [] : PREFS.filter((p) => d.startsWith(p) || d.includes(`・${p}`));
  return area.includes(birthPref) ? "地元（同じ都道府県・ブロック）生まれ" : "ほかの地域の生まれ";
}
