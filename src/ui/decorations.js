// 手描きの装飾（ワイヤーフレーム「曲線タイポ・アナログ版」）と、画面に共通する部品。

import { el, svg } from "./dom.js";
import { stockChart } from "./stock-chart.js";

const NAVY = "#2F3E5C";
const RED = "#8C3B2A";

/** ヘッダー下の波線 */
export function wave() {
  const line = { fill: "none", stroke: NAVY, "stroke-linecap": "round", "vector-effect": "non-scaling-stroke" };
  return svg("svg", { class: "wave", viewBox: "0 0 330 24", preserveAspectRatio: "none", "aria-hidden": "true" }, [
    svg("path", { ...line, d: "M 0 12 C 62 0, 110 24, 170 12 C 230 0, 290 4, 330 12", "stroke-width": "1.2", opacity: "0.85" }),
    svg("path", { ...line, d: "M 4 16 C 66 6, 112 28, 174 16", "stroke-width": "0.6", opacity: "0.5" }),
  ]);
}

/** 赤ペンの丸囲み（親の .circled いっぱいに伸びる） */
export function scribble() {
  const line = { fill: "none", stroke: RED, "stroke-linecap": "round", "vector-effect": "non-scaling-stroke" };
  return svg("svg", { class: "scribble", viewBox: "0 0 330 112", preserveAspectRatio: "none", "aria-hidden": "true" }, [
    svg("path", { ...line, d: "M 10 58 C 4 22, 76 6, 166 8 C 262 10, 324 22, 318 60 C 312 96, 246 108, 158 106 C 66 104, 16 94, 10 58 Z", "stroke-width": "1.6" }),
    svg("path", { ...line, d: "M 16 50 C 26 20, 106 4, 202 7", "stroke-width": "0.8", opacity: "0.6" }),
  ]);
}

/** 資料を見るボタンのクリップ */
export function clipIcon() {
  return svg("svg", { width: "16", height: "16", viewBox: "0 0 16 16", fill: "none", stroke: NAVY, "stroke-width": "1.3", "stroke-linecap": "round", "aria-hidden": "true" }, [
    svg("path", { d: "M5 2.5 L5 11 a2.5 2.5 0 0 0 5 0 L10 4 a1.6 1.6 0 0 0 -3.2 0 L6.8 10.5" }),
  ]);
}

/** 紙を留める大きなクリップ */
export function paperClip() {
  return svg("svg", { class: "clip", width: "26", height: "64", viewBox: "0 0 26 64", "aria-hidden": "true" }, [
    svg("path", { d: "M8 6 L8 48 a5 5 0 0 0 10 0 L18 12 a3.5 3.5 0 0 0 -7 0 L11 44", fill: "none", stroke: "#7D7A74", "stroke-width": "2.2", "stroke-linecap": "round" }),
  ]);
}

/** 「Chapter 1 違和感 ……… 資料 目次」のヘッダー。資料は一度でも出てきたら、いつでも開ける */
export function chapterHeader(chapter, { onMenu, onArchive, archiveCount = 0 }) {
  return el("header", { class: "header" }, [
    el("div", { class: "chapter" }, [
      el("span", { class: "it" }, chapter?.label || ""),
      el("span", { class: "title" }, chapter?.title || ""),
    ]),
    el("div", { class: "header-links" }, [
      archiveCount > 0 && el("button", { class: "link", onclick: onArchive, "aria-label": `資料（${archiveCount}件）` }, [
        clipIcon(), "資料", el("span", { class: "count", "aria-hidden": "true" }, String(archiveCount)),
      ]),
      el("button", { class: "link", onclick: onMenu }, "目次"),
    ]),
  ]);
}

export function turnThePage() {
  return el("div", { class: "turn blink", "aria-hidden": "true" }, [
    el("span", { class: "it" }, "turn the page"),
    el("span", { class: "hand" }, "→"),
  ]);
}

/** 本文の一段落。i 番目ほど遅れて浮かび上がる */
export function paragraph(p, i) {
  if (p.chart) return stockChart(p.chart, i * 0.35);
  const cls = ["reveal", p.muted && "muted", p.emphasis && "emphasis"].filter(Boolean).join(" ");
  return el("p", { class: cls, style: `animation-delay:${i * 0.35}s` }, p.text);
}
