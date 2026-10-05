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
