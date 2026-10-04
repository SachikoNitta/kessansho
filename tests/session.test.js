import { test } from "node:test";
import assert from "node:assert/strict";
import { createCaseBuilder } from "../src/authoring/case-builder.js";
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

test("選んだ答えの判定を返し、採点しない分岐では null", () => {
  const def = sampleCase();
  const s = new CaseSession(def, { conditions });
  s.advance();
  s.choose(0);
  assert.equal(s.lastJudge, "x");
  s.advance();
  s.choose(1);
  assert.equal(s.lastJudge, "o");
  const ungraded = { ...def, scenes: { ...def.scenes, q2: { ...def.scenes.q2, graded: false } } };
  const u = new CaseSession(ungraded, { conditions, snapshot: { ...CaseSession.initialState(def), scene: "q2", inferences: ["A"] } });
  u.choose(0);
  assert.equal(u.lastJudge, null);
});
