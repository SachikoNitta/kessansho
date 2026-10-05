import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  EXTRACTION_SCHEMA, htmlToText, quoteFound, speechesToDocs, upsertMember, validateData, verifyExtraction,
} from "../scripts/lib.js";

const docs = [
  { id: "S1", title: "衆議院 厚生労働委員会 第5号", url: "https://kokkai.ndl.go.jp/txt/1", date: "2025-03-12", text: "○春日井委員　いわゆる隠れ待機児童の\n実態調査を求めます。" },
  { id: "W1", title: "選挙公報", url: "https://example.jp/koho", date: "2024-10-15", text: "保育士の給与を月３万円引き上げます。" },
];

test("引用は空白や全角半角の違いを無視して原文と照合する", () => {
  assert.ok(quoteFound("隠れ待機児童の実態調査を求めます", docs[0].text));
  assert.ok(quoteFound("月3万円引き上げます", docs[1].text));
  assert.ok(!quoteFound("月5万円引き上げます", docs[1].text));
  assert.ok(!quoteFound("保育", docs[1].text), "短すぎる引用は根拠にしない");
});

test("原文にない引用の出典は捨て、出典が残らない項目は丸ごと捨てる", () => {
  const out = verifyExtraction({
    catchphrase: { quote: "でっちあげの一言", docId: "S1" },
    fields: ["保育"],
    promises: [
      { title: "保育士の賃上げ", detail: "", field: "保育", madeAt: "2024-10-15", madeIn: "選挙公報", status: "achieved", statusNote: "実現した",
        sources: [{ docId: "W1", quote: "保育士の給与を月3万円引き上げます" }], evidence: [{ docId: "S1", quote: "賃上げは実現しました" }] },
      { title: "架空の公約", detail: "", field: "", madeAt: "", madeIn: "", status: "in_progress", statusNote: "",
        sources: [{ docId: "S9", quote: "存在しない資料" }], evidence: [] },
    ],
    achievements: [
      { date: "2025-03-12", type: "question", title: "隠れ待機児童を質問", summary: "", sources: [{ docId: "S1", quote: "実態調査を求めます" }] },
    ],
  }, docs);

  assert.equal(out.promises.length, 1);
  assert.equal(out.promises[0].status, "unverifiable", "根拠が確かめられない判定は保留にする");
  assert.equal(out.promises[0].sources[0].url, "https://example.jp/koho");
  assert.equal(out.achievements.length, 1);
  assert.equal(out.catchphrase, null);
  assert.ok(out.dropped.some((d) => d.reason === "存在しない資料ID"));
});

test("会議録 API の応答を資料にする", () => {
  const [d] = speechesToDocs({ speechRecord: [{ nameOfHouse: "参議院", nameOfMeeting: "本会議", issue: "第3号", speechURL: "https://kokkai.ndl.go.jp/txt/x", date: "2025-01-01", speech: "発言" }] }, 5);
  assert.deepEqual([d.id, d.title, d.url, d.text], ["S5", "参議院 本会議 第3号", "https://kokkai.ndl.go.jp/txt/x", "発言"]);
});

test("HTML から本文を取り出す", () => {
  assert.equal(htmlToText("<style>x{}</style><p>公約&amp;政策</p><script>alert(1)</script><li>一つ目</li>"), "公約&政策\n一つ目");
});

test("構造化出力のスキーマは全オブジェクトで additionalProperties:false と required を持つ", () => {
  const walk = (s, path) => {
    if (s.type === "object") {
      assert.equal(s.additionalProperties, false, path);
      assert.deepEqual([...s.required].sort(), Object.keys(s.properties).sort(), path);
      for (const [k, v] of Object.entries(s.properties)) walk(v, `${path}.${k}`);
    }
    if (s.type === "array") walk(s.items, `${path}[]`);
  };
  walk(EXTRACTION_SCHEMA, "$");
});

test("サンプルのデータは形が正しく、すべての公約と実績に出典がある", () => {
  const data = JSON.parse(readFileSync(new URL("../data/sample.json", import.meta.url)));
  assert.deepEqual(validateData(data), []);
});

test("根拠なしに実現と判定したデータは検証で落ちる", () => {
  const data = JSON.parse(readFileSync(new URL("../data/sample.json", import.meta.url)));
  data.members[0].promises[0].status = "achieved";
  data.members[0].promises[0].evidence = [];
  assert.ok(validateData(data).some((e) => e.includes("根拠の出典が要る")));
});

test("同じ id の議員は置き換える", () => {
  const data = { members: [{ id: "a", kana: "あ", v: 1 }, { id: "b", kana: "い" }] };
  const next = upsertMember(data, { id: "a", kana: "あ", v: 2 });
  assert.equal(next.members.length, 2);
  assert.equal(next.members.find((m) => m.id === "a").v, 2);
});

test("1行1人の書き出しは読み戻すと同じデータになる", async () => {
  const { serializeData } = await import("../scripts/lib.js");
  const data = { meta: { sample: true }, parties: [{ id: "x" }], members: [{ id: "a" }, { id: "b", n: "</script>" }] };
  const text = serializeData(data);
  assert.deepEqual(JSON.parse(text), data);
  assert.equal(text.trim().split("\n").length, 4);
});

test("サンプルの集団は衆参の定数どおりで、分析に使う属性がそろっている", () => {
  const data = JSON.parse(readFileSync(new URL("../data/sample.json", import.meta.url)));
  assert.equal(data.members.filter((m) => m.house === "衆議院").length, 465);
  assert.equal(data.members.filter((m) => m.house === "参議院").length, 248);
  for (const m of data.members) assert.ok(m.gender && m.birthYear && m.career && m.region && m.activity, m.id);
});
