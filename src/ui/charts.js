// 本文や資料に入れるグラフ（棒・横棒・折れ線）。株価チャートと同じく、紙の上のカードに描き、
// 表示されると棒が伸び、線が引かれる。
//
// spec = {
//   kind: "bar" | "hbar" | "line",
//   title, unit,               見出しと単位
//   labels: string[],          項目（棒の下・折れ線の横軸）
//   series: [{ name, values }],  2系列まで。2系列なら凡例を出す。単位の違う量は、基準を1にそろえて渡す（二軸にしない）
//   valueLabels?: string[],    1系列のときの値の表示を差し替える（例：「該当なし」）
//   digits?: number,           値の小数桁
//   divider?: { after, label }, 棒グラフの区切り（例：監査法人の交代）
//   note?: string              下に添える一言
// }

import { el, svg } from "./dom.js";

const fmt = (v, digits = 0) => (v == null ? "" : Number(v).toLocaleString("ja-JP", { minimumFractionDigits: digits, maximumFractionDigits: digits }));

function legend(series) {
  if (series.length < 2) return null;
  return el("div", { class: "graph-legend" }, series.map((s, i) =>
    el("span", {}, [el("i", { class: `swatch s${i + 1}`, "aria-hidden": "true" }), s.name])));
}

function summary(spec) {
  return `${spec.title}。` + spec.series.map((s) =>
    `${s.name}：` + spec.labels.map((l, i) => `${l} ${fmt(s.values[i], spec.digits)}${spec.unit || ""}`).join("、")).join("。");
}

/** 縦の棒（項目ごとに系列を並べる） */
function bars(spec, delay) {
  const max = Math.max(...spec.series.flatMap((s) => s.values)) || 1;
  const single = spec.series.length === 1;
  const groups = spec.labels.map((label, i) => {
    const group = el("div", { class: "bar-group" }, [
      el("div", { class: "bar-cols" }, spec.series.map((s, k) => {
        const v = s.values[i];
        const text = single && spec.valueLabels ? spec.valueLabels[i] : `${fmt(v, spec.digits)}`;
        return el("div", { class: "bar-col" }, [
          el("span", { class: "bar-value" }, text),
          el("span", {
            class: `bar s${k + 1}`,
            style: `height:${(v / max) * 100}%;animation-delay:${delay + 0.25 + i * 0.12 + k * 0.06}s`,
          }),
        ]);
      })),
      el("div", { class: "bar-label" }, label),
    ]);
    return group;
  });
  if (spec.divider) {
    groups.splice(spec.divider.after + 1, 0, el("div", { class: "bar-divider" }, el("span", {}, spec.divider.label)));
  }
  return el("div", { class: "bars" }, groups);
}

/** 横の棒（項目名が長いとき） */
function hbars(spec, delay) {
  const s = spec.series[0];
  const max = Math.max(...s.values) || 1;
  return el("div", { class: "hbars" }, spec.labels.map((label, i) => {
    const v = s.values[i];
    return el("div", { class: "hbar-row" }, [
      el("span", { class: "hbar-label" }, label),
      el("span", { class: "hbar-track" }, el("span", {
        class: "hbar s1",
        style: `width:${(v / max) * 100}%;animation-delay:${delay + 0.25 + i * 0.12}s`,
      })),
      el("span", { class: "hbar-value" }, spec.valueLabels ? spec.valueLabels[i] : `${fmt(v, spec.digits)}${spec.unit || ""}`),
    ]);
  }));
}

/** 折れ線（同じ単位、または基準を1にそろえた値） */
function lines(spec, delay) {
  const W = 300;
  const H = 156;
  const PAD_X = 22;
  const PAD_R = 50; // 線の右端に値を直接書く余白
  const PAD_Y = 12;
  const AXIS = 22; // 横軸の項目名の高さ
  const all = spec.series.flatMap((s) => s.values);
  const lo = Math.min(0, ...all);
  const hi = Math.max(...all);
  const n = spec.labels.length;
  const x = (i) => PAD_X + (i / (n - 1)) * (W - PAD_X - PAD_R);
  const y = (v) => H - AXIS - ((v - lo) / (hi - lo || 1)) * (H - AXIS - PAD_Y);

  const marks = spec.series.flatMap((s, k) => {
    const d = s.values.map((v, i) => `${i ? "L" : "M"} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
    const last = s.values[n - 1];
    return [
      svg("path", { class: `graph-line s${k + 1}`, d, pathLength: "1", style: `animation-delay:${delay + 0.25 + k * 0.2}s` }),
      ...s.values.map((v, i) => svg("circle", {
        class: `graph-dot s${k + 1}`, cx: x(i), cy: y(v), r: 4,
        style: `animation-delay:${delay + 0.4 + k * 0.2 + (i / n) * 1.1}s`,
      })),
      svg("text", { class: "graph-end", x: x(n - 1) + 9, y: y(last) + 4 }, `${fmt(last, spec.digits)}${spec.unit || ""}`),
    ];
  });

  const base = spec.baseline != null
    ? [svg("line", { class: "graph-base", x1: PAD_X, x2: W - PAD_R, y1: y(spec.baseline), y2: y(spec.baseline) })]
    : [];

  // 横軸の項目名は、点の真下に置く
  const xlabels = spec.labels.map((l, i) => svg("text", { class: "graph-xlabel", x: x(i), y: H - 4, "text-anchor": "middle" }, l));

  return el("div", { class: "graph-plot" }, [
    svg("svg", { class: "graph-svg", viewBox: `0 0 ${W} ${H}`, "aria-hidden": "true" }, [
      svg("line", { class: "graph-axis", x1: PAD_X - 10, x2: W - PAD_R + 10, y1: H - AXIS, y2: H - AXIS }),
      ...base,
      ...marks,
      ...xlabels,
    ]),
  ]);
}

const KINDS = { bar: bars, hbar: hbars, line: lines };

/** @param {number} delay 表示を始めるまでの秒数 */
export function graph(spec, delay = 0) {
  const draw = KINDS[spec.kind];
  if (!draw) throw new Error(`グラフの種類 "${spec.kind}" はありません`);
  return el("figure", { class: `graph graph-${spec.kind} reveal`, style: `animation-delay:${delay}s`, role: "img", "aria-label": summary(spec) }, [
    el("div", { class: "graph-head" }, [
      el("span", { class: "graph-title" }, spec.title),
      spec.unit && spec.kind !== "line" && el("span", { class: "graph-unit" }, `単位：${spec.unit}`),
    ]),
    legend(spec.series),
    draw(spec, delay),
    spec.note && el("div", { class: "graph-note" }, spec.note),
  ]);
}

export const GRAPH_KINDS = Object.keys(KINDS);
