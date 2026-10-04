// 物語データの整合性チェック: 参照切れ・到達不能シーン・結末に辿り着けないループを検出する。
const STORY = require("../js/story.js");

const errors = [];
const scenes = STORY.scenes;
const ids = Object.keys(scenes);

function check(cond, msg) { if (!cond) errors.push(msg); }

check(scenes[STORY.start], `start "${STORY.start}" がありません`);

for (const [id, s] of Object.entries(scenes)) {
  check(STORY.chapters[s.chapter], `${id}: chapter "${s.chapter}" が未定義`);
  if (s.type === "text") {
    check(Array.isArray(s.paragraphs) && s.paragraphs.length, `${id}: paragraphs が空`);
    check(scenes[s.next], `${id}: next "${s.next}" がありません`);
    if (s.gain) check(STORY.inferences[s.gain], `${id}: gain "${s.gain}" が未定義`);
  } else if (s.type === "choice") {
    check(s.options && s.options.length >= 2, `${id}: 選択肢は2つ以上必要`);
    for (const o of s.options || []) check(scenes[o.next], `${id}: 選択肢 "${o.label}" の next "${o.next}" がありません`);
    if (s.docs) check(STORY.docs[s.docs], `${id}: docs "${s.docs}" が未定義`);
    const forward = (s.options || []).filter((o) => scenes[o.next] && scenes[o.next].next !== id);
    check(forward.length >= 1, `${id}: 先へ進む選択肢がありません`);
  } else if (s.type !== "end") {
    errors.push(`${id}: 不明な type "${s.type}"`);
  }
}

const nextsOf = (s) => (s.type === "text" ? [s.next] : s.type === "choice" ? s.options.map((o) => o.next) : []);

// start から到達できるか
const seen = new Set();
const stack = [STORY.start];
while (stack.length) {
  const id = stack.pop();
  if (seen.has(id) || !scenes[id]) continue;
  seen.add(id);
  stack.push(...nextsOf(scenes[id]));
}
for (const id of ids) check(seen.has(id), `${id}: start から到達できません`);

// どのシーンからも end に辿り着けるか
const reachesEnd = new Set(ids.filter((id) => scenes[id].type === "end"));
let changed = true;
while (changed) {
  changed = false;
  for (const id of ids) {
    if (!reachesEnd.has(id) && nextsOf(scenes[id]).some((n) => reachesEnd.has(n))) {
      reachesEnd.add(id);
      changed = true;
    }
  }
}
for (const id of ids) check(reachesEnd.has(id), `${id}: 結末に辿り着けません`);

for (const [id, d] of Object.entries(STORY.docs)) {
  for (const t of d.tabs) {
    if (t.type === "table") {
      for (const r of t.rows) check(r.length === t.columns.length, `docs.${id} "${t.label}": 列数が合わない行 ${JSON.stringify(r)}`);
    }
  }
}

if (errors.length) {
  console.error(errors.map((e) => "✗ " + e).join("\n"));
  process.exit(1);
}
console.log(`✓ ${ids.length} シーン、${Object.keys(STORY.inferences).length} 推論、${Object.keys(STORY.docs).length} 資料 — 問題なし`);
