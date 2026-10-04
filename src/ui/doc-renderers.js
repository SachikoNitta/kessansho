// 資料の種類ごとの表示。種類は登録制で、新しい種類は createDocRenderers に足すだけ（シートや画面は変えない）。
// レンダラーは (doc, ctx) => Node[]。ctx.inference(id) は、得ている推論ならその一行、なければ null。

import { el } from "./dom.js";
import { photoFrame } from "./photo.js";
import { graph as drawGraph } from "./charts.js";

const isNumeric = (s) => /^[−\-]?[\d.,]+(%|万|億)?$/.test(String(s));

function table(doc) {
  const numericCol = doc.columns.map((_, c) => c > 0 && doc.rows.every((r) => isNumeric(r[c])));
  // 「項目｜説明」のような2列の文章の表は、説明の列を広く取る
  const textPair = doc.columns.length === 2 && !numericCol[1];
  const cols = textPair ? "minmax(0,0.7fr) minmax(0,1.6fr)"
    : doc.columns.map((_, i) => (i === 0 ? "minmax(0,1.3fr)" : "minmax(0,1fr)")).join(" ");
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

/** Web サイトのスクリーンショット風：ブラウザの枠の中に、会社のサイトのファーストビュー */
function site(doc) {
  return [el("div", { class: "site" }, [
    el("div", { class: "site-bar", "aria-hidden": "true" }, [
      el("span", { class: "site-dots" }, [el("i"), el("i"), el("i")]),
      el("span", { class: "site-url" }, doc.url),
    ]),
    el("div", { class: "site-page" }, [
      el("div", { class: "site-nav" }, [
        el("span", { class: "site-logo" }, doc.brand),
        el("span", { class: "site-links" }, doc.nav.map((n) => el("span", {}, n))),
      ]),
      el("div", { class: "site-hero" }, [
        el("div", { class: "site-headline" }, doc.headline),
        el("div", { class: "site-lead" }, doc.lead),
        el("div", { class: "site-badges" }, doc.badges.map((b) => el("span", {}, b))),
        el("span", { class: "site-cta" }, doc.cta),
      ]),
    ]),
  ])];
}

/** 公開したレポートのスクリーンショット（ブラウザの枠に、見出し・要旨・結論・注記） */
function report(doc) {
  return [el("div", { class: "site report" }, [
    el("div", { class: "site-bar", "aria-hidden": "true" }, [
      el("span", { class: "site-dots" }, [el("i"), el("i"), el("i")]),
      el("span", { class: "site-url" }, doc.url),
    ]),
    el("div", { class: "report-page" }, [
      el("div", { class: "report-mast" }, [
        el("span", { class: "report-brand" }, doc.publisher),
        el("span", { class: "report-date" }, doc.date),
      ]),
      el("span", { class: "report-tag" }, doc.tag),
      el("div", { class: "report-title" }, doc.title),
      el("ol", { class: "report-points" }, doc.points.map((pt) => el("li", {}, pt))),
      el("div", { class: "report-conclusion" }, [el("b", {}, "結論　"), doc.conclusion]),
      doc.disclaimer && el("div", { class: "report-disclaimer" }, doc.disclaimer),
    ]),
  ])];
}

/** 写真：ポラロイド風の枠。image（画像のパス）があれば画像、なければ illustration のスケッチ */
function photo(doc) {
  return [photoFrame(doc)];
}

/** グラフの資料（答えに関わらない数字だけをグラフにする） */
function graph(doc) {
  return [doc.caption && el("div", { class: "caption" }, doc.caption), drawGraph(doc.graph)].filter(Boolean);
}

/** @returns {Object<string, (doc: object, ctx: { inference: (id: string) => string|null }) => Node[]>} */
export function createDocRenderers(extra = {}) {
  return { table, article, inferences, site, report, photo, graph, ...extra };
}

/** 標準で表示できる資料の種類（ケースの検証に使う） */
export const DOC_TYPES = ["table", "article", "inferences", "site", "report", "photo", "graph"];
