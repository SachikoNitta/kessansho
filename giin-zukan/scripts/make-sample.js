// サンプル（架空の議員）データを作る。実在の人物・政党とは関係ありません。
import { writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { validateData } from "./lib.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = (title, path, date, quote) => ({ title, url: `https://example.jp/${path}`, date, quote });

const data = {
  meta: {
    sample: true,
    updatedAt: "2026-10-05",
    note: "このデータはデザイン確認用の架空のサンプルです。実在の人物・政党・出来事とは関係ありません。",
  },
  parties: [
    { id: "aozora", name: "あおぞら党", color: "#2F6FE4" },
    { id: "midori", name: "みどりの会", color: "#1E9E6A" },
    { id: "kurashi", name: "くらし改革党", color: "#E0782B" },
    { id: "independent", name: "無所属", color: "#7A7F99" },
  ],
  members: [
    {
      id: "kasugai-nagisa",
      name: "春日井 なぎさ",
      kana: "かすがい なぎさ",
      house: "衆議院",
      district: "架空県第3区",
      party: "aozora",
      terms: 2,
      avatar: { skin: "#F6D7BD", hair: "#3A2A2F", style: "bob", glasses: false },
      catchphrase: {
        quote: "保育園の空きを待つ一年は、子どもにとって一生の一年です。",
        source: { title: "衆議院 厚生労働委員会 第5号", url: "https://example.jp/kokkai/2025-03-12", date: "2025-03-12" },
      },
      fields: ["子育て", "保育", "働き方"],
      promises: [
        {
          id: "p1", title: "保育士の給与を月3万円引き上げ", field: "保育",
          detail: "保育士の処遇改善のため、公定価格を見直し月額3万円の賃上げを実現する。",
          madeAt: "2024-10-15", madeIn: "2024年衆院選 選挙公報",
          status: "in_progress",
          statusNote: "2025年度予算で月額1万円相当の改善が盛り込まれた。残りの引き上げは議論中。",
          sources: [src("選挙公報（2024年衆院選）", "koho/kasugai-2024", "2024-10-15", "保育士の給与を月3万円引き上げます")],
          evidence: [src("衆議院 予算委員会 第8号", "kokkai/2025-02-04", "2025-02-04", "まず月額一万円相当の改善を今年度予算に盛り込みました")],
        },
        {
          id: "p2", title: "病児保育を全市町村に", field: "子育て",
          detail: "子どもが熱を出しても親が休めない問題に対し、病児保育施設を全ての市町村に整備する。",
          madeAt: "2024-10-15", madeIn: "2024年衆院選 選挙公報",
          status: "achieved",
          statusNote: "病児保育の整備を自治体に義務づける改正法が2026年6月に成立した。",
          sources: [src("選挙公報（2024年衆院選）", "koho/kasugai-2024", "2024-10-15", "病児保育を、すべての市町村に")],
          evidence: [src("衆議院 本会議 第31号", "kokkai/2026-06-10", "2026-06-10", "児童福祉法の一部を改正する法律案は可決されました")],
        },
        {
          id: "p3", title: "男性育休の取得率50%", field: "働き方",
          detail: "企業への助成を拡充し、男性の育児休業取得率を5年以内に50%にする。",
          madeAt: "2024-11-02", madeIn: "公式サイト 政策ページ",
          status: "unverifiable",
          statusNote: "取得率の最新の統計が資料に見当たらず、判定を保留しています。",
          sources: [src("公式サイト 政策ページ", "kasugai/policy", "2024-11-02", "男性の育休取得率を五年以内に50%へ")],
          evidence: [],
        },
      ],
      achievements: [
        { id: "a1", date: "2026-06-10", type: "bill", title: "病児保育整備法案の共同提出者に", summary: "児童福祉法改正案の共同提出者として、委員会で趣旨を説明した。", sources: [src("衆議院 本会議 第31号", "kokkai/2026-06-10", "2026-06-10", "児童福祉法の一部を改正する法律案は可決されました")] },
        { id: "a2", date: "2025-03-12", type: "question", title: "待機児童の「隠れ待機」を質問", summary: "統計に表れない待機児童の数について、厚生労働大臣に調査を求めた。", sources: [src("衆議院 厚生労働委員会 第5号", "kokkai/2025-03-12", "2025-03-12", "いわゆる隠れ待機児童の実態調査を求めます")] },
        { id: "a3", date: "2025-05-20", type: "written_question", title: "保育士の離職率に関する質問主意書", summary: "保育士の離職理由の内訳を政府に問う質問主意書を提出した。", sources: [src("質問主意書 第112号", "shitsumon/112", "2025-05-20", "保育士の離職理由の内訳を示されたい")] },
      ],
      review: { reviewed: true, generatedAt: "2026-09-20", model: "sample" },
    },
    {
      id: "oba-takuma",
      name: "大庭 拓真",
      kana: "おおば たくま",
      house: "参議院",
      district: "架空県選挙区",
      party: "midori",
      terms: 1,
      avatar: { skin: "#E9C29F", hair: "#1F2430", style: "short", glasses: true },
      catchphrase: {
        quote: "電気代の明細は、この国のエネルギー政策の通知表です。",
        source: { title: "参議院 経済産業委員会 第3号", url: "https://example.jp/kokkai/2025-11-18", date: "2025-11-18" },
      },
      fields: ["エネルギー", "地方の産業", "防災"],
      promises: [
        {
          id: "p1", title: "屋根置き太陽光の補助を倍に", field: "エネルギー",
          detail: "住宅の屋根に置く太陽光パネルと蓄電池への補助を、現行の2倍に拡充する。",
          madeAt: "2025-07-01", madeIn: "2025年参院選 選挙公報",
          status: "stalled",
          statusNote: "補正予算での拡充は見送られたと本人が委員会で述べている。",
          sources: [src("選挙公報（2025年参院選）", "koho/oba-2025", "2025-07-01", "屋根の太陽光と蓄電池の補助を2倍に")],
          evidence: [src("参議院 経済産業委員会 第3号", "kokkai/2025-11-18", "2025-11-18", "今回の補正では拡充が見送られたことは残念です")],
        },
        {
          id: "p2", title: "避難所に蓄電池を常備", field: "防災",
          detail: "全国の指定避難所に、停電時に3日間使える蓄電池を配備する。",
          madeAt: "2025-07-01", madeIn: "2025年参院選 選挙公報",
          status: "in_progress",
          statusNote: "内閣府がモデル事業を始めたと答弁している。",
          sources: [src("選挙公報（2025年参院選）", "koho/oba-2025", "2025-07-01", "すべての避難所に、三日分の蓄電池を")],
          evidence: [src("参議院 災害対策特別委員会 第2号", "kokkai/2026-02-26", "2026-02-26", "本年度から避難所蓄電池のモデル事業を開始しております")],
        },
        {
          id: "p3", title: "地方の工場に再エネ電力を", field: "地方の産業",
          detail: "地方の中小工場が再エネ電力を安く買える仕組みをつくる法案を提出する。",
          madeAt: "2025-07-01", madeIn: "2025年参院選 選挙公報",
          status: "not_started",
          statusNote: "資料の範囲では、法案の提出は確認できない。",
          sources: [src("選挙公報（2025年参院選）", "koho/oba-2025", "2025-07-01", "地方の工場が再エネを安く使える法律をつくります")],
          evidence: [],
        },
      ],
      achievements: [
        { id: "a1", date: "2025-11-18", type: "question", title: "電気料金の内訳の公開を質問", summary: "再エネ賦課金と燃料費調整額の内訳を、明細で分かりやすく示すよう求めた。", sources: [src("参議院 経済産業委員会 第3号", "kokkai/2025-11-18", "2025-11-18", "明細に内訳を分かりやすく示すべきではありませんか")] },
        { id: "a2", date: "2026-02-26", type: "question", title: "避難所の電源確保を質問", summary: "能登型の長期停電を想定した避難所の電源について質した。", sources: [src("参議院 災害対策特別委員会 第2号", "kokkai/2026-02-26", "2026-02-26", "長期の停電を想定した避難所の電源をどう確保するのか")] },
      ],
      review: { reviewed: false, generatedAt: "2026-10-01", model: "sample" },
    },
    {
      id: "komiyama-shizuka",
      name: "小見山 静",
      kana: "こみやま しずか",
      house: "衆議院",
      district: "比例 架空ブロック",
      party: "kurashi",
      terms: 4,
      avatar: { skin: "#F1CFB3", hair: "#8C8C99", style: "long", glasses: true },
      catchphrase: {
        quote: "年金の通知は、読める日本語で届くべきです。",
        source: { title: "衆議院 厚生労働委員会 第12号", url: "https://example.jp/kokkai/2025-05-28", date: "2025-05-28" },
      },
      fields: ["年金", "介護", "行政の手続き"],
      promises: [
        {
          id: "p1", title: "年金通知をやさしい日本語に", field: "行政の手続き",
          detail: "ねんきん定期便などの通知を、専門用語を減らした書き方に改める。",
          madeAt: "2024-10-15", madeIn: "2024年衆院選 選挙公報",
          status: "achieved",
          statusNote: "2026年度分の通知から新しい様式に切り替わったと政府が答弁した。",
          sources: [src("選挙公報（2024年衆院選）", "koho/komiyama-2024", "2024-10-15", "年金の通知を、だれでも読める日本語に")],
          evidence: [src("衆議院 厚生労働委員会 第12号", "kokkai/2025-05-28", "2025-05-28", "令和八年度送付分から新様式に切り替えます")],
        },
        {
          id: "p2", title: "介護職の夜勤手当を国が上乗せ", field: "介護",
          detail: "介護施設の夜勤手当に国の上乗せ分を設け、人手不足を和らげる。",
          madeAt: "2024-10-15", madeIn: "2024年衆院選 選挙公報",
          status: "in_progress",
          statusNote: "介護報酬の改定に向けた審議会で検討項目に入った。",
          sources: [src("選挙公報（2024年衆院選）", "koho/komiyama-2024", "2024-10-15", "介護の夜勤手当に、国が上乗せを")],
          evidence: [src("衆議院 厚生労働委員会 第4号", "kokkai/2026-03-11", "2026-03-11", "夜勤体制の評価についても検討項目としております")],
        },
      ],
      achievements: [
        { id: "a1", date: "2025-05-28", type: "question", title: "年金通知の様式改善を質問", summary: "通知の文面を見直すよう求め、新様式への切り替え時期の答弁を得た。", sources: [src("衆議院 厚生労働委員会 第12号", "kokkai/2025-05-28", "2025-05-28", "令和八年度送付分から新様式に切り替えます")] },
        { id: "a2", date: "2025-01-24", type: "committee", title: "厚生労働委員会の理事に就任", summary: "委員会の運営を協議する理事を務めている。", sources: [src("衆議院 厚生労働委員会 第1号", "kokkai/2025-01-24", "2025-01-24", "小見山静君を理事に指名いたします")] },
        { id: "a3", date: "2026-03-11", type: "question", title: "介護の夜勤体制について質問", summary: "夜勤の人員配置基準と手当の実態について政府に質した。", sources: [src("衆議院 厚生労働委員会 第4号", "kokkai/2026-03-11", "2026-03-11", "夜勤体制の評価についても検討項目としております")] },
      ],
      review: { reviewed: true, generatedAt: "2026-09-12", model: "sample" },
    },
    {
      id: "takatori-kenji",
      name: "鷹取 ケンジ",
      kana: "たかとり けんじ",
      house: "参議院",
      district: "比例代表",
      party: "independent",
      terms: 3,
      avatar: { skin: "#D9A980", hair: "#4A3326", style: "spiky", glasses: false },
      catchphrase: {
        quote: "政治資金の領収書は、一円から見せればいい。",
        source: { title: "参議院 政治倫理及び選挙制度に関する特別委員会 第2号", url: "https://example.jp/kokkai/2025-04-09", date: "2025-04-09" },
      },
      fields: ["政治改革", "デジタル", "情報公開"],
      promises: [
        {
          id: "p1", title: "政治資金を1円から公開", field: "政治改革",
          detail: "政治資金収支報告書の領収書を1円から公開し、オンラインで検索できるようにする。",
          madeAt: "2022-06-22", madeIn: "2022年参院選 選挙公報",
          status: "in_progress",
          statusNote: "オンライン公開は始まったが、1円からの公開は法改正に至っていない。",
          sources: [src("選挙公報（2022年参院選）", "koho/takatori-2022", "2022-06-22", "政治資金の領収書を、1円から公開")],
          evidence: [src("参議院 政治倫理及び選挙制度に関する特別委員会 第2号", "kokkai/2025-04-09", "2025-04-09", "オンラインでの閲覧は始まりましたが、一円からの公開には至っておりません")],
        },
        {
          id: "p2", title: "国会の採決記録をデータで公開", field: "情報公開",
          detail: "誰がどの法案に賛成・反対したかを、機械で読めるデータで公開する。",
          madeAt: "2022-06-22", madeIn: "2022年参院選 選挙公報",
          status: "achieved",
          statusNote: "参議院の押しボタン採決の結果がCSVで公開されるようになった。",
          sources: [src("選挙公報（2022年参院選）", "koho/takatori-2022", "2022-06-22", "国会の採決記録を、だれでも使えるデータに")],
          evidence: [src("参議院 議院運営委員会 第9号", "kokkai/2024-05-15", "2024-05-15", "押しボタン式投票の結果をCSV形式でも公開することといたします")],
        },
        {
          id: "p3", title: "行政手続きのはんこを全廃", field: "デジタル",
          detail: "国の行政手続きで残る押印を全てなくす。",
          madeAt: "2022-06-22", madeIn: "2022年参院選 選挙公報",
          status: "unverifiable",
          statusNote: "残っている押印手続きの数が資料で確かめられず、判定を保留しています。",
          sources: [src("選挙公報（2022年参院選）", "koho/takatori-2022", "2022-06-22", "国の手続きから、はんこをゼロに")],
          evidence: [],
        },
      ],
      achievements: [
        { id: "a1", date: "2025-04-09", type: "question", title: "政治資金の公開範囲を質問", summary: "領収書の公開基準を1円に下げるべきだと政府と各会派に問うた。", sources: [src("参議院 政治倫理及び選挙制度に関する特別委員会 第2号", "kokkai/2025-04-09", "2025-04-09", "一円からの公開には至っておりません")] },
        { id: "a2", date: "2023-11-29", type: "bill", title: "政治資金規正法改正案を提出", summary: "領収書の全面公開を定める議員立法を提出した（審査未了）。", sources: [src("参議院 議案情報", "gian/2023-28", "2023-11-29", "政治資金規正法の一部を改正する法律案（鷹取ケンジ君外二名発議）")] },
        { id: "a3", date: "2024-02-14", type: "written_question", title: "押印が残る手続きの数を問う質問主意書", summary: "国の行政手続きのうち押印が必要なものの件数を問うた。", sources: [src("質問主意書 第27号", "shitsumon/27", "2024-02-14", "押印を要する手続の件数を示されたい")] },
      ],
      review: { reviewed: false, generatedAt: "2026-10-02", model: "sample" },
    },
  ],
};

const errors = validateData(data);
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
await writeFile(join(ROOT, "data", "members.json"), `${JSON.stringify(data, null, 2)}\n`);
console.log("data/members.json を書き出しました");
