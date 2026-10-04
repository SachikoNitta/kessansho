import { test } from "node:test";
import assert from "node:assert/strict";
import { createCaseBuilder, stockChart, limitQuote } from "../src/authoring/case-builder.js";
import { CaseSession } from "../src/core/session.js";
import { createConditionEvaluator } from "../src/core/conditions.js";

const conditions = createConditionEvaluator();

// テスト用の小さなケース
function sampleCase() {
  const { pages, choice, route, end, build } = createCaseBuilder();
  pages("s1", "c", [["a"]], "q1");
  choice("q1", "c", {
    recap: "r", prompt: "p", next: "s2", docs: ["d1"],
    options: [
      { label: "外れ", judge: "x", text: ["違う"] },
      { label: "正解", judge: "o", gain: "A", text: ["そう"] },
    ],
  });
  pages("s2", "c", [["b", { text: "秘密", ifFlag: "ally" }]], "q2");
  choice("q2", "c", {
    recap: "r", prompt: "p", retry: false, next: "final", docs: ["d2", "d1"],
    options: [
      { label: "推論Aが要る", judge: "o", requires: "A", flags: ["ally"] },
      { label: "罠", judge: "x", flags: ["trap"] },
    ],
  });
  route("final", "c", [{ if: { flag: "trap" }, go: "bad" }, { go: "good" }]);
  pages("good", "c", [["良い"]], "fin");
  pages("bad", "c", [["悪い"]], "fin");
  end("fin", "c");
  return build({ id: "t", start: "s1", startConfidence: 5, chapters: { c: { label: "C", title: "" } }, inferences: { A: "推論A" }, endings: { good: "良", bad: "悪" } });
}

test("外れを選ぶと確度が下がり、分岐に戻って消し線になる", () => {
  const s = new CaseSession(sampleCase(), { conditions });
  s.advance();
  s.choose(0);
  assert.equal(s.confidence, 4);
  assert.equal(s.lastChoice, "外れ");
  assert.ok(s.showsChoiceBubble());
  s.advance();
  assert.equal(s.sceneId, "q1");
  assert.deepEqual(s.options().map((o) => o.used), [true, false]);
  assert.deepEqual(s.choose(0), [], "消し線の選択肢は選べない");
});

test("正解で推論を得て、イベントを返す", () => {
  const s = new CaseSession(sampleCase(), { conditions });
  s.advance();
  const events = s.choose(1);
  assert.deepEqual(events, [{ type: "inference", id: "A" }]);
  assert.equal(s.confidence, 6);
  assert.ok(s.hasInference("A"));
});

test("必要な推論がない選択肢は出ない", () => {
  const def = sampleCase();
  const s = new CaseSession(def, { conditions, snapshot: { ...CaseSession.initialState(def), scene: "q2" } });
  assert.deepEqual(s.options().map((o) => o.option.label), ["罠"]);
});

test("route がフラグで結末を選び、ending イベントを返す", () => {
  const def = sampleCase();
  const s = new CaseSession(def, { conditions, snapshot: { ...CaseSession.initialState(def), scene: "q2" } });
  const events = s.choose(1);
  assert.equal(s.sceneId, "bad");
  assert.equal(s.ending, "bad");
  assert.deepEqual(events, [{ type: "ending", id: "bad" }]);
});

test("条件つき段落はフラグがあるときだけ出る", () => {
  const def = sampleCase();
  const at = (flags) => new CaseSession(def, { conditions, snapshot: { ...CaseSession.initialState(def), scene: "s2", flags } });
  assert.equal(at([]).paragraphs().length, 1);
  assert.equal(at(["ally"]).paragraphs().length, 2);
});

test("snapshot から同じ状態を復元できる。壊れた snapshot は最初から", () => {
  const def = sampleCase();
  const a = new CaseSession(def, { conditions });
  a.advance();
  a.choose(1);
  const b = new CaseSession(def, { conditions, snapshot: a.snapshot() });
  assert.deepEqual(b.snapshot(), a.snapshot());
  const c = new CaseSession(def, { conditions, snapshot: { scene: "存在しない" } });
  assert.equal(c.sceneId, "s1");
});

test("条件評価器は未知の条件を拒み、種類を足せる", () => {
  assert.throws(() => conditions.evaluate({ nope: 1 }, { flags: [], inferences: [], confidence: 0 }));
  const extended = createConditionEvaluator({ always: () => true });
  assert.equal(extended.evaluate({ always: true }, { flags: [], inferences: [], confidence: 0 }), true);
  assert.deepEqual(conditions.unknownKinds({ any: [{ flag: "a" }, { nope: 1 }] }), ["nope"]);
});

test("分岐で出てきた資料を覚え、古い snapshot にも対応する", () => {
  const def = sampleCase();
  const s = new CaseSession(def, { conditions });
  assert.deepEqual(s.seenDocs, []);
  s.advance();
  assert.deepEqual(s.seenDocs, ["d1"]);
  s.choose(1);
  s.advance();
  s.advance();
  assert.deepEqual(s.seenDocs, ["d1", "d2"]);
  const old = { ...CaseSession.initialState(def), scene: "q2" };
  delete old.docs;
  assert.deepEqual(new CaseSession(def, { conditions, snapshot: old }).seenDocs, ["d2", "d1"]);
});

