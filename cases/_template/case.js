// 新しいケースの雛形。cases/<ケースid>/case.js にコピーして書き換え、cases/catalog.js に1行足す。
// 書き方は src/authoring/case-builder.js の冒頭を参照。`npm test` がこの雛形も検証する。

import { createCaseBuilder } from "../../src/authoring/case-builder.js";

const { pages, choice, route, end, build } = createCaseBuilder();

pages("pro", "c1", [
  ["導入の一段落目。", "二段落目。"],
  [{ text: "問いの直前の一文。", muted: true }],
], "q1");

choice("q1", "c1", {
  recap: "問いの直前の一文。",
  prompt: "問い。",
  docs: ["sample"],
  next: "after_q1",
  options: [
    { label: "正解の選択肢", judge: "o", gain: "A", text: ["正解したあとの本文。"] },
    { label: "惜しい選択肢", judge: "tri", text: ["惜しい理由。分岐に戻る。"] },
    { label: "誤りの選択肢", judge: "x", text: ["誤りの理由。分岐に戻る。"] },
  ],
});

pages("after_q1", "c1", [["章の終わり。"]], "final");

route("final", "final", [
  { if: { confidenceBelow: 1 }, go: "end_b" },
  { go: "end_a" },
]);

pages("end_a", "final", [["結末Aの本文。"]], "fin");
pages("end_b", "final", [["結末Bの本文。"]], "fin");
end("fin", "final");

export default build({
  id: "template",
  start: "pro",
  startConfidence: 0,
  chapters: {
    c1: { label: "Chapter 1", title: "章題" },
    final: { label: "Final", title: "決着" },
  },
  inferences: { A: "推論の一行" },
  endings: { end_a: "結末A", end_b: "結末B" },
  endNote: "",
  docs: {
    sample: {
      label: "資料名", source: "出典", type: "table",
      caption: "表の説明・単位",
      columns: ["項目", "前期", "今期"],
      rows: [["売上高", "10", "12"]],
    },
  },
});
