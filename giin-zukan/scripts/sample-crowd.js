// 分析ツールの見え方を確かめるための、架空の議員の集団を作る。
// 乱数は種を固定しているので、何度作っても同じデータになる。実在の人物・政党とは関係ありません。

const SEATS = { 衆議院: 465, 参議院: 248 };
const AS_OF = 2026;

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SURNAMES = [
  ["青柳", "あおやぎ"], ["朝霧", "あさぎり"], ["天羽", "あもう"], ["綾瀬", "あやせ"], ["有馬", "ありま"], ["五十嵐", "いがらし"],
  ["一ノ瀬", "いちのせ"], ["稲葉", "いなば"], ["卯月", "うづき"], ["江波", "えなみ"], ["大槻", "おおつき"], ["奥寺", "おくでら"],
  ["柏木", "かしわぎ"], ["桂", "かつら"], ["神楽", "かぐら"], ["鏑木", "かぶらぎ"], ["如月", "きさらぎ"], ["桐生", "きりゅう"],
  ["久遠", "くおん"], ["九条", "くじょう"], ["黒羽", "くろば"], ["古賀", "こが"], ["小鳥遊", "たかなし"], ["榊", "さかき"],
  ["朔間", "さくま"], ["沢渡", "さわたり"], ["椎名", "しいな"], ["東雲", "しののめ"], ["白鷺", "しらさぎ"], ["瀬戸", "せと"],
  ["芹沢", "せりざわ"], ["宗像", "むなかた"], ["高遠", "たかとお"], ["橘", "たちばな"], ["月岡", "つきおか"], ["鶴見", "つるみ"],
  ["時任", "ときとう"], ["鳥羽", "とば"], ["七瀬", "ななせ"], ["鳴海", "なるみ"], ["野分", "のわき"], ["羽柴", "はしば"],
  ["葉月", "はづき"], ["速水", "はやみ"], ["日向", "ひなた"], ["氷室", "ひむろ"], ["深町", "ふかまち"], ["藤堂", "とうどう"],
  ["真壁", "まかべ"], ["御影", "みかげ"], ["水無瀬", "みなせ"], ["御園", "みその"], ["望月", "もちづき"], ["八雲", "やくも"],
  ["柳瀬", "やなせ"], ["結城", "ゆうき"], ["雪村", "ゆきむら"], ["夜久", "やく"], ["若狭", "わかさ"], ["渡会", "わたらい"],
];
const GIVEN = {
  男性: ["あきら", "いつき", "かなた", "けいすけ", "こうたろう", "しゅん", "じょう", "そうま", "たいが", "ちひろ", "てつ", "とおる", "なおき", "はやと", "ひびき", "ふみや", "まこと", "みなと", "ゆうせい", "りく", "れん", "わたる"],
  女性: ["あおい", "あかね", "いずみ", "うた", "かえで", "きょうこ", "さくら", "しおり", "すみれ", "ちさと", "つむぎ", "なつめ", "のぞみ", "はるか", "ひより", "まどか", "みお", "ゆい", "よしの", "りお", "るり", "わかば"],
};

const FIELDS = ["子育て", "教育", "年金", "介護", "医療", "働き方", "経済", "税制", "地方の産業", "農林水産", "エネルギー", "環境", "防災", "外交・安全保障", "政治改革", "デジタル", "規制改革"];

const PROMISE_TEMPLATES = {
  子育て: ["児童手当を高校卒業まで延長", "保育園の待機児童をゼロに"],
  教育: ["給食費を全国で無償に", "教員の残業を半分に"],
  年金: ["基礎年金の底上げ", "年金の手続きをスマホで完結"],
  介護: ["介護職の給与を全産業平均に", "介護離職をゼロに"],
  医療: ["地域の救急医療を24時間に", "不妊治療の自己負担を軽く"],
  働き方: ["最低賃金を時給1500円に", "副業の社会保険を一本化"],
  経済: ["中小企業の賃上げ税制を拡充", "スタートアップの創業支援を倍増"],
  税制: ["消費税の軽減税率を見直し", "給与明細でわかる税の内訳を"],
  地方の産業: ["地方の工場誘致に補助金", "商店街の空き店舗を半減"],
  農林水産: ["農家の所得補償を拡充", "国産木材の利用を倍増"],
  エネルギー: ["再エネの比率を5割に", "家庭の電気代を下げる補助"],
  環境: ["プラスチックごみを3割削減", "森林の保全に交付金"],
  防災: ["避難所の冷暖房を全校に", "河川の堤防整備を前倒し"],
  "外交・安全保障": ["拉致問題の解決に向けた交渉", "サイバー防衛の人材を倍増"],
  政治改革: ["政治資金を1円から公開", "国会の採決記録をデータで公開"],
  デジタル: ["行政手続きを全てオンラインに", "自治体システムを共通化"],
  規制改革: ["ライドシェアを全国で解禁", "医薬品のネット販売を拡大"],
};
const COMMITTEES = ["予算", "厚生労働", "文部科学", "経済産業", "国土交通", "農林水産", "環境", "外務", "総務", "内閣"];
const CATCH = [
  "現場の声を、そのまま国会へ。", "数字で語り、数字で確かめます。", "次の世代に、ツケを回さない。",
  "地元の困りごとは、国の宿題です。", "約束は、紙に書いて守ります。", "反対するなら、代わりの案を出す。",
];

