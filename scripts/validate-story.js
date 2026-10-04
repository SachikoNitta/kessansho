// 物語データの整合性チェック：参照切れ、到達不能なシーン、結末に辿り着けない行き止まり、
// 確度の最大値（台本では開始5・全問正解で18）を検出する。
const STORY = require("../js/story.js");

const errors = [];
const scenes = STORY.scenes;
const ids = Object.keys(scenes);
const check = (cond, msg) => { if (!cond) errors.push(msg); };

check(scenes[STORY.start], `start "${STORY.start}" がありません`);

for (const [id, s] of Object.entries(scenes)) {
  check(STORY.chapters[s.chapter], `${id}: chapter "${s.chapter}" が未定義`);
  if (s.type === "text") {
    check(Array.isArray(s.paragraphs) && s.paragraphs.length, `${id}: paragraphs が空`);
    check(scenes[s.next], `${id}: next "${s.next}" がありません`);
    if (s.gain) check(STORY.inferences[s.gain], `${id}: gain "${s.gain}" が未定義`);
  } else if (s.type === "choice") {
    check(s.options.length >= 2, `${id}: 選択肢は2つ以上必要`);
    for (const o of s.options) {
      check(scenes[o.next], `${id}: 「${o.label}」の next "${o.next}" がありません`);
      if (o.requires) check(STORY.inferences[o.requires], `${id}: requires "${o.requires}" が未定義`);
    }
    for (const d of s.docs) check(STORY.docs[d], `${id}: 資料 "${d}" が未定義`);
    check(s.options.some((o) => !o.requires && o.next !== id && scenes[o.next] && scenes[o.next].next !== id),
      `${id}: 必ず先へ進める選択肢がありません`);
  } else if (s.type === "route") {
    for (const r of s.rules) check(scenes[r.go], `${id}: route 先 "${r.go}" がありません`);
    check(!s.rules[s.rules.length - 1].if, `${id}: 最後の rule は無条件にしてください`);
  } else if (s.type !== "end") {
    errors.push(`${id}: 不明な type "${s.type}"`);
  }
}

for (const id of Object.keys(STORY.endings)) check(scenes[id], `endings "${id}" のシーンがありません`);

for (const [id, d] of Object.entries(STORY.docs)) {
  if (d.type === "table") for (const r of d.rows) check(r.length === d.columns.length, `docs.${id}: 列数が合わない行 ${JSON.stringify(r)}`);
  if (d.type === "inferences") for (const i of d.items) check(STORY.inferences[i], `docs.${id}: 推論 "${i}" が未定義`);
}

const nextsOf = (s) => (s.type === "text" ? [s.next]
  : s.type === "choice" ? s.options.map((o) => o.next)
  : s.type === "route" ? s.rules.map((r) => r.go) : []);

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
for (let changed = true; changed;) {
  changed = false;
  for (const id of ids) {
    if (!reachesEnd.has(id) && nextsOf(scenes[id]).some((n) => reachesEnd.has(n))) { reachesEnd.add(id); changed = true; }
  }
}
for (const id of ids) check(reachesEnd.has(id), `${id}: 結末に辿り着けません`);

// 全問正解の道筋で、確度の最大値を数える
let conf = STORY.startConfidence;
for (let id = STORY.start, guard = 0; scenes[id] && scenes[id].type !== "end" && guard < 500; guard++) {
  const s = scenes[id];
  if (s.type === "choice") {
    const best = s.options.find((o) => o.judge === "o");
    conf += best.delta;
    id = best.next;
  } else if (s.type === "route") id = s.rules[s.rules.length - 1].go;
  else id = s.next;
}

if (errors.length) {
  console.error(errors.map((e) => "✗ " + e).join("\n"));
  process.exit(1);
}
console.log(`✓ ${ids.length} シーン、${Object.keys(STORY.inferences).length} 推論、${Object.keys(STORY.docs).length} 資料、全問正解の確度 ${conf} — 問題なし`);
