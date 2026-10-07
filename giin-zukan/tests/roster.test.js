import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import {
  classifyCareer, kanjiNumber, normKana, parseBirth, parseShugiinKaiha, parseShugiinList, parseShugiinProfile, regionOf,
} from "../scripts/roster-lib.js";
import { validateData } from "../scripts/lib.js";

test("漢数字を読む", () => {
  assert.equal(kanjiNumber("二十九"), 29);
  assert.equal(kanjiNumber("十"), 10);
  assert.equal(kanjiNumber("四十四"), 44);
  assert.equal(kanjiNumber("元"), 1);
});

test("経歴の書き出しから生年を読む（和暦・西暦・月日の有無）", () => {
  assert.equal(parseBirth("昭和二十九年六月岡山県岡山市に生まれる"), "1954-06");
  assert.equal(parseBirth("昭和40年8月18日東京都墨田区生まれ。"), "1965-08-18");
  assert.equal(parseBirth("昭和三十六年生まれ。下関西高校卒、昭和五十九年東京大学"), "1961");
  assert.equal(parseBirth("1967年11月28日、東京都生まれ。90年、青山学院大学"), "1967-11-28");
  assert.equal(parseBirth("平成元年三月生まれ"), "1989-03");
  assert.equal(parseBirth("東京都生まれ"), null);
});

test("選挙区から地域（比例ブロック）を決める", () => {
  assert.equal(regionOf("衆議院", "岡山1"), "中国");
  assert.equal(regionOf("衆議院", "（比）北関東"), "北関東");
  assert.equal(regionOf("参議院", "比例"), "全国（参院比例）");
  assert.equal(regionOf("参議院", "徳島・高知"), "四国");
  assert.equal(regionOf("参議院", "神奈川"), "南関東");
});

test("前職は、当選より前で最後に出てくる職業の手がかりを採る", () => {
  assert.equal(classifyCareer("東京大学法学部卒業後大蔵省入省。主計官等○平成十七年当選"), "官僚");
  assert.equal(classifyCareer("株式会社東芝入社。のち弁護士登録。県議会議員二期。初当選"), "地方議員・首長");
  assert.equal(classifyCareer("慶應義塾大学卒業、松下政経塾"), "その他");
  assert.equal(classifyCareer("医師。○当選後、厚生労働省政務官"), "医師・医療");
});

test("かなは、カタカナ・空白の違いを無視して比べる", () => {
  assert.equal(normKana("アカマ ジロウ"), normKana("あかま　じろう"));
});

const SHU_ROW = `<TR VALIGN = top><TD class="sh1td5"><TT class="sh1tt1"><a href='../../../../itdb_giinprof.nsf/html/profile/004.html'>青山 繁晴君</a> </TT></TD>
<TD class="sh1td6"><TT class="sh1tt1">あおやま しげはる </TT></TD><TD class="sh1td7"><TT class="sh1tt1"><CENTER>自民 </CENTER></TT></TD>
<TD class="sh1td5"><TT class="sh1tt1">兵庫8 </TT></TD><TD class="sh1td8"><TT class="sh1tt1"><CENTER>1（参2） </CENTER></TT></TD></TR>`;

test("衆議院の議員一覧の行を読む", () => {
  const [r] = parseShugiinList(SHU_ROW, "https://www.shugiin.go.jp/internet/itdb_annai.nsf/html/statics/syu/1giin.htm");
  assert.deepEqual(
    [r.name, r.kana, r.kaiha, r.district, r.terms, r.termsOther, r.profileUrl],
    ["青山 繁晴", "あおやま しげはる", "自民", "兵庫8", 1, 2, "https://www.shugiin.go.jp/internet/itdb_giinprof.nsf/html/profile/004.html"],
  );
});

test("衆議院の紹介ページと会派別人数を読む", () => {
  const p = parseShugiinProfile("<p>逢沢 一郎（あいさわ いちろう） 選出、自由民主党 昭和二十九年六月岡山県に生まれる○当選十四回 （令和8年4月現在）</p>");
  assert.equal(p.birth, "1954-06");
  assert.match(p.bio, /^昭和二十九年六月/);
  const k = parseShugiinKaiha("会派名 会派略称 所属議員数 自由民主党・無所属の会 自民 315（39） 中道 中道 47（8） 無所属 6（0） 欠員 1 計 465（68）");
  assert.deepEqual(k.map((x) => [x.abbr, x.seats, x.women]), [["自民", 315, 39], ["中道", 47, 8], ["無所属", 6, 0]]);
});

