// 資料の種類ごとの表示。種類は登録制で、新しい種類は createDocRenderers に足すだけ（シートや画面は変えない）。
// レンダラーは (doc, ctx) => Node[]。ctx.inference(id) は、得ている推論ならその一行、なければ null。

import { el } from "./dom.js";

const isNumeric = (s) => /^[−\-]?[\d.,]+(%|万|億)?$/.test(String(s));

function table(doc) {
  const cols = doc.columns.map((_, i) => (i === 0 ? "minmax(0,1.3fr)" : "minmax(0,1fr)")).join(" ");
  const numericCol = doc.columns.map((_, c) => c > 0 && doc.rows.every((r) => isNumeric(r[c])));
  const row = (cells, head) => el("div", { class: "row" + (head ? " head" : ""), style: `--cols:${cols}` },
    cells.map((c, i) => el("span", { class: numericCol[i] ? "num" : i === 0 ? "" : "cell" }, c)));
  return [el("div", { class: "table" }, [row(doc.columns, true), ...doc.rows.map((r) => row(r, false))])];
}

function article(doc) {
  return [el("div", { class: "article" }, [
    el("div", { class: "head" }, doc.head),
    ...doc.body.map((line) => el("p", {}, line)),
  ])];
}

function inferences(doc, ctx) {
  const got = doc.items.map((id) => ctx.inference(id)).filter(Boolean);
  return [el("div", { class: "notebook" }, got.length
    ? got.map((text) => el("div", { class: "note" }, text))
    : [el("div", { class: "note locked" }, "まだ推論はない")])];
}

/** @returns {Object<string, (doc: object, ctx: { inference: (id: string) => string|null }) => Node[]>} */
export function createDocRenderers(extra = {}) {
  return { table, article, inferences, ...extra };
}

/** 標準で表示できる資料の種類（ケースの検証に使う） */
export const DOC_TYPES = ["table", "article", "inferences"];
