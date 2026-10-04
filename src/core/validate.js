// ケースの整合性チェック。参照切れ、到達不能なシーン、行き止まり、未知の条件や資料の種類を調べ、
// 全問正解の道筋を実際の CaseSession で遊んで、確度の最大値と到達する結末を求める。

import { CaseSession } from "./session.js";
import { createConditionEvaluator } from "./conditions.js";

/**
 * @param {import("./contracts.js").CaseDefinition} def
 * @param {{ conditions?: ReturnType<typeof createConditionEvaluator>, docTypes?: string[] }} [options]
 */
export function validateCase(def, { conditions = createConditionEvaluator(), docTypes } = {}) {
  const errors = [];
  const check = (ok, msg) => { if (!ok) errors.push(msg); };
  const scenes = def.scenes || {};
  const ids = Object.keys(scenes);

  for (const key of ["id", "start", "chapters", "inferences", "endings", "docs", "scenes"]) {
    check(def[key] != null, `${key} がありません`);
  }
  check(scenes[def.start], `start "${def.start}" がありません`);

  for (const [id, s] of Object.entries(scenes)) {
    check(def.chapters[s.chapter], `${id}: chapter "${s.chapter}" が未定義`);
    if (s.type === "text") {
      check(Array.isArray(s.paragraphs) && s.paragraphs.length, `${id}: paragraphs が空`);
      check(scenes[s.next], `${id}: next "${s.next}" がありません`);
      if (s.gain) check(def.inferences[s.gain], `${id}: gain "${s.gain}" が未定義`);
    } else if (s.type === "choice") {
      check(s.options.length >= 2, `${id}: 選択肢は2つ以上必要`);
      for (const o of s.options) {
        check(scenes[o.next], `${id}: 「${o.label}」の next "${o.next}" がありません`);
        if (o.requires) check(def.inferences[o.requires], `${id}: requires "${o.requires}" が未定義`);
      }
      for (const d of s.docs) check(def.docs[d], `${id}: 資料 "${d}" が未定義`);
      check(s.options.some((o) => !o.requires && o.next !== id && scenes[o.next] && scenes[o.next].next !== id),
        `${id}: 必ず先へ進める選択肢がありません`);
    } else if (s.type === "route") {
      for (const r of s.rules) {
        check(scenes[r.go], `${id}: route 先 "${r.go}" がありません`);
        for (const k of conditions.unknownKinds(r.if)) errors.push(`${id}: 未知の条件 "${k}"`);
      }
      check(s.rules.length && !s.rules[s.rules.length - 1].if, `${id}: 最後の rule は無条件にしてください`);
    } else if (s.type !== "end") {
      errors.push(`${id}: 不明な type "${s.type}"`);
    }
  }

  for (const id of Object.keys(def.endings || {})) check(scenes[id], `endings "${id}" のシーンがありません`);
  for (const [id, d] of Object.entries(def.docs || {})) {
    if (docTypes) check(docTypes.includes(d.type), `docs.${id}: 表示できない資料の種類 "${d.type}"`);
    if (d.type === "table") for (const r of d.rows) check(r.length === d.columns.length, `docs.${id}: 列数が合わない行 ${JSON.stringify(r)}`);
    if (d.type === "inferences") for (const i of d.items) check(def.inferences[i], `docs.${id}: 推論 "${i}" が未定義`);
  }

  if (errors.length) return { errors, stats: null };

  // 到達できるか・結末に辿り着けるか
  const nextsOf = (s) => (s.type === "text" ? [s.next]
    : s.type === "choice" ? s.options.map((o) => o.next)
    : s.type === "route" ? s.rules.map((r) => r.go) : []);

  const seen = new Set();
  const stack = [def.start];
  while (stack.length) {
    const id = stack.pop();
    if (seen.has(id)) continue;
    seen.add(id);
    stack.push(...nextsOf(scenes[id]));
  }
  for (const id of ids) check(seen.has(id), `${id}: start から到達できません`);

  const reachesEnd = new Set(ids.filter((id) => scenes[id].type === "end"));
  for (let changed = true; changed;) {
    changed = false;
    for (const id of ids) {
      if (!reachesEnd.has(id) && nextsOf(scenes[id]).some((n) => reachesEnd.has(n))) { reachesEnd.add(id); changed = true; }
    }
  }
  for (const id of ids) check(reachesEnd.has(id), `${id}: 結末に辿り着けません`);

  // 全問正解の道筋を実際に遊ぶ
  const session = new CaseSession(def, { conditions });
  for (let step = 0; session.scene.type !== "end"; step++) {
    if (step > 2000) { errors.push("全問正解の道筋が終わりません"); break; }
    if (session.scene.type === "text") session.advance();
    else {
      const opts = session.options().filter((o) => !o.used);
      session.choose((opts.find((o) => o.option.judge === "o") || opts[0]).index);
    }
  }

  return {
    errors,
    stats: {
      scenes: ids.length,
      inferences: Object.keys(def.inferences).length,
      docs: Object.keys(def.docs).length,
      maxConfidence: session.confidence,
      perfectEnding: session.ending,
    },
  };
}