test("取り込んだ実在の議員データは形が正しい", { skip: !existsSync(new URL("../data/members.json", import.meta.url)) }, () => {
  const data = JSON.parse(readFileSync(new URL("../data/members.json", import.meta.url)));
  assert.deepEqual(validateData(data), []);
  assert.equal(data.meta.sample, false);
  for (const m of data.members) assert.equal((m.promises ?? []).length, 0, "名簿の取り込みでは公約を作らない");
});

import {
  birthPrefecture, electedBy, electionYears, hometown, ministerialLevel, studiedAbroad, university,
} from "../scripts/roster-lib.js";
import { billsFrom, parseShugiinQuestionList, sanQuestions, splitNames, warekiDate } from "../scripts/activity-lib.js";

test("紹介ページ末尾の当選の回次から、当選した年を読む（繰上・補欠の印つきも）", () => {
  assert.deepEqual(electionYears("○当選一回（51）参二回（24 26）"), [2016, 2022, 2026]);
  assert.deepEqual(electionYears("○当選五回（46 47 48繰49 51）"), [2012, 2014, 2017, 2021, 2026]);
  assert.deepEqual(electionYears("○当選八回（43補44 45）"), [2003, 2005, 2009]);
});

test("選ばれ方", () => {
  assert.equal(electedBy("衆議院", "岡山1"), "衆・小選挙区");
  assert.equal(electedBy("衆議院", "（比）北関東"), "衆・比例代表");
  assert.equal(electedBy("参議院", "比例"), "参・比例代表");
  assert.equal(electedBy("参議院", "東京"), "参・選挙区");
});

test("大臣と、副大臣・政務官を分ける", () => {
  assert.equal(ministerialLevel("外務副大臣○財務大臣政務官"), "副大臣・政務官の経験あり");
  assert.equal(ministerialLevel("経済産業大臣、内閣府特命担当大臣"), "大臣の経験あり");
  assert.equal(ministerialLevel("総理大臣秘書官○大臣官房審議官"), "経歴に記載なし");
  assert.equal(ministerialLevel("通商産業政務次官"), "副大臣・政務官の経験あり");
});

test("出身大学（略し方・日本大学・附属校）", () => {
  assert.equal(university("昭和50年9月熊本生まれ、法政大卒、サントリー"), "法政大学");
  assert.equal(university("日本大学法学部卒業"), "日本大学");
  assert.equal(university("筑波大学附属高校卒業、東京大学法学部卒業"), "東京大学");
  assert.equal(university("昭和57年東京大学法学部卒業後大蔵省入省"), "東京大学");
  assert.equal(university("渋川看護専門学校卒業○看護師"), null);
  assert.ok(studiedAbroad("米国ハーバード大学大学院修了"));
  assert.ok(!studiedAbroad("東京大学法学部卒業"));
});

test("生まれた都道府県と、選挙区・比例ブロックとの関係", () => {
  assert.equal(birthPrefecture("昭和二十九年六月岡山県岡山市に生まれる"), "岡山");
  assert.equal(birthPrefecture("昭和50年9月熊本生まれ"), "熊本");
  assert.equal(hometown("衆議院", "岡山1", "岡山"), "地元（同じ都道府県・ブロック）生まれ");
  assert.equal(hometown("衆議院", "（比）中国", "岡山"), "地元（同じ都道府県・ブロック）生まれ");
  assert.equal(hometown("衆議院", "兵庫8", "東京"), "ほかの地域の生まれ");
  assert.equal(hometown("参議院", "鳥取・島根", "島根"), "地元（同じ都道府県・ブロック）生まれ");
  assert.equal(hometown("参議院", "比例", "東京"), "対象外（参院比例）");
  assert.equal(hometown("衆議院", "東京1", null), "出生地の記載なし");
});

test("和暦の日付と、提出者の名前の並び", () => {
  assert.equal(warekiDate("令和 8年 3月12日"), "2026-03-12");
  assert.equal(warekiDate("令和元年5月1日"), "2019-05-01");
  assert.deepEqual(splitNames("吉田はるみ君; 江田憲司君"), ["吉田はるみ", "江田憲司"]);
  assert.deepEqual(splitNames("吉田　はるみ君外四名"), ["吉田はるみ"]);
});