// 政党ごとの傾向（架空）。分析したときに違いが見えるように、少しずつ差をつけている
const PARTY_TRAITS = {
  aozora: { share: 0.4, female: 0.13, ageMean: 60, careers: { 官僚: 4, 地方議員: 4, 議員秘書: 3, 民間企業: 2, 弁護士: 1, その他: 1 }, fields: ["経済", "外交・安全保障", "地方の産業", "防災", "税制"], achieve: 0.32, speech: 0.7 },
  kurashi: { share: 0.2, female: 0.3, ageMean: 55, careers: { 労働組合: 4, 民間企業: 3, 弁護士: 2, 地方議員: 2, メディア: 1 }, fields: ["年金", "子育て", "働き方", "介護", "教育"], achieve: 0.14, speech: 1.3 },
  midori: { share: 0.13, female: 0.38, ageMean: 52, careers: { "教育・研究": 3, "医師・医療": 3, その他: 2, 地方議員: 2, メディア: 1 }, fields: ["エネルギー", "環境", "防災", "医療", "農林水産"], achieve: 0.12, speech: 1.2 },
  hikari: { share: 0.12, female: 0.18, ageMean: 50, careers: { 民間企業: 4, 地方議員: 3, 弁護士: 1, メディア: 1, 官僚: 1 }, fields: ["政治改革", "デジタル", "規制改革", "経済", "税制"], achieve: 0.18, speech: 1.1 },
  shizuku: { share: 0.08, female: 0.27, ageMean: 57, careers: { 地方議員: 4, その他: 2, "教育・研究": 1, "医師・医療": 1, 議員秘書: 1 }, fields: ["介護", "教育", "子育て", "医療", "年金"], achieve: 0.22, speech: 1.0 },
  independent: { share: 0.07, female: 0.2, ageMean: 58, careers: { 民間企業: 2, 官僚: 2, メディア: 2, 弁護士: 1, 地方議員: 1, その他: 1 }, fields: FIELDS, achieve: 0.1, speech: 0.9 },
};
const REGION_WEIGHTS = { 北海道: 4, 東北: 6, 北関東: 7, 南関東: 9, 東京: 8, 北陸信越: 5, 東海: 9, 近畿: 12, 中国: 5, 四国: 3, 九州: 9 };
const SKIN = ["#F6D7BD", "#F1CFB3", "#E9C29F", "#D9A980", "#C68E64"];
const HAIR = ["#2B2A33", "#3A2A2F", "#4A3326", "#1F2430", "#8C8C99", "#B9B9C4", "#5A4636"];