test("株価チャートの段落は、毎回同じ形で、前日終値と終値を必ず通る", () => {
  const a = stockChart({ name: "N", keys: [4800, 3900, 3840], seed: 3 });
  const b = stockChart({ name: "N", keys: [4800, 3900, 3840], seed: 3 });
  assert.deepEqual(a, b);
  assert.equal(a.chart.points[0], 4800);
  assert.equal(a.chart.points.at(-1), 3840);
  assert.deepEqual(JSON.parse(JSON.stringify(a)), a);
  const flat = stockChart({ name: "N", keys: [4800, 4100, 4100], noise: 0 });
  assert.ok(flat.chart.points.slice(-5).every((v) => v === 4100));
});

test("値がつかなかった日の段落は、JSON にできる気配値と板のデータになる", () => {
  const q = limitQuote({ name: "N", close: 4800, limit: 4100, sell: 2846500, buy: 3200 });
  assert.equal(q.chart.kind, "quote");
  assert.deepEqual(JSON.parse(JSON.stringify(q)), q);
  assert.throws(() => limitQuote({ name: "N", close: 4800, limit: 4800, sell: 1, buy: 1 }));
});

test("本文の次がそのまま分岐なら、その分岐を先に見て、まとめて選べる", () => {
  const { pages, choice, end, build } = createCaseBuilder();
  pages("a", "c", [["前置き"], ["問いの前の一文"]], "q");
  choice("q", "c", { recap: "問いの前の一文", prompt: "どれ？", next: "fin", options: [{ label: "x", judge: "x", text: ["違う"] }, { label: "o", judge: "o" }] });
  end("fin", "c");
  const def = build({ id: "t", start: "a", chapters: { c: { label: "c" } }, inferences: {} });
  const s = new CaseSession(def, { conditions });
  assert.equal(s.nextChoiceId(), null, "1画面目の次は本文");
  s.advance();
  assert.equal(s.nextChoiceId(), "q");
  assert.deepEqual(s.options("q").map((o) => o.option.label), ["x", "o"]);
  s.advance();
  s.choose(0);
  assert.equal(s.nextChoiceId(), "q", "外した答えの本文からも、同じ分岐に戻る");
  assert.equal(s.options("q")[0].used, true);
});

test("本文に差し込んだ資料も、出てきた資料として覚える", () => {
  const { pages, end, build } = createCaseBuilder();
  pages("a", "c", [["x"], ["y", { doc: "site" }, { doc: "secret", ifFlag: "f" }]], "fin");
  end("fin", "c");
  const def = build({ id: "t", start: "a", chapters: { c: { label: "C", title: "" } }, inferences: {} });
  const s = new CaseSession(def, { conditions });
  assert.deepEqual(s.seenDocs, []);
  s.advance();
  assert.deepEqual(s.seenDocs, ["site"], "条件つきで見えない資料は覚えない");
});

test("章のはじめからやり直すと、その章に入ったときの状態に戻る", () => {
  const { pages, choice, end, build } = createCaseBuilder();
  pages("p", "c1", [["一章"]], "q");
  choice("q", "c1", { recap: "r", prompt: "p", next: "n", options: [
    { label: "外れ", judge: "x", text: ["違う"] },
    { label: "正解", judge: "o", gain: "A", text: ["そう"] },
  ] });
  pages("n", "c2", [["二章"]], "q2");
  choice("q2", "c2", { recap: "r", prompt: "p", retry: false, next: "fin", options: [
    { label: "印", judge: "o", flags: ["f"] }, { label: "無印", judge: "x" },
  ] });
  end("fin", "c3");
  const def = build({ id: "t", start: "p", startConfidence: 5, chapters: { c1: { label: "1", title: "" }, c2: { label: "2", title: "" }, c3: { label: "3", title: "" } }, inferences: { A: "推論A" } });

  const s = new CaseSession(def, { conditions });
  s.advance(); s.choose(0); s.advance(); s.choose(1); s.advance(); s.advance();
  assert.equal(s.sceneId, "q2");
  assert.equal(s.confidence, 5, "外れ −1 と正解 +1");
  s.choose(0);
  assert.deepEqual(s.chapters().map((c) => c.chapter), ["c1", "c2", "c3"]);

  s.restartChapter("c2");
  assert.equal(s.sceneId, "n");
  assert.ok(s.hasInference("A"), "一章で得た推論は残る");
  assert.ok(!s.hasFlag("f"), "二章で立てたフラグは消える");
  assert.deepEqual(s.chapters().map((c) => c.chapter), ["c1", "c2"], "後の章の記録は消える");

  s.restartChapter("c1");
  assert.equal(s.sceneId, "p");
  assert.equal(s.confidence, 5);
  assert.ok(!s.hasInference("A"));

  const again = new CaseSession(def, { conditions, snapshot: s.snapshot() });
  assert.deepEqual(again.chapters().map((c) => c.chapter), ["c1"]);
});