test("議員立法：委員会提出を除き、参法の日付は参議院のデータで補い、同じ議案は一度だけ数える", () => {
  const head = ["議案種類", "提出回次", "番号", "議案件名", "議案提出者", "議案提出者一覧", "衆議院議案受理年月日", "経過情報URL"];
  const shu = [head,
    ["衆法", "221", "3", "A法案", "古川　元久君外一名", "古川元久君; 臼木秀剛君", "令和 8年 3月 2日", "https://x/1"],
    ["衆法", "221", "3", "A法案", "古川　元久君外一名", "古川元久君; 臼木秀剛君", "令和 8年 3月 2日", "https://x/1"],
    ["衆法", "221", "4", "B法案", "文部科学委員長", "", "令和 8年 3月 5日", "https://x/2"],
    ["参法", "221", "7", "C法案", "浜口　誠君外一名", "", "", "https://x/3"],
    ["衆法", "218", "1", "古い法案", "誰か君", "誰か君", "", "https://x/4"]];
  const san = [["提出回次", "提出番号", "議案審議情報一覧 - 提出日"], [221, 7, "2026-04-01"]];
  const bills = billsFrom(shu, san, 219);
  assert.deepEqual(bills.map((b) => [b.kind, b.title, b.lead, b.sponsors, b.date]), [
    ["衆法", "A法案", "古川元久", ["古川元久", "臼木秀剛"], "2026-03-02"],
    ["参法", "C法案", "浜口誠", ["浜口誠"], "2026-04-01"],
  ]);
});

test("質問主意書の一覧を読む", () => {
  const html = `<tr><td>番号</td></tr><tr><td>1</td><td>行き過ぎた緊縮志向に関する質問主意書</td><td>緒方林太郎君</td><td>答弁受理</td><td><a href="221001.htm">経過</a></td></tr>`;
  const [q] = parseShugiinQuestionList(html, "https://www.shugiin.go.jp/internet/itdb_shitsumon.nsf/html/shitsumon/kaiji221_l.htm");
  assert.deepEqual([q.title, q.submitters, q.keikaUrl], ["行き過ぎた緊縮志向に関する質問主意書", ["緒方林太郎"], "https://www.shugiin.go.jp/internet/itdb_shitsumon.nsf/html/shitsumon/221001.htm"]);
  const [s] = sanQuestions([["提出回次", "件名", "提出者", "提出日", "明細URL"], ["221", "Q", "小西　洋之", "2026-07-24", "https://y"], ["218", "古い", "誰か", "2025-01-01", "https://z"]], 219);
  assert.deepEqual([s.session, s.submitters, s.date], [221, ["小西洋之"], "2026-07-24"]);
});

import { parseBillTextLinks } from "../scripts/activity-lib.js";

test("議案本文情報一覧から、要綱と本文のリンクを拾う", () => {
  const base = "https://www.shugiin.go.jp/internet/itdb_gian.nsf/html/gian/honbun/g22105026.htm";
  const html = `<a HREF="./houan/g22105026.htm">提出時法律案</a> <a HREF="./youkou/g22105026.htm">要綱</a> <a HREF="./syuuseian/13_8A62.htm">修正案1</a>`;
  assert.deepEqual(parseBillTextLinks(html, base), {
    outlineUrl: "https://www.shugiin.go.jp/internet/itdb_gian.nsf/html/gian/honbun/youkou/g22105026.htm",
    textUrl: "https://www.shugiin.go.jp/internet/itdb_gian.nsf/html/gian/honbun/houan/g22105026.htm",
  });
  assert.deepEqual(parseBillTextLinks(`<a href="./houan/g1.htm">本文</a>`, base).outlineUrl, null);
});

test("質問主意書の一覧から、質問と答弁の本文リンクも拾う", () => {
  const html = `<tr><td>1</td><td>Q</td><td>緒方林太郎君</td><td>答弁受理</td><td><a href="221001.htm">経過</a></td><td><a href="a221001.htm">質問 (HTML)</a></td><td><a href="../../../x/a221001.pdf/$File/a221001.pdf">PDF</a></td><td><a href="b221001.htm">答弁 (HTML)</a></td></tr>`;
  const [q] = parseShugiinQuestionList(html, "https://www.shugiin.go.jp/internet/itdb_shitsumon.nsf/html/shitsumon/kaiji221_l.htm");
  assert.equal(q.questionUrl, "https://www.shugiin.go.jp/internet/itdb_shitsumon.nsf/html/shitsumon/a221001.htm");
  assert.equal(q.answerUrl, "https://www.shugiin.go.jp/internet/itdb_shitsumon.nsf/html/shitsumon/b221001.htm");
});