export function generateMembers(existing) {
  const r = rng(20261005);
  const pick = (list) => list[Math.floor(r() * list.length)];
  const weighted = (obj) => {
    const total = Object.values(obj).reduce((a, b) => a + b, 0);
    let x = r() * total;
    for (const [k, w] of Object.entries(obj)) if ((x -= w) < 0) return k;
    return Object.keys(obj).at(-1);
  };
  const normal = (mean, sd) => mean + sd * Math.sqrt(-2 * Math.log(r() || 1e-9)) * Math.cos(2 * Math.PI * r());
  const pad = (n) => String(n).padStart(2, "0");
  const date = (y0, y1) => `${y0 + Math.floor(r() * (y1 - y0 + 1))}-${pad(1 + Math.floor(r() * 12))}-${pad(1 + Math.floor(r() * 28))}`;
  const src = (title, path, d, quote) => ({ title, url: `https://example.jp/${path}`, date: d, quote });

  const usedNames = new Set(existing.map((m) => m.name));
  const out = [];
  let serial = 0;

  for (const [house, seats] of Object.entries(SEATS)) {
    const remaining = seats - existing.filter((m) => m.house === house).length;
    for (let i = 0; i < remaining; i++) {
      serial++;
      const party = weighted(Object.fromEntries(Object.entries(PARTY_TRAITS).map(([k, t]) => [k, t.share])));
      const t = PARTY_TRAITS[party];
      const gender = r() < t.female ? "女性" : "男性";
      const age = Math.round(Math.min(82, Math.max(28, normal(t.ageMean, 10))));
      const birthYear = AS_OF - age;
      const maxTerms = house === "衆議院" ? 16 : 6;
      const terms = Math.max(1, Math.min(maxTerms, Math.round(((age - 30) / (house === "衆議院" ? 3.4 : 7)) * (0.4 + r() * 0.9))));
      const region = weighted(REGION_WEIGHTS);
      const career = weighted(t.careers);

      let name, kana;
      do {
        const [sn, sk] = pick(SURNAMES);
        const given = pick(GIVEN[gender]);
        name = `${sn} ${given}`;
        kana = `${sk} ${given}`;
      } while (usedNames.has(name));
      usedNames.add(name);
      const id = `m${String(serial).padStart(3, "0")}`;

      const district = house === "衆議院"
        ? (r() < 0.62 ? `${region}・架空第${1 + Math.floor(r() * 9)}区` : `比例 ${region}ブロック`)
        : (r() < 0.6 ? `${region}・架空選挙区` : "比例代表");

      // 力を入れる分野は、政党の傾向から2〜3個
      const fields = [];
      while (fields.length < 2 + Math.floor(r() * 2)) {
        const f = r() < 0.8 ? pick(t.fields) : pick(FIELDS);
        if (!fields.includes(f)) fields.push(f);
      }

      // ベテランほど実現しやすく、質疑は少なめ（役職につくため）という傾向をつける
      const veteran = Math.min(1, terms / (house === "衆議院" ? 8 : 4));
      const promises = Array.from({ length: 2 + Math.floor(r() * 3) }, (_, k) => {
        const field = fields[k % fields.length];
        const title = PROMISE_TEMPLATES[field][Math.floor(r() * 2)];
        const madeAt = house === "衆議院" ? "2024-10-15" : (r() < 0.5 ? "2025-07-03" : "2022-06-22");
        const madeIn = madeAt.startsWith("2024") ? "2024年衆院選 選挙公報" : `${madeAt.slice(0, 4)}年参院選 選挙公報`;
        const pAchieve = t.achieve * (0.6 + veteran * 0.9);
        const x = r();
        const status = x < pAchieve ? "achieved" : x < pAchieve + 0.3 ? "in_progress" : x < pAchieve + 0.48 ? "not_started" : x < pAchieve + 0.58 ? "stalled" : "unverifiable";
        const notes = {
          achieved: "関連する法律や予算が成立したことが会議録で確認できる。",
          in_progress: "政府が検討や一部の実施を始めたと答弁している。",
          not_started: "資料の範囲では、具体的な動きを確認できない。",
          stalled: "本人が委員会で、見送りになったと述べている。",
          unverifiable: "根拠となる資料を確かめられなかったため、判定を保留している。",
        };
        const needsEvidence = ["achieved", "in_progress", "stalled"].includes(status);
        return {
          id: `p${k + 1}`, title, field, madeAt, madeIn, status,
          detail: `${title}を実現する。`,
          statusNote: notes[status],
          sources: [src(`選挙公報（${madeIn.slice(0, 5)}）`, `koho/${id}`, madeAt, `${title}を実現します`)],
          evidence: needsEvidence ? [src("国会会議録", `kokkai/${id}/${k + 1}`, date(2025, 2026), `${field}に関する取り組みについて答弁がありました`)] : [],
        };
      });

      const nAch = 1 + Math.floor(r() * 4);
      const achievements = Array.from({ length: nAch }, (_, k) => {
        const field = pick(fields);
        const type = weighted({ question: 6, written_question: 2 * (1.3 - veteran), bill: 1.2, committee: 1 + veteran * 2 });
        const d = date(2023, 2026);
        const c = pick(COMMITTEES);
        const items = {
          question: [`${field}について質問`, `${c}委員会で、${field}に関する政府の方針を質した。`],
          written_question: [`${field}に関する質問主意書`, `${field}の現状について、政府に答弁を求めた。`],
          bill: [`${field}に関する法案を提出`, `${field}に関する議員立法の提出者になった。`],
          committee: [`${c}委員会の理事に就任`, `${c}委員会の運営を協議する理事を務める。`],
        }[type];
        return { id: `a${k + 1}`, date: d, type, title: items[0], summary: items[1], sources: [src("国会会議録", `kokkai/${id}/a${k + 1}`, d, items[1])] };
      });

      const speeches = Math.max(0, Math.round(normal(60 * t.speech * (1.25 - veteran * 0.6), 18)));
      out.push({
        id, name, kana, house, district, party, terms, gender, birthYear, career, region,
        avatar: { skin: pick(SKIN), hair: age > 66 && r() < 0.6 ? pick(HAIR.slice(4, 6)) : pick(HAIR), style: gender === "女性" ? pick(["bob", "long", "short"]) : pick(["short", "short", "spiky"]), glasses: r() < 0.35 },
        catchphrase: r() < 0.5 ? { quote: pick(CATCH), source: { title: "国会会議録", url: `https://example.jp/kokkai/${id}/catch`, date: date(2024, 2026) } } : null,
        fields, promises, achievements,
        activity: { speeches, since: "2024-11-01", source: { title: "国会会議録検索システム", url: `https://example.jp/kokkai/search/${id}` } },
        review: { reviewed: r() < 0.3, generatedAt: "2026-10-01", model: "sample" },
      });
    }
  }
  return out;
}
